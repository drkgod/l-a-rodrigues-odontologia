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
  feitaEm?: string,
): Promise<ResultadoRegistro> {
  try {
    return await pb.send('/backend/v1/ligacao/registrar', {
      method: 'POST',
      body: { contato: contatoId, resultado, teste, feita_em: feitaEm || '' },
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

// Task f124df8f — cobertura de ligação por turno (CA-1-19: responsável do turno).
export interface ConfigTurno {
  id: string
  turno: 'manha' | 'tarde'
  responsavel: string
  atualizado_por: string
  teste: boolean
}

export async function listarTurnos(): Promise<ConfigTurno[]> {
  try {
    return await pb.collection('config_turno_ligacao').getFullList({ sort: 'created' })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível carregar a cobertura de ligação.')
  }
}

// Gestão define o responsável do turno (coleção nova — migration 0014).
export async function salvarTurno(
  id: string,
  responsavel: string,
  autor: string,
): Promise<ConfigTurno> {
  try {
    return await pb.collection('config_turno_ligacao').update(id, {
      responsavel,
      atualizado_por: autor,
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar a cobertura de ligação.')
  }
}

// Cria os 2 registros padrão (manhã/tarde) se a coleção ainda não tiver —
// a tela chama ao abrir (primeira edição); sem isso o hook vira "a definir".
export async function garantirTurnosPadrao(autor: string): Promise<ConfigTurno[]> {
  try {
    const atuais = await listarTurnos()
    const turnos = ['manha', 'tarde'] as const
    for (const turno of turnos) {
      if (!atuais.some((t) => t.turno === turno)) {
        await pb.collection('config_turno_ligacao').create({
          turno,
          responsavel: '',
          atualizado_por: autor,
        })
      }
    }
    return listarTurnos()
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível preparar a cobertura de ligação.')
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

// Task 5bcfa6f1 — lista de confirmação do dia-alvo (RN-01, CA-1-18).
export interface LinhaConfirmacao {
  contato_id: string
  agenda_item_id: string
  paciente: string
  telefone: string
  telefone_valido: boolean
  hora: string
  dentista: string
  estado: string
  mensagem: string
  turno: string
  responsavel: string
  teste: boolean
}

export interface ResultadoListaDia {
  data: string
  limite_linhas_robo: number
  total: number
  contatos_criados: number
  lista: LinhaConfirmacao[]
}

export async function gerarListaDia(data: string, teste = false): Promise<ResultadoListaDia> {
  try {
    return await pb.send('/backend/v1/confirmacao/lista-dia', {
      method: 'POST',
      body: { data, teste },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível gerar a lista do dia.')
  }
}

// CA-1-18 — divide a lista nas 3 saídas: XLSX (até o limite), envio manual (excedente)
// e corrigir telefone (inválido). Exportar NUNCA cria tentativa (RN-02).
export interface SaidaConfirmacao {
  xlsx: LinhaConfirmacao[]
  envioManual: LinhaConfirmacao[]
  corrigirTelefone: LinhaConfirmacao[]
}

export function dividirSaidas(lista: LinhaConfirmacao[], limite: number): SaidaConfirmacao {
  const validas = lista.filter((l) => l.telefone_valido)
  return {
    xlsx: validas.slice(0, limite),
    envioManual: validas.slice(limite),
    corrigirTelefone: lista.filter((l) => !l.telefone_valido),
  }
}

// RN-15 — exporta o XLSX no formato do robô (fallback CL-009: nome, telefone, mensagem).
// Import dinâmico: xlsx só entra no bundle quando alguém exporta.
export async function exportarXlsx(
  linhas: LinhaConfirmacao[],
  quemExportou: string,
): Promise<{ nomeArquivo: string; totalLinhas: number }> {
  const XLSX = await import('xlsx')
  const dados = linhas.map((l) => ({
    nome: l.paciente,
    telefone: l.telefone,
    mensagem: l.mensagem,
  }))
  const planilha = XLSX.utils.json_to_sheet(dados)
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, 'confirmacao')
  const nomeArquivo = 'confirmacao-' + new Date().toISOString().slice(0, 10) + '.xlsx'
  XLSX.writeFile(livro, nomeArquivo)
  // registro da exportação (RN-15) — quem/quando/quantas linhas
  await pb.collection('provas_execucoes').create({
    spec: 'SPEC-1-004',
    cenario: 'Exportação XLSX da lista de confirmação',
    esperado: 'Arquivo no formato do robô (nome, telefone, mensagem), sem criar tentativas.',
    obtido: quemExportou + ' exportou ' + linhas.length + ' linha(s) em ' + nomeArquivo,
    passou: true,
    observacao: 'RN-15 — registro de exportação (não é prova de envio).',
  })
  return { nomeArquivo: nomeArquivo, totalLinhas: linhas.length }
}

// Massa de teste na tela (modo demonstrativo da SPEC): 4 consultas fixture no dia-alvo
// (3 telefone válido, 1 inválido) — o dono testa o fluxo completo sem depender da prova.
// Tudo com teste=true; limpeza apaga por assinatura.
export async function criarMassaConfirmacao(data: string): Promise<ResultadoListaDia> {
  try {
    // Idempotente: se o dia-alvo já tem a massa fixture, reusa — não acumula 4+4 consultas
    // (o teste humano pegou 8 linhas duplicadas clicando "Criar massa de teste" 2× no mesmo dia).
    const jaExiste = await pb
      .collection('agenda_itens')
      .getFullList({ filter: 'origem = "fixture" && teste = true && data = "' + data + '"' })
      .catch(() => [])
    if (jaExiste.length > 0) {
      return await gerarListaDia(data, true)
    }
    let prof = await pb
      .collection('profissionais')
      .getFirstListItem('nome = "Profissional Teste Confirmações" && teste = true')
      .catch(() => null)
    if (!prof) {
      prof = await pb.collection('profissionais').create({
        nome: 'Profissional Teste Confirmações',
        origem: 'fixture',
        ativo: true,
        tipo_agenda: 'ambos',
        teste: true,
      })
    }
    const horarios = ['08:00', '09:00', '10:00', '11:00']
    const telefones = ['5521999993001', '5521999993002', '5521999993003', '119']
    for (let i = 0; i < 4; i++) {
      await pb.collection('agenda_itens').create({
        item_tipo: 'APPOINTMENT',
        clinicorp_id: 'conf-massa-' + i + '-' + Date.now(),
        data: data,
        inicio: horarios[i],
        fim: horarios[i],
        profissional: prof.id,
        paciente_nome: 'Paciente Teste ' + (i + 1),
        paciente_telefone: telefones[i],
        origem: 'fixture',
        teste: true,
      })
    }
    return await gerarListaDia(data, true)
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível criar a massa de teste.')
  }
}

// Apaga a massa de teste do dia-alvo (itens + contatos + profissional fixture).
export async function limparMassaConfirmacaoDia(data: string): Promise<void> {
  try {
    const itens = await pb
      .collection('agenda_itens')
      .getFullList({ filter: 'origem = "fixture" && teste = true && data = "' + data + '"' })
      .catch(() => [])
    for (const item of itens)
      await pb
        .collection('agenda_itens')
        .delete(item.id)
        .catch(() => {})
    await limparMassaConfirmacao()
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível limpar a massa de teste.')
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
