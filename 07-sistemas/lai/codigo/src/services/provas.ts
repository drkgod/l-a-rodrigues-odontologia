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

// P1-01 — acesso por função. No PocketBase, regra de listagem que nega devolve
// 200 com lista VAZIA (nunca erro): a prova certa é "anônimo vê 0 registros".
export async function executarProvaP1_01(): Promise<ResultadoProva> {
  const anonimo = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
  anonimo.autoCancellation(false)

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

  const passou = massaId !== '' && anonimoLeu === 0 && gestaoLeu >= 1
  return {
    cenario: 'P1-01 — usuário sem função não lê registros',
    esperado:
      'Sem login: 0 registros (nada vaza). Com gestão autenticada: 1+ registro (o de teste).',
    obtido: `${detalheAnonimo}; ${detalheGestao}. ${apagouMassa}`,
    passou,
    observacao: passou
      ? 'Regras de acesso garantidas no servidor: lista vazia para anônimo, visível para gestão.'
      : `Verificar regras de acesso. ${detalheMassa}`,
  }
}
