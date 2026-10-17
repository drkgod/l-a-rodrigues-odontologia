// Task 35bff70c — ficha do paciente: eventos (append-only) e próxima ação NO SERVIDOR
// (SPEC-1-003, CA-1-16). A coleção eventos tem createRule null (só hook grava —
// append-only: nem gestão edita/apaga). A próxima ação grava no registro do paciente
// com autor derivado da SESSÃO (nunca do payload). Papel exigido: gestão ou CRC
// (mesma escrita de leads/fichas da matriz da SPEC-1-001). Toda lógica INLINE no
// callback (lição JSVM: função top-level não carrega no pod).
// DEBUG 1 (teste humano 17/10): evento grava TAMBÉM paciente_rel/lead_rel (relações
// da migration 0010) — o filtro de leitura usa as relações; texto puro não casa.
// DEBUG 1: rota limpar-massa-teste (gestão) — eventos é append-only até pra gestão,
// então a limpeza da massa de teste das provas é do SERVIDOR.
routerAdd(
  'POST',
  '/backend/v1/ficha/evento',
  (e) => {
    const body = e.requestInfo().body || {}
    const pacienteId = String(body.paciente || '').trim()
    const leadId = String(body.lead || '').trim()
    const tipo = String(body.tipo || '').trim()
    const descricao = String(body.descricao || '').trim()
    const teste = body.teste === true

    const TIPOS = [
      'contato',
      'resultado_contato',
      'mudanca_etapa',
      'nota',
      'combinado_avaliacao',
      'falta',
      'chegada',
      'liberacao',
      'oferta',
      'importacao',
    ]
    if (TIPOS.indexOf(tipo) < 0) throw new BadRequestError('Tipo de evento inválido.', null)
    if (!descricao) throw new BadRequestError('Descreva o evento.', null)
    if (!pacienteId && !leadId) {
      throw new BadRequestError('Informe o paciente ou o lead do evento.', null)
    }

    // papel: gestão ou CRC (escrita de ficha) — recepção lê, não grava
    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    const podeGravar =
      papel === 'gestao' ||
      papel === 'crc_agendamento' ||
      papel === 'crc_confirmacao' ||
      papel === 'crc_comercial'
    if (!podeGravar) {
      throw new ForbiddenError('Seu perfil não pode registrar eventos na ficha.', null)
    }

    let paciente = null
    if (pacienteId) {
      try {
        paciente = $app.findRecordById('pacientes', pacienteId)
      } catch (_) {
        paciente = null
      }
      if (!paciente) throw new BadRequestError('Paciente não encontrado.', null)
    }
    let lead = null
    if (leadId) {
      try {
        lead = $app.findRecordById('leads', leadId)
      } catch (_) {
        lead = null
      }
      if (!lead) throw new BadRequestError('Lead não encontrado.', null)
    }

    const colEv = $app.findCollectionByNameOrId('eventos')
    const ev = new Record(colEv)
    if (paciente) {
      ev.set('paciente', paciente.id)
      ev.set('paciente_rel', paciente.id)
    }
    if (lead) {
      ev.set('lead', lead.id)
      ev.set('lead_rel', lead.id)
    }
    ev.set('tipo', tipo)
    ev.set('descricao', descricao)
    ev.set(
      'autor',
      e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
    )
    ev.set('teste', teste)
    $app.save(ev)

    return e.json(200, { ok: true, evento_id: ev.id, tipo: tipo })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/ficha/proxima-acao',
  (e) => {
    const body = e.requestInfo().body || {}
    const pacienteId = String(body.paciente || '').trim()
    const acao = String(body.proxima_acao || '').trim()
    const prazo = String(body.proxima_acao_prazo || '').trim()
    const respAcao = String(body.proxima_acao_responsavel || '').trim()

    if (!pacienteId) throw new BadRequestError('Informe o paciente.', null)
    if (!acao) throw new BadRequestError('Descreva a próxima ação.', null)
    if (prazo && !/^\d{4}-\d{2}-\d{2}/.test(prazo)) {
      throw new BadRequestError('Prazo inválido — use uma data.', null)
    }

    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    const podeGravar =
      papel === 'gestao' ||
      papel === 'crc_agendamento' ||
      papel === 'crc_confirmacao' ||
      papel === 'crc_comercial'
    if (!podeGravar) {
      throw new ForbiddenError('Seu perfil não pode editar a próxima ação.', null)
    }

    let paciente = null
    try {
      paciente = $app.findRecordById('pacientes', pacienteId)
    } catch (_) {
      paciente = null
    }
    if (!paciente) throw new BadRequestError('Paciente não encontrado.', null)

    const autor = e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : ''
    paciente.set('proxima_acao', acao)
    paciente.set('proxima_acao_prazo', prazo)
    paciente.set('proxima_acao_responsavel', respAcao)
    paciente.set('responsavel', autor)
    $app.save(paciente)

    // evento append-only da mudança (histórico completo)
    const colEv = $app.findCollectionByNameOrId('eventos')
    const ev = new Record(colEv)
    ev.set('paciente', paciente.id)
    ev.set('paciente_rel', paciente.id)
    ev.set('tipo', 'nota')
    ev.set(
      'descricao',
      'Próxima ação definida: ' + acao + (prazo ? ' (prazo ' + prazo.slice(0, 10) + ')' : ''),
    )
    ev.set('autor', autor)
    ev.set('teste', paciente.getBool('teste'))
    $app.save(ev)

    return e.json(200, { ok: true, paciente_id: paciente.id })
  },
  $apis.requireAuth(),
)

// Limpeza da massa de teste (provas P3-09a/b): apaga pacientes+eventos teste=true.
// eventos tem deleteRule null (append-only) — a limpeza é do SERVIDOR, nunca do cliente.
routerAdd(
  'POST',
  '/backend/v1/ficha/limpar-massa-teste',
  (e) => {
    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    if (papel !== 'gestao') {
      throw new ForbiddenError('Somente gestão pode limpar massa de teste.', null)
    }
    let pacientesApagados = 0
    let eventosApagados = 0
    const pacientes = $app.findRecordsByFilter('pacientes', 'teste = true', '', 0, 0)
    for (const p of pacientes) {
      $app.delete(p)
      pacientesApagados++
    }
    const eventos = $app.findRecordsByFilter('eventos', 'teste = true', '', 0, 0)
    for (const ev of eventos) {
      $app.delete(ev)
      eventosApagados++
    }
    return e.json(200, { ok: true, pacientes: pacientesApagados, eventos: eventosApagados })
  },
  $apis.requireAuth(),
)

// Cria ficha direta de paciente (SPEC-1-003: "cadastrar/localizar a ficha").
// Papel gestão/CRC; telefone duplicado devolve aviso (RN-03) sem criar.
routerAdd(
  'POST',
  '/backend/v1/ficha/criar',
  (e) => {
    const body = e.requestInfo().body || {}
    const nome = String(body.nome || '').trim()
    let telefone = String(body.telefone || '').trim()
    const confirmar = body.confirmar_duplicado === true

    if (!nome) throw new BadRequestError('Informe o nome do paciente.', null)
    const digitos = telefone.replace(/\D/g, '')
    if (digitos.length < 10) {
      throw new BadRequestError('Telefone inválido — informe DDD + número.', null)
    }
    telefone = '+' + digitos

    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    const pode =
      papel === 'gestao' ||
      papel === 'crc_agendamento' ||
      papel === 'crc_confirmacao' ||
      papel === 'crc_comercial'
    if (!pode) {
      throw new ForbiddenError('Seu perfil não pode criar ficha.', null)
    }

    if (!confirmar) {
      try {
        const dup = $app.findRecordsByFilter('pacientes', 'telefone = "' + telefone + '"', '', 1, 0)
        if (dup.length > 0) {
          return e.json(200, {
            criado: false,
            aviso_duplicado: true,
            mensagem: 'Telefone já cadastrado em outra ficha. Confirme se quer criar outra.',
          })
        }
      } catch (_) {}
    }

    const col = $app.findCollectionByNameOrId('pacientes')
    const p = new Record(col)
    p.set('nome', nome)
    p.set('telefone', telefone)
    p.set(
      'responsavel',
      e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
    )
    p.set('teste', body.teste === true)
    $app.save(p)

    try {
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('paciente', p.id)
      ev.set('paciente_rel', p.id)
      ev.set('tipo', 'nota')
      ev.set('descricao', 'Ficha criada')
      ev.set(
        'autor',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      ev.set('teste', body.teste === true)
      $app.save(ev)
    } catch (_) {}

    return e.json(200, { criado: true, paciente_id: p.id })
  },
  $apis.requireAuth(),
)
