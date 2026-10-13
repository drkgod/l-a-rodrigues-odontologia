// Task c7194c3e — aplica lote validado de agenda (somente gestão; idempotente)
// NOTA: sem $app.runInTransaction — o callback da transação no JSVM não enxerga
// o escopo de fora (nem `e`, nem variáveis do handler) e derruba a rota inteira.
routerAdd(
  'POST',
  '/backend/v1/dados/aplicar-lote',
  (e) => {
    const body = e.requestInfo().body || {}
    const linhas = body.linhas
    if (!Array.isArray(linhas) || linhas.length === 0) {
      throw new BadRequestError('Envie "linhas" como array não vazio.', null)
    }
    const origemLote = String(body.origem || 'importacao')
    const hashArquivo = String(body.arquivo_hash || '')
    const periodoCoberto = String(body.periodo_coberto || '')

    if (hashArquivo) {
      const anteriores = $app.findRecordsByFilter(
        'sincronizacoes',
        'arquivo_hash = "' + hashArquivo + '" && situacao != "falha"',
        '-created',
        1,
        0,
      )
      if (anteriores.length > 0) {
        return e.json(200, {
          situacao: 'ok',
          itens_lidos: linhas.length,
          itens_gravados: 0,
          rejeitadas: 0,
          ja_aplicado: true,
          lote_id: anteriores[0].id,
        })
      }
    }

    const mapaProfs = {}
    for (const p of $app.findRecordsByFilter('profissionais', '', '', 500, 0)) {
      mapaProfs[String(p.getString('nome')).trim().toLowerCase()] = p.id
    }
    const mapaCadeiras = {}
    for (const c of $app.findRecordsByFilter('cadeiras', '', '', 500, 0)) {
      mapaCadeiras[String(c.getString('nome')).trim().toLowerCase()] = c.id
    }
    const mapaStatus = {}
    for (const s of $app.findRecordsByFilter('status_clinicorp', '', '', 100, 0)) {
      mapaStatus[String(s.getString('descricao')).trim().toLowerCase()] = s.id
    }

    let gravados = 0
    const rejeitadas = []
    const agora = new Date().toISOString()
    const col = $app.findCollectionByNameOrId('agenda_itens')

    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i] || {}
      const itemTipo = String(l.item_tipo || 'APPOINTMENT').toUpperCase()
      const clinicorpId = String(l.clinicorp_id || '').trim()
      const data = String(l.data || '').trim()
      const inicio = String(l.inicio || '').trim()
      const fim = String(l.fim || '').trim()

      let motivo = ''
      if (!clinicorpId) motivo = 'sem identificador de origem'
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) motivo = 'data inválida'
      else if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim) || inicio >= fim)
        motivo = 'horários inválidos'
      else if (!mapaProfs[String(l.profissional || '').toLowerCase()])
        motivo = 'profissional não cadastrado'
      if (motivo) {
        rejeitadas.push({ linha: i + 1, motivos: [motivo] })
        continue
      }

      const filtro =
        'origem = "' +
        origemLote +
        '" && item_tipo = "' +
        itemTipo +
        '" && clinicorp_id = "' +
        clinicorpId +
        '"'
      const existentes = $app.findRecordsByFilter('agenda_itens', filtro, '', 1, 0)

      let registro
      if (existentes.length > 0) {
        registro = existentes[0]
      } else {
        registro = new Record(col)
        registro.set('origem', origemLote)
        registro.set('item_tipo', itemTipo)
        registro.set('clinicorp_id', clinicorpId)
      }

      registro.set('data', data)
      registro.set('inicio', inicio)
      registro.set('fim', fim)
      registro.set('profissional', mapaProfs[String(l.profissional || '').toLowerCase()])
      if (l.cadeira) registro.set('cadeira', mapaCadeiras[String(l.cadeira || '').toLowerCase()] || '')
      registro.set('paciente_nome', String(l.paciente_nome || ''))
      registro.set('paciente_telefone', String(l.paciente_telefone || ''))
      if (l.duracao_reservada_min) registro.set('duracao_reservada_min', l.duracao_reservada_min)
      if (l.status) registro.set('status', mapaStatus[String(l.status || '').toLowerCase()] || '')
      registro.set('cancelado', l.cancelado === true)
      registro.set('teste', l.teste === true)
      registro.set('origem', origemLote)
      registro.set('ausente_na_ultima_leitura', false)
      registro.set('sincronizado_em', agora)
      $app.save(registro)
      gravados++
    }

    try {
      const todos = $app.findRecordsByFilter(
        'agenda_itens',
        'origem = "' + origemLote + '"',
        '-created',
        2000,
        0,
      )
      const idsNoLote = {}
      for (const l of linhas) {
        if (l && l.clinicorp_id) idsNoLote[String(l.clinicorp_id)] = true
      }
      for (const a of todos) {
        const cid = a.getString('clinicorp_id')
        if (!idsNoLote[cid] && a.getBool('cancelado') !== true) {
          if (!a.getBool('ausente_na_ultima_leitura')) {
            a.set('ausente_na_ultima_leitura', true)
            $app.save(a)
          }
        } else if (idsNoLote[cid] && a.getBool('ausente_na_ultima_leitura')) {
          a.set('ausente_na_ultima_leitura', false)
          $app.save(a)
        }
      }
    } catch (_) {}

    const colSinc = $app.findCollectionByNameOrId('sincronizacoes')
    const lote = new Record(colSinc)
    lote.set('situacao', rejeitadas.length > 0 ? 'parcial' : 'ok')
    lote.set('itens_lidos', linhas.length)
    lote.set('itens_gravados', gravados)
    lote.set('contagem_rejeitada', rejeitadas.length)
    lote.set('erro_resumo', rejeitadas.length > 0 ? JSON.stringify(rejeitadas).slice(0, 500) : '')
    lote.set('disparada_por', e.auth ? String(e.auth.getString('email') || '') : '')
    lote.set('origem', origemLote)
    lote.set('arquivo_hash', hashArquivo)
    lote.set('periodo_coberto', periodoCoberto)
    $app.save(lote)

    return e.json(200, {
      situacao: rejeitadas.length > 0 ? 'parcial' : 'ok',
      itens_lidos: linhas.length,
      itens_gravados: gravados,
      rejeitadas: rejeitadas,
      ja_aplicado: false,
      lote_id: lote.id,
    })
  },
  $apis.requireAuth(),
)
