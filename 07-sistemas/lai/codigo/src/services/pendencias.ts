import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface Pendencia {
  id: string
  paciente_nome: string
  telefone: string
  procedimento: string
  profissional: string
  situacao_execucao: 'a_agendar' | 'executada' | 'aguardando_condicao'
  motivo_condicao: string
  agendamento_futuro_verificado: boolean
  disponibilidade_1: string
  disponibilidade_2: string
  prontidao: 'pronto' | 'aguardando_condicao'
  motivo_revisao: string
  origem: 'arquivo' | 'manual' | 'fixture'
  origem_arquivo: string
  teste: boolean
  created: string
}

export interface ResultadoImportacaoPendencias {
  lidas: number
  gravadas: number
  duplicadas: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
}

export async function listarPendencias(): Promise<Pendencia[]> {
  return pb.collection<Pendencia>('pendencias').getFullList({ sort: '-created' })
}

export async function importarPendencias(
  csv: string,
  nomeArquivo: string,
  teste = false,
): Promise<ResultadoImportacaoPendencias> {
  try {
    return await pb.send('/backend/v1/pendencias/importar', {
      method: 'POST',
      body: { csv, nome_arquivo: nomeArquivo, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível importar o arquivo.')
  }
}

export async function mudarEstadoPendencia(
  id: string,
  situacao: 'a_agendar' | 'executada' | 'aguardando_condicao',
  motivo = '',
): Promise<void> {
  try {
    await pb.send('/backend/v1/pendencias/estado', {
      method: 'POST',
      body: { id, situacao, motivo },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível mudar o estado.')
  }
}

export async function verificarAgendamentoFuturo(id: string): Promise<boolean> {
  try {
    const r = await pb.send<{ ok: boolean; agendamento_futuro: boolean }>(
      '/backend/v1/pendencias/verificar-agendamento',
      { method: 'POST', body: { id } },
    )
    return r.agendamento_futuro
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível verificar o agendamento.')
  }
}

export async function atualizarPendencia(
  id: string,
  campos: {
    disponibilidade_1?: string
    disponibilidade_2?: string
    prontidao?: string
    motivo_revisao?: string
  },
): Promise<void> {
  await pb.collection('pendencias').update(id, campos)
}

// Lista de pacientes a agendar (CA-1-14/15):
// - aAgendar: pendências ativas + leads aguardando horário + faltas
// - agendado: pendência com agendamento futuro VERIFICADO
// - paraRevisao: prontidão != pronto (com motivo) — nunca elegível de encaixe
export interface ListaPacientes {
  aAgendar: Pendencia[]
  agendado: Pendencia[]
  paraRevisao: Pendencia[]
}

export function montarLista(pendencias: Pendencia[]): ListaPacientes {
  const aAgendar: Pendencia[] = []
  const agendado: Pendencia[] = []
  const paraRevisao: Pendencia[] = []
  for (const p of pendencias) {
    if (p.situacao_execucao === 'executada') continue
    if (p.agendamento_futuro_verificado) {
      agendado.push(p)
      continue
    }
    if (p.prontidao !== 'pronto' || p.situacao_execucao === 'aguardando_condicao') {
      const copia = { ...p }
      if (!copia.motivo_revisao && p.situacao_execucao === 'aguardando_condicao') {
        copia.motivo_revisao = p.motivo_condicao || 'aguardando condição'
      }
      if (!copia.motivo_revisao) {
        copia.motivo_revisao = 'aguarda sequência/liberação do avaliador'
      }
      paraRevisao.push(copia)
      continue
    }
    aAgendar.push(p)
  }
  return { aAgendar, agendado, paraRevisao }
}
