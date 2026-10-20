// Task d03a15ee — CA-1-17: o lead ligado a um agendamento percorre
// agendado → confirmado → compareceu/faltou.
// Vínculo automático por TELEFONE (agenda_itens.lead, migration 0017);
// confirmação/cancelamento vêm do contato de confirmação; chegada é registrada
// na rota /leads/registrar-chegada. Relatório de origem em /leads/relatorio-origem.
// rev.6 — roteamento por CAMPOS (sem e.collection) e evento de etapa INLINADO
// em cada callback (scoping do JSVM: função top-level não é visível no callback).

// --- create: vínculo automático por telefone em agenda_itens ---
onRecordAfterCreateSuccess((e) => {
  const item = e.record
  let tel = ''
  try {
    tel = String(item.getString('paciente_telefone') || '').replace(/\D/g, '')
  } catch (_) {
    return
  }
  if (tel.length > 11 && tel.indexOf('55') === 0) tel = tel.slice(2)
  if (tel.length < 10) return
  if (item.getBool('cancelado')) return
  let lead = null
  try {
    let a = $app.findRecordsByFilter('leads', 'telefone = "+' + tel + '"', '', 1, 0)
    if (a.length > 0) lead = a[0]
    else {
      a = $app.findRecordsByFilter('leads', 'telefone = "' + tel + '"', '', 1, 0)
      if (a.length > 0) lead = a[0]
    }
  } catch (_) {
    return
  }
  if (!lead) return
  if (item.getBool('teste') !== lead.getBool('teste')) return
  item.set('lead', lead.id)
  $app.save(item)
  const etapa = lead.getString('etapa')
  if (etapa === 'novo' || etapa === 'em_atendimento' || etapa === 'aguardando_retorno') {
    lead.set('etapa', 'agendado')
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
          etapa +
          ' → agendado (consulta em ' +
          item.getString('data') +
          ' ' +
          item.getString('inicio') +
          ')',
      )
      ev.set('autor', 'sistema (agenda)')
      ev.set('teste', lead.getBool('teste'))
      $app.save(ev)
    } catch (_) {}
  }
})

// --- update: agenda_itens (cancelamento/vínculo tardio) OU contatos_confirmacao ---
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  let tel = ''
  try {
    tel = String(rec.getString('paciente_telefone') || '').replace(/\D/g, '')
  } catch (_) {
    tel = ''
  }
  if (tel.length > 11 && tel.indexOf('55') === 0) tel = tel.slice(2)

  if (tel.length >= 10) {
    // ===== caminho agenda_itens =====
    if (rec.getBool('cancelado') && rec.getString('lead') !== '') {
      try {
        const lead = $app.findRecordById('leads', rec.getString('lead'))
        const etapa = lead.getString('etapa')
        if (etapa === 'agendado' || etapa === 'confirmado') {
          lead.set('etapa', 'aguardando_retorno')
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
              'Etapa: ' + etapa + ' → aguardando_retorno (consulta cancelada na agenda)',
            )
            ev.set('autor', 'sistema (agenda)')
            ev.set('teste', lead.getBool('teste'))
            $app.save(ev)
          } catch (_) {}
        }
      } catch (_) {}
      return
    }
    if (rec.getString('lead') === '' && !rec.getBool('cancelado')) {
      let lead = null
      try {
        let a = $app.findRecordsByFilter('leads', 'telefone = "+' + tel + '"', '', 1, 0)
        if (a.length > 0) lead = a[0]
        else {
          a = $app.findRecordsByFilter('leads', 'telefone = "' + tel + '"', '', 1, 0)
          if (a.length > 0) lead = a[0]
        }
      } catch (_) {
        lead = null
      }
      if (lead && rec.getBool('teste') === lead.getBool('teste')) {
        rec.set('lead', lead.id)
        $app.save(rec)
        const etapa = lead.getString('etapa')
        if (etapa === 'novo' || etapa === 'em_atendimento' || etapa === 'aguardando_retorno') {
          lead.set('etapa', 'agendado')
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
                etapa +
                ' → agendado (consulta em ' +
                rec.getString('data') +
                ' ' +
                rec.getString('inicio') +
                ')',
            )
            ev.set('autor', 'sistema (agenda)')
            ev.set('teste', lead.getBool('teste'))
            $app.save(ev)
          } catch (_) {}
        }
      }
    }
    return
  }

  // ===== caminho contatos_confirmacao (tem agenda_item) =====
  let itemId = ''
  try {
    itemId = rec.getString('agenda_item') || ''
  } catch (_) {
    return
  }
  if (!itemId) return
  const estado = rec.getString('estado')
  if (estado !== 'confirmou' && estado !== 'cancelou') return
  let item = null
  try {
    item = $app.findRecordById('agenda_itens', itemId)
  } catch (_) {
    return
  }
  const leadId = item.getString('lead')
  if (!leadId) return
  let lead = null
  try {
    lead = $app.findRecordById('leads', leadId)
  } catch (_) {
    return
  }
  if (item.getBool('teste') !== lead.getBool('teste')) return
  const etapa = lead.getString('etapa')
  const autor = rec.getString('atualizado_por') || 'sistema (confirmação)'
  if (estado === 'confirmou' && etapa === 'agendado') {
    lead.set('etapa', 'confirmado')
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
      ev.set('descricao', 'Etapa: agendado → confirmado (confirmação do paciente)')
      ev.set('autor', autor)
      ev.set('teste', lead.getBool('teste'))
      $app.save(ev)
    } catch (_) {}
  }
  if (estado === 'cancelou' && (etapa === 'agendado' || etapa === 'confirmado')) {
    lead.set('etapa', 'aguardando_retorno')
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
      ev.set('descricao', 'Etapa: ' + etapa + ' → aguardando_retorno (cancelou na confirmação)')
      ev.set('autor', autor)
      ev.set('teste', lead.getBool('teste'))
      $app.save(ev)
    } catch (_) {}
  }
})

// --- chegada manual: compareceu / faltou ---
routerAdd(
  'POST',
  '/backend/v1/leads/registrar-chegada',
  (e) => {
    const body = e.requestInfo().body || {}
    const leadId = String(body.lead || '')
    const resultado = String(body.resultado || '').trim()
    if (resultado !== 'compareceu' && resultado !== 'faltou')
      throw new BadRequestError('Resultado deve ser compareceu ou faltou.', null)
    let lead = null
    try {
      lead = $app.findRecordById('leads', leadId)
    } catch (_) {
      lead = null
    }
    if (!lead) throw new BadRequestError('Lead não encontrado.', null)
    const etapa = lead.getString('etapa')
    if (etapa !== 'agendado' && etapa !== 'confirmado')
      throw new BadRequestError(
        'Chegada só registra para lead agendado ou confirmado (etapa atual: ' + etapa + ').',
        null,
      )
    lead.set('etapa', resultado)
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
      ev.set('tipo', resultado === 'compareceu' ? 'chegada' : 'falta')
      ev.set(
        'descricao',
        'Etapa: ' +
          etapa +
          ' → ' +
          resultado +
          (resultado === 'compareceu' ? ' (chegada registrada)' : ' (falta registrada)'),
      )
      ev.set(
        'autor',
        e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
      )
      ev.set('teste', lead.getBool('teste'))
      $app.save(ev)
    } catch (_) {}
    return e.json(200, { ok: true, etapa: resultado, anterior: etapa })
  },
  $apis.requireAuth(),
)

// --- relatório de origem (d45e8f8a): por campanha e período, sem dados pessoais ---
routerAdd(
  'GET',
  '/backend/v1/leads/relatorio-origem',
  (e) => {
    const q = e.requestInfo().query || {}
    const de = String(q.de || '')
    const ate = String(q.ate || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate))
      throw new BadRequestError('Informe de e ate no formato YYYY-MM-DD.', null)
    // data_entrada (data real do APP CRC/import) com fallback pra entrada_em (autodate)
    const filtro =
      '(data_entrada >= "' +
      de +
      ' 00:00:00.000Z" && data_entrada <= "' +
      ate +
      ' 23:59:59.999Z") || (data_entrada = "" && entrada_em >= "' +
      de +
      ' 00:00:00.000Z" && entrada_em <= "' +
      ate +
      ' 23:59:59.999Z")'
    const leads = $app.findRecordsByFilter('leads', filtro, '-created', 20000, 0)

    const nomesCampanha = {}
    try {
      const camps = $app.findRecordsByFilter('campanhas', '', '', 500, 0)
      for (const c of camps) nomesCampanha[c.id] = c.getString('nome')
    } catch (_) {}

    const grupos = {}
    for (let i = 0; i < leads.length; i++) {
      const l = leads[i]
      let origem = ''
      if (l.getString('origem_tipo') === 'campanha') {
        origem = nomesCampanha[l.getString('campanha')] || 'campanha'
      } else {
        origem = l.getString('origem_texto_original') || 'sem origem'
      }
      const g = grupos[origem] || {
        origem: origem,
        leads: 0,
        agendados: 0,
        confirmados: 0,
        compareceram: 0,
        faltaram: 0,
      }
      g.leads++
      const etapa = l.getString('etapa')
      if (
        etapa === 'agendado' ||
        etapa === 'confirmado' ||
        etapa === 'compareceu' ||
        etapa === 'faltou'
      )
        g.agendados++
      if (etapa === 'confirmado') g.confirmados++
      if (etapa === 'compareceu') g.compareceram++
      if (etapa === 'faltou') g.faltaram++
      grupos[origem] = g
    }
    const linhas = []
    const totais = { leads: 0, agendados: 0, confirmados: 0, compareceram: 0, faltaram: 0 }
    for (const k in grupos) {
      linhas.push(grupos[k])
      totais.leads += grupos[k].leads
      totais.agendados += grupos[k].agendados
      totais.confirmados += grupos[k].confirmados
      totais.compareceram += grupos[k].compareceram
      totais.faltaram += grupos[k].faltaram
    }
    linhas.sort(function (a, b) {
      return b.leads - a.leads
    })
    return e.json(200, { de: de, ate: ate, linhas: linhas, totais: totais })
  },
  $apis.requireAuth(),
)
