// ADIÇÕES ao src/services/provas.ts (rascunho — aplicar por patch no Skip)
// Import extra no topo: agruparSemRegra, validarCombinacao, type Planejamento de '@/services/planejamento'
// Botão novo na Provas.tsx: "P2-05 (agrupar/validar)" com spec 'SPEC-1-002'.

// P2-05 — casos sem regra agrupados e validação pela direção (CA-1-09)
export async function executarProvaP2_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    // duas ocorrências da MESMA combinação + uma combinação diferente
    const combo = [
      { grupo_regra: 'FACETAS_PROVA_P2', quantidade: 10 },
      { grupo_regra: GRUPO_COROAS, quantidade: 1 },
    ]
    await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    await sugerirDuracao([{ grupo_regra: GRUPO_COROAS, quantidade: 7 }], 'Profissional Teste P2 A', true)

    const pendentes = await pb
      .collection<Planejamento>('planejamentos')
      .getFullList({ filter: 'situacao = "sem_regra" && teste = true' })
    const grupos = agruparSemRegra(pendentes)
    const alvo = grupos.find((g) => g.ocorrencias === 2)
    if (!alvo || grupos.length !== 2) {
      throw new Error('agrupamento inesperado: ' + grupos.length + ' grupo(s)')
    }

    await validarCombinacao(alvo.ids)

    const depois = await pb
      .collection<Planejamento>('planejamentos')
      .getFullList({ filter: 'situacao = "sem_regra" && teste = true' })
    const restantes = agruparSemRegra(depois)
    const marcados = depois.filter((p) => alvo.ids.indexOf(p.id) >= 0)
    const comAutoria = marcados.every((p) => p.validado_em && p.validado_por)
    passou =
      restantes.length === 1 && restantes[0].ocorrencias === 1 && comAutoria && marcados.length === 2
    detalhe =
      `antes: ${grupos.length} grupos (repetida com ${alvo.ocorrencias} ocorrências); ` +
      `depois de validar: ${restantes.length} pendente(s) com ${restantes[0]?.ocorrencias ?? 0}; ` +
      `validado_por/em gravados nos 2: ${comAutoria}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
    // planejamentos de teste (nunca dado real)
    const ps = await pb
      .collection('planejamentos')
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    for (const p of ps) await pb.collection('planejamentos').delete(p.id).catch(() => {})
  }
  return {
    cenario: 'P2-05 — agrupar sem regra e validar com a direção',
    esperado:
      '2 ocorrências iguais viram 1 grupo com contagem 2; ao validar, saem dos pendentes com validado_por/em gravados; a outra combinação segue pendente.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-09 provado (agrupamento + validação).' : 'Verificar agrupamento/validação.',
  }
}
