// Task f79847a5 — conciliação das liberações com a leitura da agenda (SPEC-1-004, CA-1-22).
// POST /backend/v1/liberacoes/conciliar
// Regra: vaga só aparece LIBERADA após desmarcação/exclusão COMPROVADA na leitura
// (cancelado=true ou excluido=true no agenda_item). Consulta ainda marcada mantém
// "decidida" com pendência visível. Item ausente na leitura (ausente_na_ultima_leitura
// ou não encontrado) = leitura parcial → mantém ocupado/incerto, NUNCA libera.
// Idempotente: liberada não reprocessa. Sem runInTransaction (padrão JSVM do projeto).
routerAdd(
  'POST',
  '/backend/v1/liberacoes/conciliar',
  (e) => {
    const body = e.requestInfo().body || {}
    const teste = body.teste === true

    const libs = $app.findRecordsByFilter('liberacoes', 'situacao = "decidida"', '-created', 200, 0)
    let liberadas = 0
    let mantidas = 0
    let incertas = 0
    const detalhes = []

    for (const lib of libs) {
      const itemId = lib.getString('agenda_item')
      let item = null
      try {
        item = $app.findRecordById('agenda_itens', itemId)
      } catch (_) {
        item = null
      }

      // Item não encontrado (relação quebrada ou leitura que não o cobriu):
      // incerto — nunca libera.
      if (!item) {
        incertas++
        lib.set('situacao', 'decidida')
        lib.set('pendencia', 'Leitura parcial da agenda — conferir no Clinicorp antes de liberar.')
        lib.set('teste', teste || lib.getBool('teste'))
        $app.save(lib)
        detalhes.push({ liberacao_id: lib.id, resultado: 'incerto' })
        continue
      }

      // Item AUSENTE na última leitura (leitura parcial): ocupado/incerto — nunca libera.
      if (item.getBool('ausente_na_ultima_leitura') === true) {
        incertas++
        lib.set('situacao', 'decidida')
        lib.set('pendencia', 'Leitura parcial da agenda — conferir no Clinicorp antes de liberar.')
        lib.set('teste', teste || lib.getBool('teste'))
        $app.save(lib)
        detalhes.push({ liberacao_id: lib.id, resultado: 'incerto' })
        continue
      }

      // Desmarcação COMPROVADA na leitura: cancelado ou excluído explicitamente.
      if (item.getBool('cancelado') === true || item.getBool('excluido') === true) {
        liberadas++
        lib.set('situacao', 'liberada')
        lib.set(
          'evidencia_desmarcacao',
          'Cancelamento comprovado na leitura da agenda em ' + new Date().toISOString(),
        )
        lib.set('pendencia', '')
        lib.set('teste', teste || lib.getBool('teste'))
        $app.save(lib)
        detalhes.push({ liberacao_id: lib.id, resultado: 'liberada' })
        continue
      }

      // Consulta ainda marcada: mantém decidida com pendência visível.
      mantidas++
      lib.set('situacao', 'decidida')
      lib.set(
        'pendencia',
        'Desmarcar a consulta no Clinicorp — a vaga segue ocupada até a desmarcação.',
      )
      lib.set('teste', teste || lib.getBool('teste'))
      $app.save(lib)
      detalhes.push({ liberacao_id: lib.id, resultado: 'mantida' })
    }

    return e.json(200, {
      situacao: 'ok',
      analisadas: libs.length,
      liberadas: liberadas,
      mantidas: mantidas,
      incertas: incertas,
      detalhes: detalhes,
    })
  },
  $apis.requireAuth(),
)
