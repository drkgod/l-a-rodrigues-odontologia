t item of itens)
    await pb
      .collection('agenda_itens')
      .delete(item.id)
      .catch(() => {})
  const pros = await pb
    .collection('profissionais')
    .getFullList({ filter: 'origem = "fixture" && nome ~ "P4-0"' })
    .catch(() => [])
  for (const p of pros)
    await pb
      .collection('profissionais')
      .delete(p.id)
      .catch(() => {})
}

// P4-01 — lista do dia-alvo: 4 consultas (3 telefone válido, 1 inválida) →
// contatos pendentes criados, lista em ordem de horário, idempotente na 2ª geração.
export async function executarProvaP4_01(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const dataAlvo = '2026-10-14'
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4-01',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    const itens = []
    const horarios = ['08:00', '09:00', '10:00', '11:00']
    const telefones = ['5521999991001', '5521999991002', '5521999991003', '119'] // último inválido
    for (let i = 0; i < 4; i++) {
      itens.push(
        await pb.collection('agenda_itens').create({
          item_tipo: 'APPOINTMENT',
          clinicorp_id: 'p4-01-' + i + '-' + Date.now(),
          data: dataAlvo,
          inicio: horarios[i],
          fim: horarios[i].slice(0, 2) === '08' ? '08:30' : horarios[i],
          profissional: prof.id,
          paciente_nome: 'Paciente P4-01-' + i,
          paciente_telefone: telefones[i],
          origem: 'fixture',
          teste: true,
        }),
      )
    }
    const primeira = await gerarListaDia(dataAlvo, true)
    const naLista = primeira.lista.filter((l) => itens.some((it) => it.id === l.agenda_item_id))
    const criadosOk = primeira.contatos_criados >= 4
    const ordenada = naLista.every((l, idx) => idx === 0 || naLista[idx - 1].hora <= l.hora)
    const invalidoMarcado = naLista.some((l) => !l.telefone_valido)
    // idempotência: 2ª geração não duplica contatos
    const segunda = await gerarListaDia(dataAlvo, true)
    const criadosSegunda = segunda.contatos_criados
    passou =
      criadosOk && naLista.length === 4 && ordenada && invalidoMarcado && criadosSegunda === 0
    detalhe =
      '1ª geração: ' +
      naLista.length +
      '/4 na lista, contatos criados ' +
      primeira.contatos_criados +
      ', ordenada por horário ' +
      String(ordenada) +
      ', telefone inválido marcado ' +
      String(invalidoMarcado) +
      '; 2ª geração criou ' +
      criadosSegunda +
      ' (esperado 0)'
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaConfirmacao()
    await limparAgendaTeste()
  }
  return {
    cenario: 'P4-01 — lista de confirmação do dia-alvo (RN-01, idempotente)',
    esperado:
      'Consultas do dia-alvo entram na lista em ordem de horário com contato pendente criado; telefone inválido marcado; 2ª geração não duplica.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-18 provado (lista).' : 'Verificar rota lista-dia.',
  }
}

// P4-02 — exportação: limite de teste 2 → 2 linhas XLSX + 1 envio manual +
// 1 corrigir telefone; exportar NÃO cria tentativa de mensagem (RN-02).
export async function executarProvaP4_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const dataAlvo = '2026-10-14'
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4-02',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    const horarios = ['08:00', '09:00', '10:00', '11:00']
    const telefones = ['5521999992001', '5521999992002', '5521999992003', '119']
    for (let i = 0; i < 4; i++) {
      await pb.collection('agenda_itens').create({
        item_tipo: 'APPOINTMENT',
        clinicorp_id: 'p4-02-' + i + '-' + Date.now(),
        data: dataAlvo,
        inicio: '08:00',
        fim: '08:30',
        profissional: prof.id,
        paciente_nome: 'Paciente P4-02-' + i,
        paciente_telefone: telefones[i],
        origem: 'fixture',
        teste: true,
      })
    }
    const r = await gerarListaDia(dataAlvo, true)
    const limiteTeste = 2
    const saidas = dividirSaidas(r.lista, limiteTeste)
    const xlsxOk = saidas.xlsx.length === limiteTeste
    const manualOk = saidas.envioManual.length === 1
    const corrigirOk = saidas.corrigirTelefone.length === 1
    // exportar não cria tentativa: mensagens_confirmacao de teste antes/depois
    const antes = await pb
      .collection('mensagens_confirmacao')
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    await exportarXlsx(saidas.xlsx, 'prova P4-02')
    const depois = await pb
      .collection('mensagens_confirmacao')
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    const semTentativa = antes.length === depois.length
    passou = xlsxOk && manualOk && corrigirOk && semTentativa
    detalhe =
      'XLSX ' +
      saidas.xlsx.length +
      '/2, envio manual ' +
      saidas.envioManual.length +
      '/1, corrigir telefone ' +
      saidas.corrigirTelefone.length +
      '/1, tentativas criadas pela exportação: ' +
      String(depois.length - antes.length) +
      ' (esperado 0)'
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaConfirmacao()
    await limparAgendaTeste()
  }
  return {
    cenario: 'P4-02 — exportação XLSX com limite (CA-1-18, RN-02)',
    esperado:
      'Com limite 2: 2 linhas no XLSX, 1 em envio manual, 1 em corrigir telefone; exportar não cria tentativa.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-18 provado (exportação).' : 'Verificar saídas da exportação.',
  }
}

// ===== PROVAS P2-01..P2-04 (SPEC-1-002, CA-1-08/09) =====
// Tabela de teste do TDD (teste=true, NUNCA aprovada — a real v2 segue ativa):
// coroa 1–2 = 30 min (grupo) e 3–4 = 40 min p/ Profissional Teste A;
// coroa 1–2 = 25 min e 3–4 = 35 min p/ Profissional Teste B (específica prevalece);
// arredondamento 5.

const GRUPO_COROAS = 'COROAS_PROVA_P2'

// Tabela de teste criada por importação (relation obrigatória) — teste=true,
// NUNCA aprovada; a real v2 segue ativa. Hash constante: a limpeza de cada
// prova apaga a tabela, então a reimportação nunca cai em ja_aplicado.
async function criarTabelaTesteP2(): Promise<string> {
  const csv = [
    'grupo_regra;aplica_a;variavel_1;min_1;max_1;duracao_min;profissional',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;1;2;30;',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;3;4;40;',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;1;2;25;Profissional Teste P2 B',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;3;4;35;Profissional Teste P2 B',
  ].join('\n')
  const bytes = new TextEncoder().encode(csv)
  const digest = await crypto.subtle.digest('SHA-256, bytes)
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const r = await importarTabelaDuracao(new File([csv], 'prova-p2.csv', { type: 'text/csv' }), true)
  // BUG FIX (teste humano P2-05b 3ª rodada, 16/10): reimport com MESMO hash devolve
  // ja_aplicado=true com regras_gravadas=0 (dedup do hook) — a tabela de teste já
  // existe com as 4 regras das execuções anteriores. O que importa é TER a tabela.
  if (r.regras_gravadas !== 4 && !r.ja_aplicado) {
    throw new Error('massa P2: ' + r.regras_gravadas + ' regras')
  }
  void hash
  return r.tabela_id
}

async function apagarMassaP2(): Promise<void> {
  // regras de teste: todas com grupo da prova
  const regras = await pb
    .collection<{ id: string; grupo_regra: string }>('regras_duracao')
    .getFullList({ filter: 'teste = true' })
  for (const r of regras) {
    if (String(r.grupo_regra || '').indexOf('PROVA_P2') >= 0) {
      await pb
        .collection('regras_duracao')
        .delete(r.id)
        .catch(() => {})
    }
  }
  // tabelas de teste (importação marca teste=true)
  const tabelas = await pb
    .collection<{ id: string }>('tabela_duracao')
    .getFullList({ filter: 'teste = true' })
  for (const t of tabelas) {
    await pb
      .collection('tabela_duracao')
      .delete(t.id)
      .catch(() => {})
  }
  const profs = await pb.collection<{ id: string; nome: string }>('profissionais').getFullList()
  for (const p of profs) {
    if (String(p.nome || '').indexOf('Profissional Teste P2') === 0) {
      await pb
        .collection('profissionais')
        .delete(p.id)
        .catch(() => {})
    }
  }
  await limparPlanejamentosTeste()
}

export async function executarProvaP2_01(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 A',
      true,
    )
    detalhe = '2 coroas P2 A → ' + r.situacao + ' ' + r.minutos + ' min'
    passou = r.situacao === 'ok' && r.minutos === 30
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-01 — 2 coroas com Profissional A → 30 min',
    esperado: '30 min pela tabela de teste (coroa 1–2 = 30).',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (linha A).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 4 }],
      'Profissional Teste P2 A',
      true,
    )
    detalhe = '4 coroas P2 A → ' + r.situacao + ' ' + r.minutos + ' min'
    passou = r.situacao === 'ok' && r.minutos === 40
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-02 — 4 coroas com Profissional A → 40 min',
    esperado: '40 min pela tabela de teste (coroa 3–4 = 40) — não linear (não é 2×30).',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (linha B).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_03(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r25 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 B',
      true,
    )
    const r35 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 4 }],
      'Profissional Teste P2 B',
      true,
    )
    detalhe =
      '2 coroas P2 B → ' + r25.situacao + ' ' + r25.minutos + ' min; 4 coroas → ' + r35.minutos
    passou =
      r25.situacao === 'ok' && r25.minutos === 25 && r35.situacao === 'ok' && r35.minutos === 35
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-03 — coroas com Profissional B → 25 e 35 min (específica prevalece)',
    esperado: '25 e 35 min: a regra específica do profissional B prevalece sobre a de grupo.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (não linear + específica).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_04(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [
        { grupo_regra: 'FACETAS_PROVA_P2', quantidade: 10 },
        { grupo_regra: GRUPO_COROAS, quantidade: 1 },
      ],
      'Profissional Teste P2 A',
      true,
    )
    const casos = await pb
      .collection<{ id: string }>('planejamentos')
      .getFullList({ filter: 'situacao = "sem_regra" && teste = true' })
    detalhe = 'combinação → ' + r.situacao + '; casos sem regra: ' + casos.length
    passou = r.situacao === 'sem_regra' && r.minutos === 0 && casos.length >= 1
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-04 — 10 facetas + 1 implante sem regra → sem_regra + caso listado',
    esperado: '"sem regra — validar com a direção", sem tempo, e o caso entra na lista.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-09 provado (sem tempo fictício).' : 'Verificar caso sem regra.',
  }
}

// P2-05 — casos sem regra agrupados e validação pela direção (CA-1-09).
// 2 ocorrências da MESMA combinação viram 1 grupo com contagem; ao validar,
// saem dos pendentes com validado_por/em gravados; a outra combinação segue.
export async function executarProvaP2_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    // defensiva: resíduo de execuções anteriores não contamina a massa desta prova
    await limparPlanejamentosTeste()
    // duas ocorrências da MESMA combinação + uma combinação diferente
    const combo = [
      { grupo_regra: 'FACETAS_PROVA_P2', quantidade: 10 },
      { grupo_regra: GRUPO_COROAS, quantidade: 1 },
    ]
    const r1 = await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    const r2 = await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    const r3 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 7 }],
      'Profissional Teste P2 A',
      true,
    )

    // agrupa EXATAMENTE os 3 planejamentos desta prova (ids devolvidos pela rota):
    // imune a resíduo de outras provas na coleção
    const idsProva = [r1.planejamento_id, r2.planejamento_id, r3.planejamento_id]
    const regs: Planejamento[] = []
    for (const id of idsProva) {
      regs.push(await pb.collection<Planejamento>('planejamentos').getOne(id))
    }
    const grupos = agruparSemRegra(regs)
    const alvo = grupos.find((g) => g.ocorrencias === 2)
    if (!alvo || grupos.length !== 2) {
      throw new Error(
        'agrupamento inesperado: ' +
          grupos.length +
          ' grupo(s) — ' +
          grupos.map((g) => g.descricao + ' x' + g.ocorrencias).join(' | '),
      )
    }

    await validarCombinacao(alvo.ids)

    const depois: Planejamento[] = []
    for (const id of idsProva) {
      depois.push(await pb.collection<Planejamento>('planejamentos').getOne(id))
    }
    const restantes = agruparSemRegra(depois)
    const marcados = depois.filter((p) => alvo.ids.indexOf(p.id) >= 0)
    const comAutoria = marcados.every((p) => p.validado_em && p.validado_por)
    passou =
      restantes.length === 1 &&
      restantes[0].ocorrencias === 1 &&
      comAutoria &&
      marcados.length === 2
    detalhe =
      `antes: ${grupos.length} grupos (repetida com ${alvo.ocorrencias} ocorrências); ` +
      `depois de validar: ${restantes.length} pendente(s) com ${restantes[0]?.ocorrencias ?? 0}; ` +
      `validado_por/em gravados nos 2: ${comAutoria}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-05 — agrupar sem regra e validar com a direção',
    esperado:
      '2 ocorrências iguais viram 1 grupo com contagem 2; ao validar, saem dos pendentes com validado_por/em gravados; a outra combinação segue pendente.',
    obtido: detalhe,
    passou,
    observacao: passou
      ? 'CA-1-09 provado (agrupamento + validação).'
      : 'Verificar agrupamento/validação.',
  }
}

// ===== PROVAS P2-05b/P2-06 (SPEC-1-002, CA-1-10/11) — task fdca5fb0 =====
// Desvio de duração (RN-04) e conciliação de reservas (RN-05/06).
// Massa fixture teste=true, apagada no fim (nunca dado real).

// P2-05b — desvio: planejamento (via rota, createRule null) ligado a item de 60 min
// → sem_motivo; registrar motivo → justificado; gestão revisa → revisado.
// BUG FIX (teste humano 16/10): planejamentos.createRule = null (só o hook cria) —
// criar direto dava "Only superusers can perform this action". A prova usa a rota
// sugerirDuracao(teste=true) com a tabela de teste (coroa 2 = 30 min) e um item de
// 60 min → desvio com diferença +30 (a regra é reservado ≠ sugerido, não o exemplo 40×60).
export async function executarProvaP2_05b(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await limparPlanejamentosTeste()
    await criarTabelaTesteP2()
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P2 B',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    // planejamento de teste VIA ROTA (coroa 2 com o dentista B = 25 min na tabela de teste)
    const sugestao = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 B',
      true,
    )
    if (sugestao.situacao !== 'ok' || !sugestao.planejamento_id) {
      throw new Error('rota sugerir: ' + sugestao.situacao + ' id=' + sugestao.planejamento_id)
    }
    const sugeridos = sugestao.minutos // 25 (regra específica do dentista B)
    // item de agenda de 60 min (diferença +35)
    const item = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p2-05b-' + Date.now(),
      data: '2026-10-14',
      inicio: '09:00',
      fim: '10:00',
      profissional: prof.id,
      paciente_nome