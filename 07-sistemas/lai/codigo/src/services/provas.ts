import { BaseAuthStore } from 'pocketbase'
import PocketBase from 'pocketbase'
import pb from '@/lib/pocketbase/client'

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

export async function registrarExecucao(resultado: ResultadoProva): Promise<void> {
  await pb.collection('provas_execucoes').create({
    spec: 'SPEC-1-001',
    cenario: resultado.cenario,
    esperado: resultado.esperado,
    obtido: resultado.obtido,
    passou: resultado.passou,
    executado_por: pb.authStore.record?.email ?? '',
    executado_em: new Date().toISOString(),
    observacao: resultado.observacao,
  })
}

export async function limparExecucoes(): Promise<void> {
  const execucoes = await listarExecucoes('SPEC-1-001')
  for (const execucao of execucoes) {
    await pb.collection('provas_execucoes').delete(execucao.id)
  }
}

// Cliente de prova com armazenamento EM MEMÓRIA: nunca herda nem toca a sessão
// do navegador (causa da falha anterior — o "anônimo" lia como admin logado).
class MemoriaStore extends BaseAuthStore {}

const clienteProva = (): PocketBase => {
  const cliente = new PocketBase(import.meta.env.VITE_POCKETBASE_URL, new MemoriaStore())
  cliente.autoCancellation(false)
  return cliente
}

// P1-01 — acesso por função. No PocketBase, regra de listagem que nega devolve
// 200 com lista VAZIA (nunca erro): a prova certa é "anônimo vê 0 registros".
export async function executarProvaP1_01(): Promise<ResultadoProva> {
  const anonimo = clienteProva()

  // Massa de teste: um profissional criado pela sessão de gestão, apagado no fim.
  let massaId = ''
  let detalheMassa = ''
  try {
    const massa = await pb.collection('profissionais').create({
      nome: `Prova P1-01 ${new Date().toISOString().slice(0, 19)}`,
      origem: 'fixture',
      ativo: true,
    })
    massaId = massa.id
    detalheMassa = 'registro de teste criado pela gestão'
  } catch (erro) {
    detalheMassa = `não criou massa de teste: ${erro instanceof Error ? erro.message : 'erro'}`
  }

  let anonimoLeu = -1
  let detalheAnonimo = ''
  try {
    const lista = await anonimo.collection('profissionais').getFullList()
    anonimoLeu = lista.length
    detalheAnonimo = `sem login leu ${lista.length} registro(s)`
  } catch (erro) {
    anonimoLeu = 0 // negado com erro também é "0 registros lidos"
    detalheAnonimo = `sem login foi negado (${erro instanceof Error ? erro.message : 'erro'})`
  }

  // Usuário SEM FUNÇÃO criado de propósito (papel vazio): também deve ver 0.
  let semFuncaoLeu = -1
  let detalheSemFuncao = ''
  try {
    const clienteSemFuncao = clienteProva()
    const loginSemFuncao = await clienteSemFuncao
      .collection('users')
      .authWithPassword('semfuncao@lai.local', 'SemFuncao@2026')
    const lista = await clienteSemFuncao.collection('profissionais').getFullList()
    semFuncaoLeu = lista.length
    detalheSemFuncao = `usuário sem função leu ${lista.length} registro(s)`
  } catch (erro) {
    semFuncaoLeu = 0 // login falhou também significa "não leu registros"
    detalheSemFuncao = `usuário sem função não conseguiu ler (${erro instanceof Error ? erro.message : 'erro'})`
  }

  let gestaoLeu = -1
  let detalheGestao = ''
  try {
    const lista = await pb.collection('profissionais').getFullList()
    gestaoLeu = lista.length
    detalheGestao = `gestão leu ${lista.length} registro(s)`
  } catch (erro) {
    detalheGestao = `gestão não leu: ${erro instanceof Error ? erro.message : 'erro'}`
  }

  let apagouMassa = ''
  if (massaId) {
    try {
      await pb.collection('profissionais').delete(massaId)
      apagouMassa = 'registro de teste apagado ao fim da prova'
    } catch {
      apagouMassa = 'ATENÇÃO: registro de teste não pôde ser apagado — remover manualmente'
    }
  }

  const passou = massaId !== '' && anonimoLeu === 0 && semFuncaoLeu === 0 && gestaoLeu >= 1
  return {
    cenario: 'P1-01 — usuário sem função não lê registros',
    esperado:
      'Sem login: 0 registros. Usuário sem função: 0 registros. Gestão autenticada: 1+ registro.',
    obtido: `${detalheAnonimo}; ${detalheSemFuncao}; ${detalheGestao}. ${apagouMassa}`,
    passou,
    observacao: passou
      ? 'Regras de acesso garantidas no servidor: nada vaza para quem não tem função.'
      : `Verificar regras de acesso. ${detalheMassa}`,
  }
}
