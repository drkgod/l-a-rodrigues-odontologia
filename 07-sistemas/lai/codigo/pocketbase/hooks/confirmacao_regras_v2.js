// Task f79847a5 — rev.4: mover não respondentes em ARQUIVO NOVO (pod fresco garantido;
// o pod não recarregava o hook antigo). Rota -v2 chamada pelo serviço moverNaoRespondentes.
// RN-04 — mover não respondentes para a lista de ligação (com cobertura por turno).
routerAdd(
  'POST',
  '/backend/v1/confirmacao/mover-nao-respondentes-v2',
  (e) => {
    const body = e.requestInfo().body || {}
    const dataAlvo = String(body.data || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAlvo))
      throw new BadRequestError('Informe a data da lista (AAAA-MM-DD).', null)

    const contatos = $app.findRecordsByFilter(
      'contatos_confirmacao',
      'estado = "mensagem_enviada" || estado = "sem_resposta" || estado = "em_lista_ligacao"',
      '',
      500,
      0,
    )
    let movidos = 0
    const semCobertura = []
    for (const c of contatos) {
      let item
      try {
        item = $app.findRecordById('agenda_itens', c.getString('agenda_item'))
      } catch (_) {
        continue
      }
      if (item.getString('data') !== dataAlvo) continue
      if (item.getBool('cancelado') === true || item.getBool('excluido') === true) continue

      // Responsável = cobertura de ligação do turno (config_turno_ligacao) ou "a definir" + alerta.
      const inicio = item.getString('inicio')
      const turno = inicio < '12:00' ? 'manha' : 'tarde'
      let responsavel = ''
      try {
        const cfg = $app.findFirstRecordByFilter('config_turno_ligacao', 'turno = "' + turno + '"')
        responsavel = cfg.getString('responsavel')
      } catch (_) {
        responsavel = ''
      }
      if (!responsavel) {
        responsavel = 'a definir'
        if (semCobertura.indexOf(turno) < 0) semCobertura.push(turno)
      }
      c.set('estado', 'em_lista_ligacao')
      c.set('responsavel', responsavel)
      c.set('turno', turno)
      c.set('atualizado_por', e.auth ? String(e.auth.getString('email') || '') : '')
      c.set('atualizado_em', new Date().toISOString())
      c.set('versao_contato', c.getInt('versao_contato') + 1)
      $app.save(c)
      movidos++
    }
    return e.json(200, {
      situacao: 'ok',
      movidos: movidos,
      cobertura_a_definir: semCobertura,
      alerta_gestao:
        semCobertura.length > 0
          ? 'Turno(s) sem cobertura de ligação cadastrada: ' + semCobertura.join(', ')
          : '',
    })
  },
  $apis.requireAuth(),
)