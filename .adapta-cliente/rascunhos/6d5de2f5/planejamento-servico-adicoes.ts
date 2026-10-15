// ADIÇÕES ao src/services/planejamento.ts (rascunho — aplicar por patch no Skip)
// 1) Interface Planejamento ganha dois campos opcionais:
//    validado_por?: string
//    validado_em?: string
// 2) descreverItens move de Planejar.tsx para cá (exportada) — fonte única da
//    descrição da combinação, usada pela tela e pelo agrupamento.
// 3) Novas funções exportadas:

export interface GrupoSemRegra {
  chave: string // descrição da combinação + profissional
  descricao: string // "10× FACETAS + 1× COROAS"
  profissional: string
  ocorrencias: number
  ultima: string // created do mais recente do grupo
  ids: string[] // planejamentos da combinação (para validar em lote)
}

// Agrupa pendentes (sem_regra e validado_em vazio) por combinação+profissional.
// O que repete mais vem primeiro; empate = ocorrência mais recente primeiro.
export function agruparSemRegra(lista: Planejamento[]): GrupoSemRegra[] {
  const mapa = new Map<string, GrupoSemRegra>()
  for (const p of lista) {
    if (p.situacao !== 'sem_regra' || p.validado_em) continue
    const descricao = descreverItens(p.itens)
    const chave = descricao + '|' + (p.profissional || '')
    const atual = mapa.get(chave)
    if (atual) {
      atual.ocorrencias += 1
      atual.ids.push(p.id)
      if (p.created > atual.ultima) atual.ultima = p.created
    } else {
      mapa.set(chave, {
        chave,
        descricao,
        profissional: p.profissional || '',
        ocorrencias: 1,
        ultima: p.created,
        ids: [p.id],
      })
    }
  }
  return Array.from(mapa.values()).sort(
    (a, b) => b.ocorrencias - a.ocorrencias || (a.ultima < b.ultima ? 1 : -1),
  )
}

// Validação da direção: grava validado_por (e-mail da sessão) e validado_em
// em TODOS os planejamentos da combinação. Permissão real é a updateRule da
// coleção (só gestão) — não há como escalar por aqui.
export async function validarCombinacao(ids: string[]): Promise<void> {
  const por = pb.authStore.record?.email ?? ''
  const em = new Date().toISOString().replace('T', ' ').slice(0, 19) + '.000Z'
  for (const id of ids) {
    await pb.collection('planejamentos').update(id, { validado_por: por, validado_em: em })
  }
}

// descreverItens (movida de Planejar.tsx, comportamento idêntico):
// PocketBase devolve campo JSON PARSEADO (array de objetos) — aceitar array ou texto.
export function descreverItens(
  valor: Array<{ grupo_regra: string; quantidade: number }> | string,
): string {
  let itens: Array<{ grupo_regra: string; quantidade: number }>
  if (Array.isArray(valor)) {
    itens = valor
  } else {
    try {
      itens = JSON.parse(valor) as Array<{ grupo_regra: string; quantidade: number }>
    } catch {
      return String(valor)
    }
  }
  return itens.map((i) => `${i.quantidade}× ${i.grupo_regra}`).join(' + ')
}
