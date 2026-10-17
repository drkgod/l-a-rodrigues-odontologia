// Task 35bff70c — serviços da ficha do paciente (SPEC-1-003, CA-1-16).
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface EventoFicha {
  id: string
  paciente: string
  lead: string
  tipo: string
  descricao: string
  autor: string
  criado_em: string
  teste: boolean
}

export interface PacienteFicha {
  id: string
  nome: string
  telefone: string
  paciente_clinicorp_id: string
  lead: string
  responsavel: string
  proxima_acao: string
  proxima_acao_prazo: string
  proxima_acao_responsavel: string
  teste: boolean
}

export const ROTULO_EVENTO: Record<string, string> = {
  contato: 'Contato',
  resultado_contato: 'Resultado do contato',
  mudanca_etapa: 'Mudança de etapa',
  nota: 'Nota',
  combinado_avaliacao: 'Combinado da avaliação',
  falta: 'Falta',
  chegada: 'Chegada',
  liberacao: 'Liberação',
  oferta: 'Oferta',
  importacao: 'Importação',
}

// Prazo vencido: comparação por DATA (dia civil), não UTC (lição AP 13/10).
export function prazoVencido(prazo: string): boolean {
  if (!prazo) return false
  const dia = prazo.slice(0, 10)
  const hoje = new Date()
  const hojeDia =
    hoje.getFullYear() +
    '-' +
    String(hoje.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(hoje.getDate()).padStart(2, '0')
  return dia < hojeDia
}

export async function listarPacientes(busca = ''): Promise<PacienteFicha[]> {
  try {
    const filtro = busca.trim()
      ? pb.filter('nome ~ {:q} || telefone ~ {:q}', { q: busca.trim() })
      : ''
    return await pb.collection<PacienteFicha>('pacientes').getFullList({
      filter: filtro,
      sort: 'nome',
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar as fichas.')
  }
}

export async function buscarPaciente(id: string): Promise<PacienteFicha> {
  try {
    return await pb.collection<PacienteFicha>('pacientes').getOne(id)
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível abrir a ficha.')
  }
}

export async function listarEventos(pacienteId: string): Promise<EventoFicha[]> {
  try {
    return await pb.collection<EventoFicha>('eventos').getFullList({
      filter: pb.filter('paciente = {:p} || lead = {:p}', { p: pacienteId }),
      sort: '-created',
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar o histórico.')
  }
}

export async function registrarEvento(dados: {
  paciente?: string
  lead?: string
  tipo: string
  descricao: string
  teste?: boolean
}): Promise<{ ok: boolean; evento_id: string }> {
  try {
    return await pb.send('/backend/v1/ficha/evento', { method: 'POST', body: dados })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível registrar o evento.')
  }
}

export async function salvarProximaAcao(
  pacienteId: string,
  acao: string,
  prazo: string,
  responsavelAcao: string,
): Promise<{ ok: boolean }> {
  try {
    return await pb.send('/backend/v1/ficha/proxima-acao', {
      method: 'POST',
      body: {
        paciente: pacienteId,
        proxima_acao: acao,
        proxima_acao_prazo: prazo,
        proxima_acao_responsavel: responsavelAcao,
      },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar a próxima ação.')
  }
}

// Papéis que podem gravar (espelha o hook; a regra real é do servidor).
export function podeGravarFicha(papel: string): boolean {
  return (
    papel === 'gestao' ||
    papel === 'crc_agendamento' ||
    papel === 'crc_confirmacao' ||
    papel === 'crc_comercial'
  )
}
