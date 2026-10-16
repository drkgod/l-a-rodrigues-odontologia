// Task 097ff6ce — rota de sugestão de duração (SPEC-1-002, CA-1-08/09)
// POST /backend/v1/duracao/sugerir
// Entrada: { itens: [{ grupo_regra, quantidade, quantidade2? }], profissional: <nome>, teste?: bool }
// Regras: tabela ativa (ou de teste quando teste=true); regra específica do
// profissional prevalece sobre a de grupo (decisão do dono 13/10/2026 18h16);
// regra "sempre" é incondicional; combinação de 2 grupos NUNCA soma — sem_regra;
// arredonda para CIMA no múltiplo de config_unidade.arredondamento_min.
// O casamento usa as DUAS variáveis do formato real da clínica (decisão 16:53).
// Toda a lógica fica INLINE no callback (lição JSVM: função top-level referenciada
// no callback não carrega no pod — causa 500 "Something went wrong").
routerAdd(
  'POST',
  '/backend/v1/duracao/sugerir',
  (e) => {
    const body = e.requestInfo().body || {}
    const itensEntrada = body.itens
    const profissional = String(body.profissional || '').trim()
    const teste = body.teste === true

    // --- validação de entrada ---
    if (!Array.isArray(itensEntrada) || itensEntrada.length === 0) {
      throw new BadRequestError('Envie ao menos um item com grupo_regra e quantidade.', null)
    }
    const itens = []
    for (const it of itensEntrada) {
      const grupo = String((it || {}).grupo_regra || '').trim()
      const qtd = Number((it || {}).quantidade)
      const qtd2 = Number(
        (it || {}).quantidade2 === undefined || (it || {}).quantidade2 === ''
          ? 0
          : (it || {}).quantidade2,
      )
      if (!grupo) {
        throw new BadRequestError('Todo item precisa de grupo_regra.', null)
      }
      if (!Number.isFinite(qtd) || qtd < 1) {
        throw new BadRequestError('Quantidade deve ser um número maior ou igual a 1.', null)
      }
      if (!Number.isFinite(qtd2) || qtd2 < 0) {
        throw new BadRequestError('Quantidade da 2ª variável inválida.', null)
      }
      itens.push({ grupo: grupo, qtd: Math.floor(qtd), qtd2: Math.floor(qtd2) })
    }
    if (itens.length > 2) {
      throw new BadRequestError('No máximo 2 procedimentos por consulta nesta fase.', null)
    }

    // --- tabela: teste ou ativa ---
    let tabela = null
    try {
      if (teste) {
        const cand = $app.findRecordsByFilter('tabela_duracao', 'teste = true', '-created', 1, 0)
        tabela = cand.length > 0 ? cand[0] : null
      }
      if (!tabela) {
        const cand = $app.findRecordsByFilter('tabela_duracao', 'ativa = true', '-created', 1, 0)
        tabela = cand.length > 0 ? cand[0] : null
      }
    } catch (_) {
      tabela = null
    }
    if (!tabela) {
      return e.json(200, {
        situacao: 'sem_regra',
        mensagem: 'Sem tabela de duração válida — validar com a direção.',
        minutos: 0,
        minutos_brutos: 0,
        arredondamento: 0,
        regra_aplicada: null,
        origem_tabela: '',
        capacidade_validada: false,
        planejamento_id: '',
      })
    }

    // --- capacidades da unidade (arredondamento) ---
    let arredondamento = 5
    try {
      const cfgU = $app.findFirstRecordByFilter('config_unidade', "nome_unidade = 'UNIDADE-DEMO'")
      if (cfgU) {
        const ar = cfgU.getInt('arredondamento_min')
        if (ar > 0) arredondamento = ar
      }
    } catch (_) {
      arredondamento = 5
    }

    // --- casa a regra (1 item) — matcher inline com as duas variáveis ---
    let regra = null
    if (itens.length === 1) {
      const grupo = itens[0].grupo
      const regras = $app.findRecordsByFilter(
        'regras_duracao',
        'tabela = "' + tabela.id + '" && grupo_regra = "' + grupo.replace(/"/g, '') + '"',
        '',
        500,
        0,
      )
      const especificas = []
      const deGrupo = []
      for (const r of regras) {
        const prof = r.getString('profissional')
        if (prof && profissional && prof.toLowerCase() === profissional.toLowerCase()) {
          especificas.push(r)
        } else if (!prof) {
          deGrupo.push(r)
        }
      }
      const candidatas = especificas.length > 0 ? especificas : deGrupo
      const q1 = itens[0].qtd
      const q2 = itens[0].qtd2
      for (const r of candidatas) {
        // casaRegra inline: quantidade casa em qualquer posição (v1/v2),
        // a outra dimensão precisa caber no valor informado (ausente = 0)
        const v1 = r.getString('variavel_1')
        const v2 = r.getString('variavel_2')
        if (v1 === 'sempre') {
          regra = r
          break
        }
        const m1 = r.getInt('min_1')
        const x1 = r.getInt('max_1')
        const m2 = r.getInt('min_2')
        const x2 = r.getInt('max_2')
        const cabe1Direta = v1 ? q1 >= m1 && (x1 <= 0 || q1 <= x1) : q1 === 0
        const cabe2Direta = v2 ? q2 >= m2 && (x2 <= 0 || q2 <= x2) : q2 === 0
        const cabe1Inversa = v1 ? q2 >= m1 && (x1 <= 0 || q2 <= x1) : q2 === 0
        const cabe2Inversa = v2 ? q1 >= m2 && (x2 <= 0 || q1 <= x2) : q1 === 0
        if ((cabe1Direta && cabe2Direta) || (cabe1Inversa && cabe2Inversa)) {
          regra = r
          break
        }
      }
    }

    // --- resultado ---
    let minutosBrutos = 0
    let minutos = 0
    let regraAplicada = null
    let situacao = 'sem_regra'
    let mensagem = 'Sem regra para esta combinação — validar com a direção.'
    if (regra) {
      minutosBrutos = regra.getInt('duracao_min')
      if (minutosBrutos <= 0) {
        situacao = 'sem_regra'
        mensagem = 'Regra com duração inválida na tabela — validar com a direção.'
      } else {
        minutos = Math.ceil(minutosBrutos / arredondamento) * arredondamento
        situacao = 'ok'
        mensagem = ''
        // descreverFaixa inline
        const f1v = regra.getString('variavel_1')
        const f1m = regra.getInt('min_1')
        const f1x = regra.getInt('max_1')
        let faixa1 = f1v
        if (f1v === 'sempre') faixa1 = 'qualquer quantidade'
        else if (f1m > 0 && f1x > 0) faixa1 = f1v + ' ' + f1m + '–' + f1x
        else if (f1m > 0) faixa1 = f1v + ' ' + f1m + '+'
        else if (f1x > 0) faixa1 = f1v + ' até ' + f1x
        let faixa2 = ''
        if (regra.getString('variavel_2')) {
          const f2v = regra.getString('variavel_2')
          const f2m = regra.getInt('min_2')
          const f2x = regra.getInt('max_2')
          faixa2 = f2v
          if (f2v === 'sempre') faixa2 = 'qualquer quantidade'
          else if (f2m > 0 && f2x > 0) faixa2 = f2v + ' ' + f2m + '–' + f2x
          else if (f2m > 0) faixa2 = f2v + ' ' + f2m + '+'
          else if (f2x > 0) faixa2 = f2v + ' até ' + f2x
        }
        regraAplicada = {
          grupo_regra: regra.getString('grupo_regra'),
          aplica_a: regra.getString('aplica_a'),
          faixa_1: faixa1,
          faixa_2: faixa2,
          profissional: regra.getString('profissional'),
          observacao: regra.getString('observacao'),
        }
      }
    }

    // --- capacidade: consulta ao módulo da SPEC-1-004 (política ATIVA de tratamento) ---
    let capacidadeValidada = false
    try {
      const politicas = $app.findRecordsByFilter(
        'politicas_agenda',
        'situacao = "ativa" && tipo = "horario_marcado"',
        '',
        1,
        0,
      )
      capacidadeValidada = politicas.length > 0
    } catch (_) {
      capacidadeValidada = false
    }

    // --- histórico (planejamentos) ---
    let planejamentoId = ''
    try {
      const col = $app.findCollectionByNameOrId('planejamentos')
      const registro = new Record(col)
      registro.set('profissional', profissional)
      registro.set(
        'itens',
        JSON.stringify(
          itens.map(function (it) {
            return { grupo_regra: it.grupo, quantidade: it.qtd, quantidade2: it.qtd2 }
          }),
        ),
      )
      registro.set('minutos_sugeridos', minutos)
      registro.set('minutos_brutos', minutosBrutos)
      // BUG FIX (teste humano P2-05b, 16/10): 'sugerido' não existe mais no select
      // (migration 0013: planejado/reservado/reserva_nao_encontrada/cancelado) e a
      // conciliação RN-06 marca 'planejado'. Tempo calculado sem reserva = 'planejado'.
      registro.set('situacao', situacao === 'ok' ? 'planejado' : 'sem_regra')
      registro.set('regra_aplicada', regraAplicada ? JSON.stringify(regraAplicada) : '')
      registro.set('crc', e.auth ? String(e.auth.getString('email') || '') : '')
      registro.set('teste', teste)
      $app.save(registro)
      planejamentoId = registro.id
    } catch (_) {
      planejamentoId = ''
    }

    return e.json(200, {
      situacao: situacao,
      mensagem: mensagem,
      minutos: minutos,
      minutos_brutos: minutosBrutos,
      arredondamento: arredondamento,
      regra_aplicada: regraAplicada,
      origem_tabela: tabela.getString('versao'),
      capacidade_validada: capacidadeValidada,
      planejamento_id: planejamentoId,
    })
  },
  $apis.requireAuth(),
)

// Task fdca5fb0 — ligar reserva ao planejamento (RN-04, CA-1-10).
// Reserva SIMULADA (modo demonstrativo): item da agenda de teste/arquivo, mesmo
// profissional. Diferença de tempo cria desvio sem_motivo (pendência da CRC).
routerAdd(
  'POST',
  '/backend/v1/duracao/ligar-reserva',
  (e) => {
    const body = e.requestInfo().body || {}
    const planejamentoId = String(body.planejamento || '')
    const itemId = String(body.agenda_item || '')
    if (!planejamentoId) throw new BadRequestError('Informe o planejamento.', null)
    if (!itemId) throw new BadRequestError('Informe o item da agenda (reserva).', null)

    let planejamento
    try {
      planejamento = $app.findRecordById('planejamentos', planejamentoId)
    } catch (_) {
      throw new BadRequestError('Planejamento não encontrado.', null)
    }
    let item
    try {
      item = $app.findRecordById('agenda_itens', itemId)
    } catch (_) {
      throw new BadRequestError('Item da agenda não encontrado.', null)
    }
    if (item.getBoolean('cancelado') || item.getBoolean('excluido')) {
      throw new BadRequestError('Este horário está cancelado — escolha outro.', null)
    }
    if (item.getString('item_tipo') !== 'APPOINTMENT') {
      throw new BadRequestError('Só consulta (APPOINTMENT) pode ser reservada.', null)
    }
    // mesmo profissional (relação id × nome do planejamento)
    const nomesProf = {}
    const pros = $app.findRecordsByFilter('profissionais', 'id != ""', '', 200, 0)
    for (let i = 0; i < pros.length; i++) nomesProf[pros[i].id] = pros[i].getString('nome')
    const nomeItem = nomesProf[item.getString('profissional')] || ''
    const nomePlanejamento = planejamento.getString('profissional')
    if (nomeItem && nomePlanejamento && nomeItem.toLowerCase() !== nomePlanejamento.toLowerCase()) {
      throw new BadRequestError(
        'A reserva é de outro profissional (' +
          nomeItem +
          ') — escolha um horário do mesmo dentista.',
        null,
      )
    }
    // item livre: nenhum outro planejamento ligado a ele
    const ocupados = $app.findRecordsByFilter(
      'planejamentos',
      'agenda_item = "' + itemId + '"',
      '',
      1,
      0,
    )
    if (ocupados.length > 0) {
      throw new BadRequestError('Este horário já está ligado a outro planejamento.', null)
    }

    // minutos reservados = duração do item (fim − início)
    const paraMin = function (hhmm) {
      const p = String(hhmm || '0:0').split(':')
      return Number(p[0]) * 60 + Number(p[1])
    }
    const minutosReservados = Math.max(
      0,
      paraMin(item.getString('fim')) - paraMin(item.getString('inicio')),
    )
    const minutosSugeridos = planejamento.getInt('minutos_sugeridos')

    planejamento.set('agenda_item', itemId)
    planejamento.set('minutos_reservados', minutosReservados)
    planejamento.set('situacao', 'reservado')
    planejamento.set(
      'criado_por',
      planejamento.getString('crc') || (e.auth ? String(e.auth.getString('email') || '') : ''),
    )
    $app.save(planejamento)

    // RN-04: diferença (usa o tempo sugerido JÁ ARREDONDADO) → desvio sem_motivo
    let desvioId = ''
    if (minutosSugeridos > 0 && minutosReservados !== minutosSugeridos) {
      const col = $app.findCollectionByNameOrId('desvios_duracao')
      const desvio = new Record(col)
      desvio.set('planejamento', planejamentoId)
      desvio.set('minutos_sugeridos', minutosSugeridos)
      desvio.set('minutos_reservados', minutosReservados)
      desvio.set('diferenca', minutosReservados - minutosSugeridos)
      desvio.set('situacao', 'sem_motivo')
      desvio.set('crc', e.auth ? String(e.auth.getString('email') || '') : '')
      desvio.set('teste', planejamento.getBoolean('teste') || item.getBoolean('teste'))
      $app.save(desvio)
      desvioId = desvio.id
    }

    return e.json(200, {
      ok: true,
      situacao: 'reservado',
      minutos_reservados: minutosReservados,
      desvio_id: desvioId,
      demonstracao: true,
    })
  },
  $apis.requireAuth(),
)

// CA-1-10 — CRC registra o motivo do desvio → justificado.
routerAdd(
  'POST',
  '/backend/v1/duracao/motivo-desvio',
  (e) => {
    const body = e.requestInfo().body || {}
    const desvioId = String(body.desvio || '')
    const motivoTipo = String(body.motivo_tipo || '').trim()
    const motivo = String(body.motivo || '').trim()
    if (!desvioId) throw new BadRequestError('Informe o desvio.', null)
    if (['grade do profissional', 'outro'].indexOf(motivoTipo) < 0) {
      throw new BadRequestError('Escolha o tipo de motivo.', null)
    }
    if (!motivo) throw new BadRequestError('O motivo é obrigatório para fechar o desvio.', null)
    let desvio
    try {
      desvio = $app.findRecordById('desvios_duracao', desvioId)
    } catch (_) {
      throw new BadRequestError('Desvio não encontrado.', null)
    }
    if (desvio.getString('situacao') === 'revisado') {
      throw new BadRequestError('Desvio já revisado pela gestão — não pode ser alterado.', null)
    }
    desvio.set('motivo_tipo', motivoTipo)
    desvio.set('motivo', motivo)
    desvio.set('situacao', 'justificado')
    $app.save(desvio)
    return e.json(200, { ok: true, situacao: 'justificado' })
  },
  $apis.requireAuth(),
)

// Gestão revisa o desvio → revisado (CA-1-10).
routerAdd(
  'POST',
  '/backend/v1/duracao/revisar-desvio',
  (e) => {
    const body = e.requestInfo().body || {}
    const desvioId = String(body.desvio || '')
    if (!desvioId) throw new BadRequestError('Informe o desvio.', null)
    let desvio
    try {
      desvio = $app.findRecordById('desvios_duracao', desvioId)
    } catch (_) {
      throw new BadRequestError('Desvio não encontrado.', null)
    }
    if (desvio.getString('situacao') !== 'justificado') {
      throw new BadRequestError('Só desvio com motivo pode ser revisado.', null)
    }
    desvio.set('situacao', 'revisado')
    desvio.set('revisado_por', e.auth ? String(e.auth.getString('email') || '') : '')
    desvio.set('revisado_em', new Date().toISOString())
    $app.save(desvio)
    return e.json(200, { ok: true, situacao: 'revisado' })
  },
  $apis.requireAuth(),
)

// CA-1-11 — conciliação (RN-05/RN-06), on-demand (modo demonstrativo, sem cron).
// RN-05: APPOINTMENT sem planejamento ligado → reservas_sem_planejamento.
// RN-06: planejamento "planejado" de dias anteriores sem reserva → reserva_nao_encontrada.
routerAdd(
  'POST',
  '/backend/v1/duracao/conciliar',
  (e) => {
    const body = e.requestInfo().body || {}
    const hoje = new Date().toISOString().slice(0, 10)
    const teste = body.teste === true

    // RN-05: consultas (não canceladas/excluídas) sem planejamento ligado
    const itens = $app.findRecordsByFilter(
      'agenda_itens',
      'item_tipo = "APPOINTMENT" && cancelado != true && excluido != true',
      '-data',
      500,
      0,
    )
    const comPlanejamento = {}
    const pls = $app.findRecordsByFilter('planejamentos', 'agenda_item != ""', '', 500, 0)
    for (let i = 0; i < pls.length; i++) {
      comPlanejamento[pls[i].getString('agenda_item')] = true
    }
    const semPlanejamento = []
    for (let i = 0; i < itens.length; i++) {
      if (!comPlanejamento[itens[i].id]) {
        semPlanejamento.push({
          agenda_item_id: itens[i].id,
          paciente: itens[i].getString('paciente_nome'),
          data: itens[i].getString('data'),
          hora: itens[i].getString('inicio'),
          teste: itens[i].getBoolean('teste'),
        })
      }
    }

    // RN-06: planejamentos "planejado" (sem reserva) criados em dia ANTERIOR a hoje
    const atrasados = []
    const pendentes = $app.findRecordsByFilter(
      'planejamentos',
      'situacao = "planejado"',
      '-created',
      500,
      0,
    )
    for (let i = 0; i < pendentes.length; i++) {
      const criadoEm = String(pendentes[i].getString('created') || '').slice(0, 10)
      if (criadoEm && criadoEm < hoje) {
        pendentes[i].set('situacao', 'reserva_nao_encontrada')
        $app.save(pendentes[i])
        atrasados.push({
          planejamento_id: pendentes[i].id,
          criado_em: criadoEm,
          teste: pendentes[i].getBoolean('teste'),
        })
      }
    }

    return e.json(200, {
      hoje: hoje,
      reservas_sem_planejamento: semPlanejamento,
      reserva_nao_encontrada: atrasados,
      teste: teste,
    })
  },
  $apis.requireAuth(),
)
