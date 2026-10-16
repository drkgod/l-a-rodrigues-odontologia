import { BaseAuthStore } from 'pocketbase'
import PocketBase from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { aplicarLote, validarLote } from '@/services/agenda'
import { aprovarTabelaDuracao, importarTabelaDuracao } from '@/services/duracao'
import {
  agruparSemRegra,
  conciliarReservas,
  ligarReserva,
  limparPlanejamentosTeste,
  listarDesvios,
  revisarDesvio,
  registrarMotivoDesvio,
  sugerirDuracao,
  validarCombinacao,
  type Planejamento,
} from '@/services/planejamento'
import {
  importarPendencias,
  listarPendencias,
  montarLista,
  mudarEstadoPendencia,
  verificarAgendamentoFuturo,
  type Pendencia,
} from '@/services/pendencias'
import { criarLead } from '@/services/leads'
import {
  decidirLiberacao,
  dividirSaidas,
  exportarXlsx,
  gerarListaDia,
  limparMassaConfirmacao,
  registrarLigacao,
  registrarMensagem,
  verificarCapacidade,
} from '@/services/confirmacao'

export interface ExecucaoProva {
  id: string
  spec: string
  cenario: string
  esperado: string
  obtido: string
  passou: boolean
  executado_por: string
  executado_em: string
  observacao: string
}

export interface ResultadoProva {
  cenario: string
  esperado: string
  obtido: string
  passou: boolean
  observacao: string
}

export async function listarExecucoes(spec: string): Promise<ExecucaoProva[]> {
  return pb
    .collection<ExecucaoProva>('provas_execucoes')
    .getFullList({ filter: pb.filter('spec = {:spec}', { spec }), sort: '-created' })
}

export async function registrarExecucao(
  resultado: ResultadoProva,
  spec = 'SPEC-1-001',
): Promise<void> {
  await pb.collection('provas_execucoes').create({
    spec,
    cenario: resultado.cenario,
    esperado: resultado.esperado,
    obtido: resultado.obtido,
    passou: resultado.passou,
    executado_por: pb.authStore.record?.email ?? '',
    executado_em: new Date().toISOString(),
    observacao: resultado.observacao,
  })
}

export async function limparExecucoes(spec = 'SPEC-1-001'): Promise<void> {
  const execucoes = await listarExecucoes(spec)
  for (const execucao of execucoes) {
    await pb.collection('provas_execucoes').delete(execucao.id)
  }
}

// Cliente de prova com armazenamento EM MEMÓRIA: nunca herda nem toca a sessão
// do navegador (causa da falha anterior — o "anônimo" lia como admin logado).
class MemoriaStore extends BaseAuthStore {}

const clienteProva = (): PocketBase => {
  const cliente = new PocketBase JS client, new MemoriaStore())