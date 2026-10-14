// Task a9f9e30e — serviços das regras de confirmação e liberação (SPEC-1-004).
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface ContatoConfirmacao {
  id: string
  agenda_item: string
  estado: string
  responsavel: string
  turno: string
  versao_contato: number
  teste: boolean
}

export interface ResultadoRegistro {
  situacao: string
  id?: string
  estado?: string
  chave?: string
}

export async function registrarMensagem(
  contatoId: string,
  tentativa: number,
  resultado: 'enviada' | 'falhou',
  teste = false,
): Promise<ResultadoRegistro> {
  try {
    return await pb.send('/backend/v1/confirmacao/registrar-mensagem', {
      method: 'POST',
      body: { contato: contatoId, tentativa, resultado, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível registrar a mensagem.')
  }
}

export async function registrarLigacao(
  contatoId: string,
  resultado: string,
  teste = false,
): Promise<ResultadoRegistro> {
  try {
    return await pb.send('/backend/v1/ligacao/registrar', {
      method: 'POST',
      body: { contato: contatoId, resultado, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível registrar a ligação.')
  }
}

export async function registrarResposta(
  contatoId: string,
  resposta: 'confirmou' | 'pediu_remarcacao' | 'cancelou' | 'sem_resposta',
  teste = false,
): Promise<ResultadoRegistro> {
  try {
    return await pb.send('/backend/v1/confirmacao/registrar', {
      method: 'POST',
      body: { contato: contatoId, resposta, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível registrar a resposta.')
  }
}

export interface ResultadoMoverNaoRespondentes {
  situacao: string
  movidos: number
  cobertura_a_definir: string[]
  alerta_gestao: string
}

export async function moverNaoRespondentes(data: string): Promise<ResultadoMoverNaoRespondentes> {
  try {
    return await pb.send('/backend/v1/confirmacao/mover-nao-respondentes', {
      method: 'POST',
      body: { data },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível mover os não respondentes.')
  }
}

export interface ResultadoCapacidade {
  situacao: 'permitido' | 'bloqueado' | 'regra_nao_validada'
  mensagem?: string
  permitido: boolean
  ocupacoes?: number
  limite?: number | null
  duracao_minutos?: number
}

// CA-1-21 — verificar capacidade antes de planejar/ofertar.
export async function verificarCapacidade(
  data: string,
  hora: string,
  profissionalId: string,
  tipo: 'avaliacao' | 'horario_marcado' | 'ordem_chegada',
  teste = false,
): Promise<ResultadoCapacidade> {
  try {
    return await pb.send('/backend/v1/capacidade/verificar', {
      method: 'POST',
      body: { data, hora, profissional: profissionalId, tipo, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível verificar a capacidade.')
  }
}

export interface ResultadoLiberacao {
  situacao: string
  liberacao_id?: string
  estado?: string
  proximo_passo?: string
}

// CA-1-20 — decisão de liberação (o gate roda no servidor; recusa volta como erro).
export async function decidirLiberacao(
  agendaItemId: string,
  motivo: 'cancelamento' | 'remarcacao' | 'ligacao_sem_sucesso',
  opcoes?: { teste?: boolean; agora?: string },
): Promise<ResultadoLiberacao> {
  try {
    return await pb.send('/backend/v1/liberacao/decidir', {
      method: 'POST',
      body: {
        agenda_item: agendaItemId,
        motivo,
        teste: opcoes?.teste === true,
        agora: opcoes?.agora || '',
      },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível decidir a liberação.')
  }
}

// Helpers de massa de prova (marca teste=true; limpeza apaga por teste=true).
export async function criarContatoTeste(agendaItemId: string): Promise<ContatoConfirmacao> {
  return pb.collection('contatos_confirmacao').create({
    agenda_item: agendaItemId,
    estado: 'pendente',
    teste: true,
  })
}

export async function limparMassaConfirmacao(): Promise<void> {
  const colecoes = [
    'ofertas',
    'ligacoes',
    'mensagens_confirmacao',
    'contatos_confirmacao',
    'liberacoes',
    'politicas_agenda',
  ]
  for (const nome of colecoes) {
    const registros = await pb
      .collection(nome)
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    for (const r of registros) {
      await pb
        .collection(nome)
        .delete(r.id)
        .catch(() => {})
    }
  }
}
