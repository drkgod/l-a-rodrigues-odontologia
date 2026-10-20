// Emenda CA-SEQ-01 — serviços do avaliador/plano de tratamento (SPEC-1-003).
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface AvaliadorHabilitado {
  id: string
  name: string
  email: string
  papel: string
  ativo: boolean
  avaliador_habilitado: boolean
}

export interface PlanoProjetado {
  tem_plano: boolean
  plano_id?: string
  versao?: number
  estado?: string
  avaliador_id?: string
  avaliador_nome?: string
}

export interface ResultadoAtribuicao {
  ok: boolean
  plano_id: string
  versao: number
  estado: string
  avaliador_id: string
}

// Dentistas da unidade (gestão vê todos os usuários; filtro no cliente).
export async function listarDentistas(): Promise<AvaliadorHabilitado[]> {
  try {
    return await pb.collection<AvaliadorHabilitado>('users').getFullList({
      filter: "papel = 'dentista'",
      sort: 'name',
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar os dentistas.')
  }
}

// Gestão alterna a flag de habilitação (updateRule da coleção users garante no servidor).
export async function alternarHabilitacao(id: string, habilitado: boolean): Promise<void> {
  try {
    await pb.collection('users').update(id, { avaliador_habilitado: habilitado })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível alterar a habilitação.')
  }
}

// Gestão designa o avaliador do paciente (rota do hook; guarda de versão no servidor).
export async function atribuirAvaliador(
  pacienteId: string,
  avaliadorId: string,
  versaoEsperada?: number,
  teste = false,
): Promise<ResultadoAtribuicao> {
  try {
    return await pb.send('/backend/v1/tratamento/atribuir-avaliador', {
      method: 'POST',
      body: {
        paciente_id: pacienteId,
        avaliador_id: avaliadorId,
        versao_esperada: versaoEsperada,
        teste,
      },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível designar o avaliador.')
  }
}

// Projeção mínima do plano (status operacional — sem prontuário).
export async function obterPlano(pacienteId: string): Promise<PlanoProjetado> {
  try {
    return await pb.send(
      '/backend/v1/tratamento/plano?paciente_id=' + encodeURIComponent(pacienteId),
    )
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível consultar o plano.')
  }
}

// Limpeza da massa de teste (provas P3-09c) — rota do servidor.
export async function limparMassaTratamento(): Promise<void> {
  try {
    await pb.send('/backend/v1/tratamento/limpar-massa-teste', { method: 'POST' })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível limpar a massa de teste.')
  }
}
