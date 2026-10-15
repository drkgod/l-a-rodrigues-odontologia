import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface ItemSugestao {
  grupo_regra: string
  quantidade: number
  quantidade2?: number
}

export interface RegraAplicada {
  grupo_regra: string
  aplica_a: string
  faixa_1: string
  faixa_2: string
  profissional: string
  observacao: string
}

export interface ResultadoSugestao {
  situacao: 'ok' | 'sem_regra'
  mensagem: string
  minutos: number
  minutos_brutos: number
  arredondamento: number
  regra_aplicada: RegraAplicada | null
  origem_tabela: string
  capacidade_validada: boolean
  planejamento_id: string
}

export interface ItemPlanejamento {
  grupo_regra: string
  quantidade: number
  quantidade2?: number
}

// PocketBase devolve campo JSON PARSEADO (array), não como texto.
export interface Planejamento {
  id: string
  profissional: string
  itens: ItemPlanejamento[] | string
  minutos_sugeridos: number
  situacao: 'sugerido' | 'sem_regra'
  regra_aplicada: string
  crc: string
  teste: boolean
  // validação da direção (task 6d5de2f5): quem e quando marcou como validado
  validado_por?: string
  validado_em?: string
  created: string
}

export interface GrupoAtivo {
  grupo_regra: string
  aplica_a: string
  variavel_1: string
  variavel_2: string
}

export interface GrupoSemRegra {
  chave: string // descrição da combinação + profissional
  descricao: string // "10× FACETAS + 1× COROAS"
  profissional: string
  ocorrencias: number
  ultima: string // created do mais recente do grupo
  ids: string[] // planejamentos da combinação (para validar em lote)
}

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

export async function sugerirDuracao(
  itens: ItemSugestao[],
  profissional: string,
  teste = false,
): Promise<ResultadoSugestao> {
  try {
    return await pb.send('/backend/v1/duracao/sugerir', {
      method: 'POST',
      body: { itens, profissional, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível consultar o tempo sugerido.')
  }
}

export async function listarPlanejamentos(): Promise<Planejamento[]> {
  return pb.collection<Planejamento>('planejamentos').getFullList({ sort: '-created' })
}

// Grupos disponíveis na tabela ATIVA (sem as de teste) — alimenta o dropdown.
export async function listarGruposAtivos(): Promise<GrupoAtivo[]> {
  const tabelas = await pb
    .collection<{ id: string; ativa: boolean; teste: boolean }>('tabela_duracao')
    .getFullList({ filter: 'ativa = true && teste != true', sort: '-created' })
  if (tabelas.length === 0) return []
  const regras = await pb
    .collection<{
      grupo_regra: string
      aplica_a: string
      variavel_1: string
      variavel_2: string
    }>('regras_duracao')
    .getFullList({
      filter: pb.filter('tabela = {:id}', { id: tabelas[0].id }),
      sort: 'grupo_regra',
    })
  // Um grupo pode ter nomes diferentes por regra (ex.: SISOS_COMBO = "Extração
  // de 4 sisos na mesma consulta" na regra de grupo e "COMBO 4 SISOS" nas
  // específicas por dentista): o label junta os nomes distintos na ordem da tabela.
  const porGrupo = new Map<string, GrupoAtivo>()
  for (const r of regras) {
    const atual = porGrupo.get(r.grupo_regra)
    if (!atual) {
      porGrupo.set(r.grupo_regra, {
        grupo_regra: r.grupo_regra,
        aplica_a: r.aplica_a || r.grupo_regra,
        variavel_1: r.variavel_1,
        variavel_2: r.variavel_2,
      })
    } else if (r.aplica_a && atual.aplica_a.indexOf(r.aplica_a) < 0) {
      atual.aplica_a = atual.aplica_a + ' / ' + r.aplica_a
    }
  }
  return Array.from(porGrupo.values())
}

// Limpeza de provas: apaga planejamentos de teste (nunca dado real).
export async function limparPlanejamentosTeste(): Promise<void> {
  const lista = await pb.collection('planejamentos').getFullList({ filter: 'teste = true' })
  for (const p of lista) {
    await pb
      .collection('planejamentos')
      .delete(p.id)
      .catch(() => {})
  }
}
