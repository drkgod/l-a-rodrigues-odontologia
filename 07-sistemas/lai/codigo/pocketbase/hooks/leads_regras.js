// Task 8d76cea5 — regras de leads NO SERVIDOR (SPEC-1-003, CA-1-12/13)
// RN-01: sem origem → desconhecida. RN-02: código casa EXATO em campanhas.codigo
// ATIVO, senão desconhecida + texto original guardado. RN-03: telefone duplicado
// devolve aviso SEM criar; cria só com confirmar_duplicado=true; nunca funde.
// Toda lógica INLINE no callback (lição JSVM: função top-level não carrega no pod).
routerAdd(
  'POST',
  '/backend/v1/leads/criar',
  (e) => {
    const body = e.requestInfo().body || {}
    const nome = String(body.nome || '').trim()
    let telefone = String(body.telefone || '').trim()
    const codigo = String(body.codigo_campanha || '').trim()
    const origemManualId = String(body.origem_manual || '').trim()
    const confirmar = body.confirmar_duplicado === true

    if (!nome) throw new BadRequestError('Informe o nome do lead.', null)
    const digitos = telefone.replace(/\D/g, '')
    if (digitos.length < 10) {
      throw new BadRequestError('Telefone inválido — informe DDD + número.', null)
    }
    telefone = '+' + digitos

    // RN-03 — duplicado: procura em leads e pacientes; devolve aviso SEM criar
    if (!confirmar) {
      let duplicadoEm = ''
      try {
        const noLeads = $app.findRecordsByFilter('leads', 'telefone = "' + telefone + '"', '', 1, 0)
        if (noLeads.length > 0) duplicadoEm = 'lead'
        if (!duplicadoEm) {
          const nosPacientes = $app.findRecordsByFilter(
            'pacientes',
            'telefone = "' + telefone + '"',
            '',
            1,
            0,
          )
          if (nosPacientes.length > 0) duplicadoEm = 'paciente'
        }
      } catch (_) {
        duplicadoEm = ''
      }
      if (duplicadoEm) {
        return e.json(200, {
          criado: false,
          aviso_duplicado: true,
          onde: duplicadoEm,
          mensagem:
            'Telefone já cadastrado (' + duplicadoEm + '). Confirme se quer criar outra ficha.',
        })
      }
    }

    // RN-01/02 — origem resolvida no servidor, nunca por suposição
    let origemTipo = 'desconhecida'
    let campanhaId = ''
    let aviso = ''
    if (codigo) {
      let camp = null
      try {
        const achados = $app.findRecordsByFilter(
          'campanhas',
          'codigo = "' + codigo.replace(/"/g, '') + '" && ativa = true',
          '',
          1,
          0,
        )
        camp = achados.length > 0 ? achados[0] : null
      } catch (_) {
        camp = null
      }
      if (camp) {
        origemTipo = 'campanha'
        campanhaId = camp.id
      } else {
        aviso = 'Código de campanha não encontrado — origem ficou desconhecida.'
      }
    } else if (origemManualId) {
      try {
        const om = $app.findRecordById('origens_manuais', origemManualId)
        if (om && om.getBool('ativa')) {
          origemTipo = 'manual'
        } else {
          aviso = 'Origem manual não encontrada ou inativa — origem ficou desconhecida.'
        }
      } catch (_) {
        aviso = 'Origem manual não encontrada — origem ficou desconhecida.'
      }
    }

    const colLeads = $app.findCollectionByNameOrId('leads')
    const lead = new Record(colLeads)
    lead.set('nome', nome)
    lead.set('telefone', telefone)
    lead.set('origem_tipo', origemTipo)
    if (campanhaId) lead.set('campanha', campanhaId)
    if (origemTipo === 'manual') lead.set('origem_manual', origemManualId)
    lead.set('origem_texto_original', codigo || String(body.origem_texto || '').trim())
    lead.set('id_app_crc', String(body.id_app_crc || '').trim())
    lead.set('etapa', 'novo')
    lead.set(
      'responsavel',
      e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
    )
    lead.set('teste', body.teste === true)
    $app.save(lead)

    // ficha única (SPEC-1-003): todo lead ganha ficha de paciente vinculada
    let pacienteId = ''
    try {
      const colPac = $app.findCollectionByNameOrId('pacientes')
      const pac = new Record(colPac)
      pac.set('nome', nome)
      pac.set('telefone', telefone)
      pac.set('lead', lead.id)
      pac.set(
        'responsavel',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      pac.set('teste', body.teste === true)
      $app.save(pac)
      pacienteId = pac.id
      lead.set('paciente', pacienteId)
      $app.save(lead)
    } catch (_) {}

    // evento append-only do cadastro
    try {
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('lead', lead.id)
      ev.set('lead_rel', lead.id)
      if (pacienteId) {
        ev.set('paciente', pacienteId)
        ev.set('paciente_rel', pacienteId)
      }
      ev.set('tipo', 'contato')
      ev.set(
        'descricao',
        'Lead cadastrado' +
          (origemTipo === 'campanha'
            ? ' com campanha ' + codigo
            : origemTipo === 'manual'
              ? ' com origem manual'
              : ' sem origem conhecida'),
      )
      ev.set(
        'autor',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      ev.set('teste', body.teste === true)
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      criado: true,
      lead_id: lead.id,
      origem_tipo: origemTipo,
      aviso: aviso,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/leads/etapa',
  (e) => {
    const body = e.requestInfo().body || {}
    const leadId = String(body.lead || '')
    const etapa = String(body.etapa || '').trim()
    const motivo = String(body.motivo_desqualificacao || '').trim()

    const ETAPAS = [
      'novo',
      'em_atendimento',
      'aguardando_retorno',
      'agendado',
      'confirmado',
      'compareceu',
      'faltou',
      'desqualificado',
    ]
    if (ETAPAS.indexOf(etapa) < 0) throw new BadRequestError('Etapa inválida.', null)
    if (etapa === 'desqualificado' && !motivo) {
      throw new BadRequestError('Desqualificar exige o motivo.', null)
    }

    let lead = null
    try {
      lead = $app.findRecordById('leads', leadId)
    } catch (_) {
      lead = null
    }
    if (!lead) throw new BadRequestError('Lead não encontrado.', null)

    const anterior = lead.getString('etapa')
    lead.set('etapa', etapa)
    if (etapa === 'desqualificado') lead.set('motivo_desqualificacao', motivo)
    $app.save(lead)

    try {
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('lead', lead.id)
      ev.set('lead_rel', lead.id)
      try {
        const pid = lead.getString('paciente') || ''
        if (pid) {
          ev.set('paciente', pid)
          ev.set('paciente_rel', pid)
        }
      } catch (_) {}
      ev.set('tipo', 'mudanca_etapa')
      ev.set(
        'descricao',
        'Etapa: ' +
          anterior +
          ' → ' +
          etapa +
          (etapa === 'desqualificado' ? ' (' + motivo + ')' : ''),
      )
      ev.set(
        'autor',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      ev.set('teste', lead.getBool('teste'))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, { ok: true, etapa: etapa, anterior: anterior })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/leads/importar-app-crc',
  (e) => {
    const body = e.requestInfo().body || {}
    const linhas = body.linhas
    if (!Array.isArray(linhas) || linhas.length === 0) {
      throw new BadRequestError('Envie "linhas" como array não vazio.', null)
    }

    const validas = []
    const rejeitadas = []
    for (let i = 0; i < linhas.length; i++) {
      const r = linhas[i] || {}
      const motivo = []
      const nome = String(r.nome || '').trim()
      const telDigitos = String(r.telefone || '').replace(/\D/g, '')
      if (!nome) motivo.push('sem nome')
      if (telDigitos.length < 10) motivo.push('telefone ausente ou inválido')
      if (motivo.length > 0) {
        rejeitadas.push({ linha: i + 1, motivos: motivo })
        continue
      }
      validas.push({
        id_app_crc: String(r.id_app_crc || '').trim(),
        nome: nome,
        telefone: '+' + telDigitos,
        origem_texto: String(r.origem || '').trim(),
      })
    }

    // mapa de campanhas por código (casamento EXATO; o que não casa fica desconhecida)
    const porCodigo = {}
    try {
      const camps = $app.findRecordsByFilter('campanhas', 'ativa = true', '', 500, 0)
      for (const c of camps) porCodigo[c.getString('codigo')] = c.id
    } catch (_) {}

    const colLeads = $app.findCollectionByNameOrId('leads')
    let gravados = 0
    let duplicados = 0
    for (let i = 0; i < validas.length; i++) {
      const v = validas[i]
      // dedup: id_app_crc igual já importado, ou telefone já cadastrado
      let jaExiste = false
      try {
        if (v.id_app_crc) {
          const a = $app.findRecordsByFilter(
            'leads',
            'id_app_crc = "' + v.id_app_crc.replace(/"/g, '') + '"',
            '',
            1,
            0,
          )
          if (a.length > 0) jaExiste = true
        }
        if (!jaExiste) {
          const b = $app.findRecordsByFilter('leads', 'telefone = "' + v.telefone + '"', '', 1, 0)
          if (b.length > 0) jaExiste = true
        }
      } catch (_) {
        jaExiste = false
      }
      if (jaExiste) {
        duplicados++
        continue
      }
      let origemTipo = 'desconhecida'
      let campanhaId = ''
      if (v.origem_texto && porCodigo[v.origem_texto]) {
        origemTipo = 'campanha'
        campanhaId = porCodigo[v.origem_texto]
      }
      const lead = new Record(colLeads)
      lead.set('nome', v.nome)
      lead.set('telefone', v.telefone)
      lead.set('origem_tipo', origemTipo)
      if (campanhaId) lead.set('campanha', campanhaId)
      lead.set('origem_texto_original', v.origem_texto)
      lead.set('id_app_crc', v.id_app_crc)
      lead.set('etapa', 'novo')
      lead.set('importado_app_crc', true)
      lead.set(
        'responsavel',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      lead.set('teste', body.teste === true)
      $app.save(lead)
      gravados++

      // ficha única: lead importado do APP CRC também ganha ficha vinculada
      try {
        const colPac = $app.findCollectionByNameOrId('pacientes')
        const pac = new Record(colPac)
        pac.set('nome', v.nome)
        pac.set('telefone', v.telefone)
        pac.set('lead', lead.id)
        pac.set(
          'responsavel',
          e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
        )
        pac.set('teste', body.teste === true)
        $app.save(pac)
        lead.set('paciente', pac.id)
        $app.save(lead)
      } catch (_) {}
    }

    return e.json(200, {
      lidas: linhas.length,
      gravados: gravados,
      duplicados: duplicados,
      rejeitadas: rejeitadas,
    })
  },
  $apis.requireAuth(),
)
