// Task a9f9e30e — rotas das regras de confirmação e liberação (SPEC-1-004).
// Gates no SERVIDOR: CA-1-20 (liberação por silêncio: 3 mensagens enviadas + 1
// ligação sem sucesso no dia anterior + sem confirmação + corte 17h local) e
// CA-1-21 (capacidade: avaliação 2/horário 30min; ordem de chegada por turno sob
// política ATIVA; sem política = "regra da agenda não validada", nunca ilimitado).
// Padrões JSVM: tudo inline por handler (nada de função top-level usada em
// callback); data zerada '0001-' nunca usada; sem runInTransaction.
routerAdd(
  'POST',
  '/backend/v1/confirmacao/registrar-mensagem',
  (e) => {
    const body = e.requestInfo().body || {}
    const contatoId = String(body.contato || '')
    const resultado = String(body.resultado || 'enviada')
    const tentativa = Number(body.tentativa || 0)
    const enviadaEm = String(body.enviada_em || new Date().toISOString())
    const loteOrigem = String(body.lote_origem || '')
    const canal = String(body.canal || 'robo')
    const teste = body.teste === true

    if (!contatoId) throw new BadRequestError('Informe o contato.', null)
    if (resultado !== 'enviada' && resultado !== 'falhou')
      throw new BadRequestError('Resultado deve ser "enviada" ou "falhou".', null)
    if (!tentativa || tentativa < 1 || tentativa > 3)
      throw new BadRequestError('Tentativa deve ser 1, 2 ou 3.', null)

    let contato
    try {
      contato = $app.findRecordById('contatos_confirmacao', contatoId)
    } catch (_) {
      throw new BadRequestError('Contato não encontrado.', null)
    }

    // Chave única idempotente: contato+tentativa+dia civil (retry não duplica).
    const diaCivil = enviadaEm.slice(0, 10)
    const chave = contatoId + '|msg|' + tentativa + '|' + diaCivil
    const existentes = $app.findRecordsByFilter(
      'mensagens_confirmacao',
      'chave_evento = "' + chave + '"',
      '',
      1,
      0,
    )
    if (existentes.length > 0) {
      return e.json(200, { situacao: 'ja_registrada', id: existentes[0].id, chave: chave })
    }

    const col = $app.findCollectionByNameOrId('mensagens_confirmacao')
    const registro = new Record(col)
    registro.set('contato', contatoId)
    registro.set('tentativa', tentativa)
    registro.set('chave_evento', chave)
    registro.set('enviada_em', enviadaEm)
    registro.set('registrada_por', e.auth ? String(e.auth.getString('email') || '') : '')
    registro.set('canal', canal === 'manual' ? 'manual' : 'robo')
    registro.set('resultado', resultado)
    registro.set('lote_origem', loteOrigem)
    registro.set('teste', teste)
    $app.save(registro)

    // Mensagem enviada move contato de "pendente" para "mensagem_enviada"
    // (só se ainda não respondeu — resposta interrompe a régua).
    if (resultado === 'enviada') {
      const estadoAtual = contato.getString('estado')
      if (estadoAtual === 'pendente') {
        contato.set('estado', 'mensagem_enviada')
        contato.set('atualizado_por', e.auth ? String(e.auth.getString('email') || '') : '')
        contato.set('atualizado_em', new Date().toISOString())
        contato.set('versao_contato', contato.getInt('versao_contato') + 1)
        $app.save(contato)
      }
    }
    return e.json(200, { situacao: 'ok', id: registro.id, chave: chave })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/ligacao/registrar',
  (e) => {
    const body = e.requestInfo().body || {}
    const contatoId = String(body.contato || '')
    const resultado = String(body.resultado || '')
    const feitaEm = String(body.feita_em || new Date().toISOString())
    const teste = body.teste === true

    if (!contatoId) throw new BadRequestError('Informe o contato.', null)
    const validos = ['confirmou', 'pediu_remarcacao', 'cancelou', 'nao_atendeu', 'numero_invalido']
    if (validos.indexOf(resultado) < 0)
      throw new BadRequestError(
        'Resultado deve ser confirmou, pediu_remarcacao, cancelou, nao_atendeu ou numero_invalido.',
        null,
      )

    let contato
    try {
      contato = $app.findRecordById('contatos_confirmacao', contatoId)
    } catch (_) {
      throw new BadRequestError('Contato não encontrado.', null)
    }

    const diaCivil = feitaEm.slice(0, 10)
    const chave = contatoId + '|lig|' + diaCivil + '|' + resultado + '|' + feitaEm.slice(11, 16)
    const existentes = $app.findRecordsByFilter(
      'ligacoes',
      'chave_evento = "' + chave + '"',
      '',
      1,
      0,
    )
    if (existentes.length > 0) {
      return e.json(200, { situacao: 'ja_registrada', id: existentes[0].id, chave: chave })
    }

    const col = $app.findCollectionByNameOrId('ligacoes')
    const registro = new Record(col)
    registro.set('contato', contatoId)
    registro.set('resultado', resultado)
    registro.set('crc', e.auth ? String(e.auth.getString('email') || '') : '')
    registro.set('feita_em', feitaEm)
    registro.set('chave_evento', chave)
    registro.set('teste', teste)
    $app.save(registro)

    // Ligação atualiza o estado do contato (consulta continua agendada — CA-1-19).
    let novoEstado = ''
    if (resultado === 'confirmou') novoEstado = 'confirmou'
    else if (resultado === 'pediu_remarcacao') novoEstado = 'pediu_remarcacao'
    else if (resultado === 'cancelou') novoEstado = 'cancelou'
    else if (resultado === 'nao_atendeu') novoEstado = 'ligacao_sem_sucesso'
    if (novoEstado !== '') {
      contato.set('estado', novoEstado)
      contato.set('atualizado_por', e.auth ? String(e.auth.getString('email') || '') : '')
      contato.set('atualizado_em', new Date().toISOString())
      contato.set('versao_contato', contato.getInt('versao_contato') + 1)
      $app.save(contato)
    }
    return e.json(200, { situacao: 'ok', id: registro.id, chave: chave, estado: novoEstado })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/confirmacao/registrar',
  (e) => {
    const body = e.requestInfo().body || {}
    const contatoId = String(body.contato || '')
    const resposta = String(body.resposta || '')
    const teste = body.teste === true

    if (!contatoId) throw new BadRequestError('Informe o contato.', null)
    const validos = ['confirmou', 'pediu_remarcacao', 'cancelou', 'sem_resposta']
    if (validos.indexOf(resposta) < 0)
      throw new BadRequestError(
        'Resposta deve ser confirmou, pediu_remarcacao, cancelou ou sem_resposta.',
        null,
      )

    let contato
    try {
      contato = $app.findRecordById('contatos_confirmacao', contatoId)
    } catch (_) {
      throw new BadRequestError('Contato não encontrado.', null)
    }

    contato.set('estado', resposta)
    contato.set('atualizado_por', e.auth ? String(e.auth.getString('email') || '') : '')
    contato.set('atualizado_em', new Date().toISOString())
    contato.set('versao_contato', contato.getInt('versao_contato') + 1)
    contato.set('teste', teste || contato.getBool('teste'))
    $app.save(contato)
    return e.json(200, {
      situacao: 'ok',
      estado: resposta,
      versao_contato: contato.getInt('versao_contato'),
    })
  },
  $apis.requireAuth(),
)

// RN-04 — mover não respondentes para a lista de ligação (com cobertura por turno).
routerAdd(
  'POST',
  '/backend/v1/confirmacao/mover-nao-respondentes',
  (e) => {
    const body = e.requestInfo().body || {}
    const dataAlvo = String(body.data || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAlvo))
      throw new BadRequestError('Informe a data da lista (AAAA-MM-DD).', null)

    const contatos = $app.findRecordsByFilter(
      'contatos_confirmacao',
      'estado = "mensagem_enviada"',
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

      // Responsável = cobertura de ligação do turno (configTurno) ou "a definir" + alerta.
      const inicio = item.getString('inicio')
      const turno = inicio < '12:00' ? 'manha' : 'tarde'
      let responsavel = ''
      try {
        const cfg = $app.findFirstRecordByFilter('config_turno_ligacao', 'turno', turno)
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

// CA-1-21 — verificar capacidade de um horário/turno antes de planejar/ofertar.
routerAdd(
  'POST',
  '/backend/v1/capacidade/verificar',
  (e) => {
    const body = e.requestInfo().body || {}
    const data = String(body.data || '')
    const hora = String(body.hora || '')
    const profissionalId = String(body.profissional || '')
    const tipo = String(body.tipo || '')

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new BadRequestError('Data inválida.', null)
    if (!/^\d{2}:\d{2}$/.test(hora)) throw new BadRequestError('Hora inválida (HH:MM).', null)
    if (['avaliacao', 'horario_marcado', 'ordem_chegada'].indexOf(tipo) < 0)
      throw new BadRequestError('Tipo deve ser avaliacao, horario_marcado ou ordem_chegada.', null)

    let prof
    try {
      prof = $app.findRecordById('profissionais', profissionalId)
    } catch (_) {
      throw new BadRequestError('Profissional não encontrado.', null)
    }
    const nomeProf = prof.getString('nome')

    const partes = data.split('-')
    const dataUtc = new Date(partes[0] + '-' + partes[1] + '-' + partes[2] + 'T12:00:00Z')
    const dia = dataUtc.getUTCDay()

    // Consultas do dia não canceladas (visitas únicas — dois registros da mesma
    // visita não consomem dois lugares: namespace única por clinicorp_id)
    const itens = $app.findRecordsByFilter(
      'agenda_itens',
      'data = "' + data + '" && cancelado != true && excluido != true',
      '',
      2000,
      0,
    )
    const doProf = []
    for (const it of itens) {
      if (it.getString('profissional') !== profissionalId) continue
      doProf.push(it)
    }

    // Política ATIVA com vínculo exato (unidade+profissional+dia+tipo) — inline.
    // RN-09: horario_marcado tem REGRA GERAL (sem sobreposição); avaliação tem
    // parâmetro global (2/30min, CL-004); ordem_chegada EXIGE política ativa —
    // política específica aprovada prevalece onde existir; pendente nunca aplica.
    let unidadeConfig = 'UNIDADE-DEMO'
    try {
      const cfgU = $app.findFirstRecordByFilter('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
      if (cfgU) unidadeConfig = cfgU.getString('nome_unidade')
    } catch (_) {}
    const todas = $app.findRecordsByFilter(
      'politicas_agenda',
      'situacao = "ativa" && tipo = "' + tipo + '"',
      '',
      200,
      0,
    )
    let politica = null
    for (const p2 of todas) {
      if (p2.getInt('dia_semana') !== dia) continue
      const pUnidade = String(p2.getString('unidade') || '')
      if (pUnidade && pUnidade !== unidadeConfig) continue
      const pProf = p2.getString('profissional')
      if (pProf && pProf !== profissionalId) continue
      const pNome = String(p2.getString('profissional_nome') || '').toLowerCase()
      if (pNome && nomeProf && pNome !== String(nomeProf).toLowerCase()) continue
      if (!pProf && !pNome) continue // política sem vínculo não é aplicável
      politica = p2
      break
    }

    if (tipo === 'ordem_chegada' && !politica) {
      return e.json(200, {
        situacao: 'regra_nao_validada',
        mensagem: 'Regra da agenda não validada — política ativa não encontrada.',
        permitido: false,
      })
    }

    const escopo = politica ? politica.getString('escopo_limite') : 'individual'
    const turnoInicio = politica ? politica.getString('turno_inicio') : ''
    const turnoFim = politica ? politica.getString('turno_fim') : ''

    if (tipo === 'avaliacao') {
      // limite por horário (política específica ou config: 2 por padrão)
      let cfgLimite = 2
      let cfgDuracao = 30
      try {
        const cfg = $app.findFirstRecordByFilter('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
        if (cfg) {
          cfgLimite = cfg.getInt('limite_sobreposicao_avaliacao') || 2
          cfgDuracao = cfg.getInt('duracao_avaliacao_minutos') || 30
        }
      } catch (_) {}
      const limitePolitica = politica ? politica.getInt('limite_por_horario') : 0
      const limite = limitePolitica || cfgLimite
      const mesmoHorario = doProf.filter((it) => it.getString('inicio') === hora)
      if (mesmoHorario.length >= limite) {
        return e.json(200, {
          situacao: 'bloqueado',
          motivo: 'Limite de ' + limite + ' avaliações por horário já atingido.',
          permitido: false,
          ocupacoes: mesmoHorario.length,
          limite: limite,
        })
      }
      return e.json(200, {
        situacao: 'permitido',
        permitido: true,
        ocupacoes: mesmoHorario.length,
        limite: limite,
        duracao_minutos: cfgDuracao,
      })
    }

    if (tipo === 'ordem_chegada') {
      // visitas únicas por turno [inicio,fim); sem fim = "até terminar os pacientes"
      const noTurno = doProf.filter((it) => {
        const h = it.getString('inicio')
        if (turnoFim) return h >= turnoInicio && h < turnoFim
        return h >= turnoInicio
      })
      let ocupacoes = noTurno.length
      if (escopo === 'grupo') {
        const idsGrupo = String(politica.getString('grupo_profissionais_ids') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        for (const it of itens) {
          if (idsGrupo.indexOf(it.getString('profissional')) < 0) continue
          if (doProf.indexOf(it) >= 0) continue
          const h = it.getString('inicio')
          if (turnoFim ? h >= turnoInicio && h < turnoFim : h >= turnoInicio) ocupacoes++
        }
      }
      const limite = politica.getInt('limite_por_turno')
      if (limite && ocupacoes >= limite) {
        return e.json(200, {
          situacao: 'bloqueado',
          motivo: 'Limite de ' + limite + ' pacientes por turno já atingido.',
          permitido: false,
          ocupacoes: ocupacoes,
          limite: limite,
        })
      }
      return e.json(200, {
        situacao: 'permitido',
        permitido: true,
        ocupacoes: ocupacoes,
        limite: limite || null,
      })
    }

    // tipo === 'horario_marcado': sem sobreposição na REGRA GERAL (RN-09)
    const sobrepostos = doProf.filter((it) => {
      const ini = it.getString('inicio')
      const fim = it.getString('fim')
      return ini < hora && fim > hora
    })
    if (sobrepostos.length > 0) {
      return e.json(200, {
        situacao: 'bloqueado',
        motivo: 'Já existe consulta em horário sobreposto deste profissional.',
        permitido: false,
        ocupacoes: sobrepostos.length,
      })
    }
    return e.json(200, { situacao: 'permitido', permitido: true, ocupacoes: 0 })
  },
  $apis.requireAuth(),
)

// CA-1-20 — decisão de liberação. O gate completo roda no SERVIDOR.
routerAdd(
  'POST',
  '/backend/v1/liberacao/decidir',
  (e) => {
    const body = e.requestInfo().body || {}
    const agendaItemId = String(body.agenda_item || '')
    const motivo = String(body.motivo || '')
    const teste = body.teste === true
    const agoraFixo = String(body.agora || '') // clock de fixture: SÓ com teste=true

    if (!agendaItemId) throw new BadRequestError('Informe o item da agenda.', null)
    if (['cancelamento', 'remarcacao', 'ligacao_sem_sucesso'].indexOf(motivo) < 0)
      throw new BadRequestError(
        'Motivo deve ser cancelamento, remarcacao ou ligacao_sem_sucesso.',
        null,
      )
    if (agoraFixo && !teste)
      throw new BadRequestError(
        'Relógio de fixture só é aceito em execução marcada como teste.',
        null,
      )

    let item
    try {
      item = $app.findRecordById('agenda_itens', agendaItemId)
    } catch (_) {
      throw new BadRequestError('Item da agenda não encontrado.', null)
    }
    if (item.getBool('cancelado') === true || item.getBool('excluido') === true)
      throw new BadRequestError('Consulta já cancelada/excluída na central.', null)

    // Liberação já decidida não repete (idempotência)
    const jaDecididas = $app.findRecordsByFilter(
      'liberacoes',
      'agenda_item = "' + agendaItemId + '"',
      '',
      1,
      0,
    )
    if (jaDecididas.length > 0) {
      return e.json(200, {
        situacao: 'ja_decidida',
        liberacao_id: jaDecididas[0].id,
        estado_liberacao: jaDecididas[0].getString('situacao'),
      })
    }

    // Contato do item
    let contato = null
    const contatos = $app.findRecordsByFilter(
      'contatos_confirmacao',
      'agenda_item = "' + agendaItemId + '"',
      '',
      1,
      0,
    )
    if (contatos.length > 0) contato = contatos[0]

    // Cancelamento/remarcação explícitos são caminhos PRÓPRIOS: não exigem a régua
    // do silêncio, mas exigem a resposta registrada no contato (evidência).
    if (motivo === 'cancelamento' || motivo === 'remarcacao') {
      if (!contato)
        throw new BadRequestError(
          'Sem contato de confirmação para esta consulta — registre a resposta antes.',
          null,
        )
      const estado = contato.getString('estado')
      if (estado !== 'cancelou' && estado !== 'pediu_remarcacao')
        throw new BadRequestError(
          'Liberação por ' +
            motivo +
            ' exige resposta registrada do paciente (cancelou/pediu_remarcacao).',
          null,
        )
    }

    if (motivo === 'ligacao_sem_sucesso') {
      if (!contato)
        throw new BadRequestError('Sem contato de confirmação para esta consulta.', null)

      // (a) sem confirmação
      const estado = contato.getString('estado')
      if (estado === 'confirmou' || estado === 'pediu_remarcacao' || estado === 'cancelou')
        throw new BadRequestError('Paciente confirmou/respondeu — não libera por silêncio.', null)

      // (b) 3 mensagens EFETIVAMENTE enviadas (estado válido por tentativa)
      const msgs = $app.findRecordsByFilter(
        'mensagens_confirmacao',
        'contato = "' + contato.id + '" && resultado = "enviada"',
        '-created',
        200,
        0,
      )
      const porTentativa = {}
      for (const m of msgs) porTentativa[m.getInt('tentativa')] = true
      const enviadasDistintas = Object.keys(porTentativa).length
      if (enviadasDistintas < 3)
        throw new BadRequestError(
          'Regra não cumprida: precisa de 3 mensagens enviadas (tem ' + enviadasDistintas + ').',
          null,
        )

      // (c) 1 ligação SEM SUCESSO no DIA ANTERIOR à consulta
      const dataConsulta = item.getString('data')
      const p = dataConsulta.split('-')
      const dConsulta = new Date(p[0] + '-' + p[1] + '-' + p[2] + 'T12:00:00Z')
      dConsulta.setUTCDate(dConsulta.getUTCDate() - 1)
      const diaAnterior = dConsulta.toISOString().slice(0, 10)
      const ligs = $app.findRecordsByFilter(
        'ligacoes',
        'contato = "' + contato.id + '" && resultado = "nao_atendeu"',
        '-created',
        100,
        0,
      )
      let ligacaoDiaAnterior = false
      for (const l of ligs) {
        const feitaEm = String(l.getString('feita_em') || '')
        if (feitaEm.slice(0, 10) === diaAnterior) ligacaoDiaAnterior = true
      }
      if (!ligacaoDiaAnterior)
        throw new BadRequestError(
          'Regra não cumprida: precisa de 1 ligação sem sucesso no dia anterior à consulta (' +
            diaAnterior +
            ').',
          null,
        )

      // (d) relógio do SERVIDOR ≥ corte (17h) do dia anterior — fuso America/Sao_Paulo
      let cfgCorte = 17
      try {
        const cfg = $app.findFirstRecordByFilter('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
        if (cfg) cfgCorte = cfg.getInt('corte_confirmacao_hora') || 17
      } catch (_) {}
      const agoraStr = teste && agoraFixo ? agoraFixo : new Date().toISOString()
      const offsetMin = -180 // America/Sao_Paulo (sem DST desde 2019)
      const agoraLocal = new Date(new Date(agoraStr).getTime() + offsetMin * 60000)
      const horaLocal = agoraLocal.getUTCHours()
      const minutoLocal = agoraLocal.getUTCMinutes()
      const diaLocal = agoraLocal.toISOString().slice(0, 10)
      if (diaLocal !== diaAnterior || horaLocal < cfgCorte)
        throw new BadRequestError(
          'Ainda não são ' +
            cfgCorte +
            'h do dia anterior (' +
            diaLocal +
            ' ' +
            horaLocal +
            ':' +
            (minutoLocal < 10 ? '0' + minutoLocal : minutoLocal) +
            ' local). Liberação bloqueada até o corte.',
          null,
        )
      // Consulta de qualquer hora do dia-alvo tem o MESMO corte (17h do dia anterior).
    }

    // Grava a decisão
    const colLib = $app.findCollectionByNameOrId('liberacoes')
    const liberacao = new Record(colLib)
    liberacao.set('agenda_item', agendaItemId)
    liberacao.set('motivo', motivo)
    liberacao.set('decidida_por', e.auth ? String(e.auth.getString('email') || '') : '')
    liberacao.set('decidida_em', new Date().toISOString())
    liberacao.set('situacao', 'decidida')
    liberacao.set('inicio', item.getString('inicio'))
    liberacao.set('fim', item.getString('fim'))
    liberacao.set('profissional', item.getString('profissional'))
    liberacao.set('tipo_agenda', item.getString('item_tipo'))
    liberacao.set('teste', teste)
    $app.save(liberacao)

    return e.json(200, {
      situacao: 'ok',
      liberacao_id: liberacao.id,
      estado: 'decidida',
      proximo_passo:
        'Desmarcar a consulta no Clinicorp e registrar a evidência (fase 4) — a vaga só aparece livre depois disso.',
    })
  },
  $apis.requireAuth(),
)

// Task 5bcfa6f1 — lista de confirmação do dia-alvo (RN-01, CA-1-18).
// Consultas do dia (não canceladas/excluídas, APPOINTMENT) ganham contato
// pendente se não tiverem (idempotente); lista volta em ordem de horário com
// telefone validado e mensagem montada do modelo (fallback SPEC: nome, telefone, mensagem).
routerAdd(
  'POST',
  '/backend/v1/confirmacao/lista-dia',
  (e) => {
    const body = e.requestInfo().body || {}
    const data = String(body.data || '').trim()
    const teste = body.teste === true
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new BadRequestError('Informe a data do dia-alvo (AAAA-MM-DD).', null)
    }

    // parâmetros da unidade (fallback da SPEC quando CL-009 não chegou)
    let limiteLinhas = 80
    let modeloMensagem = ''
    let formatoTelefone = ''
    try {
      const cfg = $app.findFirstRecordByFilter('config_unidade', 'nome_unidade != ""', '')
      if (cfg) {
        if (cfg.get('limite_linhas_robo')) limiteLinhas = cfg.getInt('limite_linhas_robo')
        modeloMensagem = String(cfg.getString('modelo_mensagem_confirmacao') || '')
        formatoTelefone = String(cfg.getString('formato_telefone_robo') || '')
      }
    } catch (_) {}

    // Consultas do dia-alvo: APPOINTMENT, não canceladas, não excluídas
    const itens = $app.findRecordsByFilter(
      'agenda_itens',
      'data = "' + data + '" && item_tipo = "APPOINTMENT" && cancelado != true && excluido != true',
      'inicio',
      500,
      0,
    )

    // Nomes dos profissionais (relação → nome)
    const nomesProf = {}
    const pros = $app.findRecordsByFilter('profissionais', 'id != ""', '', 200, 0)
    for (let i = 0; i < pros.length; i++) nomesProf[pros[i].id] = pros[i].getString('nome')

    // Contatos existentes do dia (um por agenda_item)
    const contatos = $app.findRecordsByFilter(
      'contatos_confirmacao',
      'teste = ' + (teste ? 'true' : 'false'),
      '',
      500,
      0,
    )
    const contatoPorItem = {}
    for (let i = 0; i < contatos.length; i++) {
      contatoPorItem[contatos[i].getString('agenda_item')] = contatos[i]
    }

    const col = $app.findCollectionByNameOrId('contatos_confirmacao')
    const criados = []
    const lista = []
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      let contato = contatoPorItem[item.id]
      if (!contato) {
        // RN-01: consulta do dia-alvo sem contato → contato pendente (idempotente)
        contato = new Record(col)
        contato.set('agenda_item', item.id)
        contato.set('estado', 'pendente')
        contato.set('responsavel', '')
        contato.set('turno', '')
        contato.set('versao_contato', 1)
        contato.set('teste', teste)
        $app.save(contato)
        criados.push(contato.id)
      }
      const telefone = String(item.getString('paciente_telefone') || '').replace(/\D/g, '')
      const telefoneOk = telefone.length >= 10 && telefone.length <= 13
      const nomeProf = nomesProf[item.getString('profissional')] || ''
      const mensagem = modeloMensagem
        .replace(/\{nome\}/g, item.getString('paciente_nome'))
        .replace(/\{data\}/g, data)
        .replace(/\{hora\}/g, item.getString('inicio'))
        .replace(/\{profissional\}/g, nomeProf)
      lista.push({
        contato_id: contato.id,
        agenda_item_id: item.id,
        paciente: item.getString('paciente_nome'),
        telefone: telefoneOk ? telefone : '',
        telefone_valido: telefoneOk,
        hora: item.getString('inicio'),
        dentista: nomeProf,
        estado: contato.getString('estado'),
        mensagem:
          mensagem ||
          'Olá ' +
            item.getString('paciente_nome') +
            '! Confirmando sua consulta no dia ' +
            data +
            ' às ' +
            item.getString('inicio') +
            (nomeProf ? ' com ' + nomeProf : '') +
            '. Até breve!',
        teste: teste || item.getInt('teste') !== 0,
      })
    }

    return e.json(200, {
      data: data,
      limite_linhas_robo: limiteLinhas,
      total: lista.length,
      contatos_criados: criados.length,
      lista: lista,
    })
  },
  $apis.requireAuth(),
)
