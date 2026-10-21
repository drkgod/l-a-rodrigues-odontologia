// Emenda CA-SEQ-03 — editor de etapas do plano do paciente (SPEC-1-003).
// SÓ o avaliador ATRIBUÍDO (sessão) define/aprova as etapas — decisão clínica.
// Copiar modelo: só modelo APROVADO; adaptar o caso (conteúdo ≠ modelo) exige motivo.
// Salvar plano aprovado volta pra em_revisao com versão+1. Guarda de versão.
// Lógica INLINE no callback (lição JSVM: função top-level não carrega no pod).
routerAdd(
  'POST',
  '/backend/v1/tratamento/plano-salvar',
  (e) => {
    const body = e.requestInfo().body || {}
    const pacienteId = String(body.paciente_id || '').trim()
    const versaoEsperada = body.versao_esperada
    const motivoAjuste = String(body.motivo_ajuste || '').trim()
    const origem = String(body.origem || 'manual').trim()
    const modeloId = String(body.modelo_id || '').trim()
    const etapasBrutas = body.etapas

    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    if (!pacienteId) throw new BadRequestError('Informe o paciente.', null)

    let plano = null
    try {
      const achados = $app.findRecordsByFilter(
        'planos_tratamento',
        'paciente = "' + pacienteId.replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      if (achados.length > 0) plano = achados[0]
    } catch (_) {
      plano = null
    }
    if (!plano)
      throw new BadRequestError('Paciente ainda não tem plano — designe o avaliador.', null)

    // decisão clínica: SÓ o avaliador atribuído (sessão), nunca gestão/CRC
    const meuId = e.auth ? String(e.auth.id || '') : ''
    const ehAvaliadorAtribuido =
      papel === 'dentista' &&
      e.auth.getBool('ativo') &&
      e.auth.getBool('avaliador_habilitado') &&
      String(plano.getString('avaliador') || '') === meuId
    if (!ehAvaliadorAtribuido) {
      throw new ForbiddenError(
        'Somente o avaliador atribuído define as etapas deste paciente.',
        null,
      )
    }

    // guarda de versão
    if (
      versaoEsperada !== undefined &&
      versaoEsperada !== null &&
      versaoEsperada !== '' &&
      Number(versaoEsperada) !== plano.getInt('versao')
    ) {
      throw new BadRequestError(
        'O plano mudou (versão ' + plano.getInt('versao') + ') — recarregue e tente de novo.',
        null,
      )
    }

    // copiar modelo aprovado: valida o modelo; as etapas salvas são as ENVIADAS
    // (cópia possivelmente adaptada no editor) — nunca as do modelo por cima
    let etapasDoModelo = []
    if (origem === 'modelo') {
      if (!modeloId) throw new BadRequestError('Informe o modelo a copiar.', null)
      let modelo = null
      try {
        modelo = $app.findRecordById('modelos_sequencia', modeloId)
      } catch (_) {
        modelo = null
      }
      if (!modelo) throw new BadRequestError('Modelo não encontrado.', null)
      if (modelo.getString('estado') !== 'aprovado') {
        throw new BadRequestError(
          'Só modelo aprovado pode ser copiado (estado atual: ' + modelo.getString('estado') + ').',
          null,
        )
      }
      // JSVM: campo JSON vem como RawJson — getString() devolve o texto JSON
      let dm = modelo.getString('etapas')
      if (typeof dm === 'string') {
        try {
          dm = JSON.parse(dm)
        } catch (_) {
          dm = []
        }
      }
      if (Array.isArray(dm)) etapasDoModelo = dm
    }

    if (!Array.isArray(etapasBrutas) || etapasBrutas.length === 0) {
      throw new BadRequestError('Cadastre ao menos uma etapa.', null)
    }

    // valida grafo (chaves únicas, deps internas, sem self-dep, sem ciclo) — inline
    const etapas = []
    const chaves = []
    for (let i = 0; i < etapasBrutas.length; i++) {
      const t = etapasBrutas[i] || {}
      const chave = String(t.chave || '').trim()
      const procedimento = String(t.procedimento || '').trim()
      const ordemVisual = Number(t.ordem_visual || i + 1)
      let deps = t.depende_de
      if (!Array.isArray(deps)) deps = []
      deps = deps
        .map(function (d) {
          return String(d || '').trim()
        })
        .filter(function (d) {
          return d !== ''
        })
      if (!chave) throw new BadRequestError('Etapa ' + (i + 1) + ' sem chave.', null)
      if (!procedimento) {
        throw new BadRequestError('Etapa ' + chave + ' sem procedimento.', null)
      }
      if (chaves.indexOf(chave) >= 0) {
        throw new BadRequestError('Chave de etapa repetida: ' + chave + '.', null)
      }
      if (deps.indexOf(chave) >= 0) {
        throw new BadRequestError('Etapa ' + chave + ' depende de si mesma.', null)
      }
      chaves.push(chave)
      etapas.push({
        chave: chave,
        procedimento: procedimento,
        ordem_visual: ordemVisual,
        depende_de: deps,
        estado_etapa: String(t.estado_etapa || 'pendente').trim(),
      })
    }
    for (let i = 0; i < etapas.length; i++) {
      const deps = etapas[i].depende_de
      for (let j = 0; j < deps.length; j++) {
        if (chaves.indexOf(deps[j]) < 0) {
          throw new BadRequestError(
            'Etapa ' +
              etapas[i].chave +
              ' depende de "' +
              deps[j] +
              '", que não existe neste plano.',
            null,
          )
        }
      }
    }
    const marca = {}
    let temCiclo = false
    const visita = function (chave) {
      if (temCiclo) return
      marca[chave] = 1
      for (let i = 0; i < etapas.length; i++) {
        if (etapas[i].chave !== chave) continue
        const deps = etapas[i].depende_de
        for (let j = 0; j < deps.length; j++) {
          const d = deps[j]
          if (marca[d] === 1) {
            temCiclo = true
            return
          }
          if (!marca[d]) visita(d)
        }
      }
      marca[chave] = 2
    }
    for (let i = 0; i < etapas.length; i++) {
      if (!marca[etapas[i].chave]) visita(etapas[i].chave)
    }
    if (temCiclo) {
      throw new BadRequestError('As dependências formam um ciclo — ajuste a sequência.', null)
    }

    // adaptação do modelo: conteúdo ENVIADO ≠ conteúdo do modelo → motivo obrigatório
    // (cópia fiel não precisa de motivo; compara só os campos clínicos, sem estado_etapa)
    if (origem === 'modelo' && !motivoAjuste) {
      const resumo = function (arr) {
        return JSON.stringify(
          (arr || []).map(function (t) {
            return {
              chave: String(t.chave || '').trim(),
              procedimento: String(t.procedimento || '').trim(),
              ordem_visual: Number(t.ordem_visual || 0),
              depende_de: (t.depende_de || []).slice().sort(),
            }
          }),
        )
      }
      if (resumo(etapas) !== resumo(etapasDoModelo)) {
        throw new BadRequestError(
          'Adaptar o caso a partir do modelo exige o motivo do ajuste.',
          null,
        )
      }
    }

    const estadoAtual = plano.getString('estado')
    if (estadoAtual === 'encerrado') {
      throw new BadRequestError('Plano encerrado não pode ser editado.', null)
    }
    if (estadoAtual === 'aprovado') {
      // mudança em plano aprovado exige reaprovação: em_revisao + versão+1
      plano.set('versao', plano.getInt('versao') + 1)
      plano.set('estado', 'em_revisao')
    }
    plano.set('etapas', JSON.stringify(etapas))
    plano.set('motivo_ajuste', motivoAjuste)
    $app.save(plano)

    // evento append-only na ficha
    try {
      const autor = e.auth
        ? String(e.auth.getString('name') || e.auth.getString('email') || '')
        : ''
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('paciente', pacienteId)
      ev.set('paciente_rel', pacienteId)
      try {
        const p = $app.findRecordById('pacientes', pacienteId)
        const lid = p.getString('lead') || ''
        if (lid) {
          ev.set('lead', lid)
          ev.set('lead_rel', lid)
        }
      } catch (_) {}
      ev.set('tipo', 'nota')
      ev.set(
        'descricao',
        origem === 'modelo'
          ? 'Etapas definidas a partir de modelo (' + etapas.length + ' etapas)'
          : 'Etapas do plano definidas (' + etapas.length + ' etapas)',
      )
      ev.set('autor', autor)
      ev.set('teste', plano.getBool('teste'))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      plano_id: plano.id,
      versao: plano.getInt('versao'),
      estado: plano.getString('estado'),
      etapas: etapas.length,
    })
  },
  $apis.requireAuth(),
)

// Aprovar as etapas do plano: SÓ avaliador atribuído, exige ≥1 etapa.
routerAdd(
  'POST',
  '/backend/v1/tratamento/plano-aprovar',
  (e) => {
    const body = e.requestInfo().body || {}
    const pacienteId = String(body.paciente_id || '').trim()
    const versaoEsperada = body.versao_esperada
    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    if (!pacienteId) throw new BadRequestError('Informe o paciente.', null)

    let plano = null
    try {
      const achados = $app.findRecordsByFilter(
        'planos_tratamento',
        'paciente = "' + pacienteId.replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      if (achados.length > 0) plano = achados[0]
    } catch (_) {
      plano = null
    }
    if (!plano) throw new BadRequestError('Paciente ainda não tem plano.', null)

    const meuId = e.auth ? String(e.auth.id || '') : ''
    const ehAvaliadorAtribuido =
      papel === 'dentista' &&
      e.auth.getBool('ativo') &&
      e.auth.getBool('avaliador_habilitado') &&
      String(plano.getString('avaliador') || '') === meuId
    if (!ehAvaliadorAtribuido) {
      throw new ForbiddenError(
        'Somente o avaliador atribuído aprova as etapas deste paciente.',
        null,
      )
    }
    if (
      versaoEsperada !== undefined &&
      versaoEsperada !== null &&
      versaoEsperada !== '' &&
      Number(versaoEsperada) !== plano.getInt('versao')
    ) {
      throw new BadRequestError(
        'O plano mudou (versão ' + plano.getInt('versao') + ') — recarregue e tente de novo.',
        null,
      )
    }
    let qtdEtapas = 0
    try {
      // JSVM: campo JSON vem como RawJson — getString() devolve o texto JSON
      const raw = plano.getString('etapas')
      let arr = raw
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr)
        } catch (_) {
          arr = []
        }
      }
      if (Array.isArray(arr)) qtdEtapas = arr.length
    } catch (_) {
      qtdEtapas = 0
    }
    if (qtdEtapas === 0) {
      throw new BadRequestError('Defina as etapas antes de aprovar.', null)
    }
    if (plano.getString('estado') === 'encerrado') {
      throw new BadRequestError('Plano encerrado não pode ser aprovado.', null)
    }
    plano.set('estado', 'aprovado')
    plano.set(
      'aprovado_por',
      e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : '',
    )
    plano.set('aprovado_em', new Date().toISOString())
    $app.save(plano)

    try {
      const autor = e.auth
        ? String(e.auth.getString('name') || e.auth.getString('email') || '')
        : ''
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('paciente', pacienteId)
      ev.set('paciente_rel', pacienteId)
      try {
        const p = $app.findRecordById('pacientes', pacienteId)
        const lid = p.getString('lead') || ''
        if (lid) {
          ev.set('lead', lid)
          ev.set('lead_rel', lid)
        }
      } catch (_) {}
      ev.set('tipo', 'nota')
      ev.set('descricao', 'Etapas do plano APROVADAS (' + qtdEtapas + ' etapas)')
      ev.set('autor', autor)
      ev.set('teste', plano.getBool('teste'))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      plano_id: plano.id,
      versao: plano.getInt('versao'),
      estado: 'aprovado',
      etapas: qtdEtapas,
    })
  },
  $apis.requireAuth(),
)

// Limpeza da massa de teste (planos teste=true) — gestão only.
routerAdd(
  'POST',
  '/backend/v1/tratamento/plano-limpar-teste',
  (e) => {
    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    if (papel !== 'gestao') {
      throw new ForbiddenError('Somente gestão pode limpar massa de teste.', null)
    }
    let apagados = 0
    const planos = $app.findRecordsByFilter('planos_tratamento', 'teste = true', '', 500, 0)
    for (const p of planos) {
      $app.delete(p)
      apagados++
    }
    return e.json(200, { ok: true, planos: apagados })
  },
  $apis.requireAuth(),
)
