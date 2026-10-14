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
      registro.set('situacao', situacao === 'ok' ? 'sugerido' : 'sem_regra')
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
