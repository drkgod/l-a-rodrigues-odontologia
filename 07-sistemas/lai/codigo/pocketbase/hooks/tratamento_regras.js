// Emenda CA-SEQ-01 — atribuição de avaliador e projeção mínima do plano (SPEC-1-003).
// Decisão clínica só pelo dentista habilitado ATRIBUÍDO ao plano; gestão designa;
// CRC/recepção leem só o status operacional. Autor/derivações SEMPRE da sessão
// (nunca do payload). Lógica INLINE no callback (lição JSVM: função top-level
// não carrega no pod).
routerAdd(
  'POST',
  '/backend/v1/tratamento/atribuir-avaliador',
  (e) => {
    const body = e.requestInfo().body || {}
    const pacienteId = String(body.paciente_id || '').trim()
    const avaliadorId = String(body.avaliador_id || '').trim()
    const versaoEsperada = body.versao_esperada

    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    if (papel !== 'gestao') {
      throw new ForbiddenError('Somente a gestão designa o avaliador.', null)
    }
    if (!pacienteId || !avaliadorId) {
      throw new BadRequestError('Informe o paciente e o avaliador.', null)
    }

    let paciente = null
    try {
      paciente = $app.findRecordById('pacientes', pacienteId)
    } catch (_) {
      paciente = null
    }
    if (!paciente) throw new BadRequestError('Paciente não encontrado.', null)

    let avaliador = null
    try {
      avaliador = $app.findRecordById('users', avaliadorId)
    } catch (_) {
      avaliador = null
    }
    if (!avaliador) throw new BadRequestError('Avaliador não encontrado.', null)
    if (String(avaliador.getString('papel') || '') !== 'dentista') {
      throw new BadRequestError('O avaliador deve ser dentista.', null)
    }
    if (!avaliador.getBool('ativo')) {
      throw new BadRequestError('Dentista inativo não pode ser avaliador.', null)
    }
    if (!avaliador.getBool('avaliador_habilitado')) {
      throw new BadRequestError('Dentista não está habilitado como avaliador.', null)
    }

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

    const autor = e.auth ? String(e.auth.getString('name') || e.auth.getString('email') || '') : ''
    if (!plano) {
      const col = $app.findCollectionByNameOrId('planos_tratamento')
      plano = new Record(col)
      plano.set('paciente', pacienteId)
      plano.set('avaliador', avaliadorId)
      plano.set('versao', 1)
      plano.set('estado', 'rascunho')
      plano.set('criado_por', autor)
      plano.set('criado_em', new Date().toISOString())
      plano.set('teste', body.teste === true)
      $app.save(plano)
    } else {
      // guarda de versão: plano mudou → recusar e pedir recarga (contrato da emenda)
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
      plano.set('avaliador', avaliadorId)
      $app.save(plano)
    }

    // evento append-only na ficha (histórico completo)
    try {
      const colEv = $app.findCollectionByNameOrId('eventos')
      const ev = new Record(colEv)
      ev.set('paciente', pacienteId)
      ev.set('paciente_rel', pacienteId)
      try {
        const lid = paciente.getString('lead') || ''
        if (lid) {
          ev.set('lead', lid)
          ev.set('lead_rel', lid)
        }
      } catch (_) {}
      ev.set('tipo', 'nota')
      ev.set(
        'descricao',
        'Avaliador designado: ' +
          String(avaliador.getString('name') || avaliador.getString('email') || ''),
      )
      ev.set('autor', autor)
      ev.set('teste', body.teste === true || plano.getBool('teste'))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      plano_id: plano.id,
      versao: plano.getInt('versao'),
      estado: plano.getString('estado'),
      avaliador_id: avaliadorId,
    })
  },
  $apis.requireAuth(),
)

// Projeção mínima do plano (contrato da emenda): gestão/CRC/recepção leem o status
// operacional; dentista SÓ o avaliador habilitado atribuído; dentista alheio = 403.
routerAdd(
  'GET',
  '/backend/v1/tratamento/plano',
  (e) => {
    const q = e.requestInfo().query || {}
    const pacienteId = String(q.paciente_id || '').trim()
    if (!pacienteId) throw new BadRequestError('Informe paciente_id.', null)

    const papel = e.auth ? String(e.auth.getString('papel') || '') : ''
    const ehEquipe =
      papel === 'gestao' ||
      papel === 'crc_agendamento' ||
      papel === 'crc_confirmacao' ||
      papel === 'crc_comercial' ||
      papel === 'recepcao'

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

    if (!plano) {
      if (!ehEquipe) {
        throw new ForbiddenError('Sem acesso ao plano deste paciente.', null)
      }
      return e.json(200, { tem_plano: false })
    }

    if (!ehEquipe) {
      const avalId = plano.getString('avaliador') || ''
      const meuId = e.auth ? String(e.auth.id || '') : ''
      if (
        papel !== 'dentista' ||
        avalId !== meuId ||
        !e.auth.getBool('avaliador_habilitado')
      ) {
        throw new ForbiddenError(
          'Somente o avaliador atribuído acessa o plano deste paciente.',
          null,
        )
      }
    }

    let avaliadorNome = ''
    try {
      const avalId = plano.getString('avaliador') || ''
      if (avalId) {
        const u = $app.findRecordById('users', avalId)
        avaliadorNome = String(u.getString('name') || u.getString('email') || '')
      }
    } catch (_) {}

    return e.json(200, {
      tem_plano: true,
      plano_id: plano.id,
      versao: plano.getInt('versao'),
      estado: plano.getString('estado'),
      avaliador_id: plano.getString('avaliador') || '',
      avaliador_nome: avaliadorNome,
    })
  },
  $apis.requireAuth(),
)

// Limpeza da massa de teste das provas (planos teste=true) — gestão only.
routerAdd(
  'POST',
  '/backend/v1/tratamento/limpar-massa-teste',
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
