// Emenda CA-SEQ-03 — serviços do editor de etapas do plano (SPEC-1-003).
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { EtapaModelo, ModeloSequencia } from '@/services/modelos'

export interface EtapaPlano extends EtapaModelo {
  estado_etapa: 'pendente' | 'liberada' | 'concluida'
}

export interface PlanoCompleto {
  id: string
  paciente: string
  avaliador: string
  versao: number
  estado: 'rascunho' | 'aprovado' | 'em_revisao' | 'encerrado'
  etapas: EtapaPlano[]
  motivo_ajuste: string
  aprovado_por: string
  aprovado_em: string
  teste: boolean
}

export interface ResultadoPlano {
  ok: boolean
  plano_id: string
  versao: number
  estado: string
  etapas?: number
}

// Lê o plano COM as etapas (leituraPlano da coleção já garante quem vê).
export async function obterPlanoCompleto(pacienteId: string): Promise<PlanoCompleto | null> {
  try {
    const lista = await pb.collection('planos_tratamento').getFullList({
      filter: pb.filter('paciente = {:id}', { id: pacienteId }),
    })
    if (lista.length === 0) return null
    const r = lista[0] as unknown as Record<string, unknown>
    let etapas: EtapaPlano[] = []
    const bruto = r.etapas
    if (typeof bruto === 'string') {
      try {
        etapas = JSON.parse(bruto) as EtapaPlano[]
      } catch {
        etapas = []
      }
    } else if (Array.isArray(bruto)) {
      etapas = bruto as EtapaPlano[]
    }
    return {
      id: String(r.id || ''),
      paciente: String(r.paciente || ''),
      avaliador: String(r.avaliador || ''),
      versao: Number(r.versao || 1),
      estado: (r.estado as PlanoCompleto['estado']) || 'rascunho',
      etapas,
      motivo_ajuste: String(r.motivo_ajuste || ''),
      aprovado_por: String(r.aprovado_por || ''),
      aprovado_em: String(r.aprovado_em || ''),
      teste: r.teste === true,
    }
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar o plano.')
  }
}

// Salva as etapas (manual ou copiadas de modelo) — rota valida sessão/grafo/versão.
export async function salvarEtapas(dados: {
  paciente_id: string
  versao_esperada?: number
  etapas: EtapaPlano[]
  motivo_ajuste?: string
  origem?: 'manual' | 'modelo'
  modelo_id?: string
}): Promise<ResultadoPlano> {
  try {
    return await pb.send('/backend/v1/tratamento/plano-salvar', { method: 'POST', body: dados })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar as etapas.')
  }
}

// Aprova as etapas do plano — rota valida avaliador atribuído + ≥1 etapa.
export async function aprovarPlano(
  pacienteId: string,
  versaoEsperada?: number,
): Promise<ResultadoPlano> {
  try {
    return await pb.send('/backend/v1/tratamento/plano-aprovar', {
      method: 'POST',
      body: { paciente_id: pacienteId, versao_esperada: versaoEsperada },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível aprovar as etapas.')
  }
}

// Modelos APROVADOS disponíveis pra copiar (o editor só oferece estes).
export async function listarModelosAprovados(): Promise<ModeloSequencia[]> {
  try {
    const lista = await pb.collection('modelos_sequencia').getFullList({
      filter: "estado = 'aprovado'",
      sort: '-created',
    })
    return lista
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar os modelos.')
  }
}
