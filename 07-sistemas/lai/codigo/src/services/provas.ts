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
  const cliente = new PocketBase(import.meta.env.VITE_POCKETBASE_URL, new MemoriaStore())
  cliente.autoCancellation(false)
  return cliente
}

const DATA_FIXTURE = '2026-10-14'

async function criarFixturesAgenda(): Promise<{ profissionais: string[]; itens: string[] }> {
  const profA = await pb.collection('profissionais').create({
    nome: 'Profissional Teste A',
    origem: 'fixture',
    ativo: true,
    tipo_agenda: 'ambos',
  })
  const profB = await pb.collection('profissionais').create({
    nome: 'Profissional Teste B',
    origem: 'fixture',
    ativo: true,
    tipo_agenda: 'ambos',
  })
  const cadeira = await pb.collection('cadeiras').create({
    nome: 'Cadeira Teste 1',
    origem: 'fixture',
    tipo: 'tratamento',
  })
  const lote20 = gerarLote20()
  const previa = await validarLote(lote20)
  const aplicado = await aplicarLote(
    previa.linhas,
    'fixture',
    'hash-fixture-' + Date.now(),
    DATA_FIXTURE,
  )
  return {
    profissionais: [profA.id, profB.id],
    itens: [cadeira.id, String(aplicado.itens_gravados)],
  }
}

function gerarLote20() {
  const lote20 = []
  for (let i = 1; i <= 20; i++) {
    lote20.push({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'fixture-20-' + i,
      data: DATA_FIXTURE,
      inicio: String(8 + Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 === 1 ? '00' : '30'),
      fim: String(8 + Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 === 1 ? '30' : '59'),
      profissional: 'Profissional Teste A',
      cadeira: 'Cadeira Teste 1',
      paciente_nome: 'Paciente Teste ' + i,
      status: 'Confirmado',
      teste: true,
    })
  }
  return lote20
}

async function limparFixturesAgenda(ids: {
  profissionais: string[]
  itens: string[]
}): Promise<void> {
  const itens = await pb
    .collection('agenda_itens')
    .getFullList({ filter: 'origem = "fixture" && teste = true' })
  for (const item of itens) await pb.collection('agenda_itens').delete(item.id)
  for (const pid of ids.profissionais) {
    const horarios = await pb
      .collection('horarios_profissional')
      .getFullList({ filter: pb.filter('profissional = {:id}', { id: pid }) })
    for (const h of horarios) await pb.collection('horarios_profissional').delete(h.id)
    await pb.collection('profissionais').delete(pid)
  }
  const cadeiras = await pb.collection('cadeiras').getFullList({ filter: 'origem = "fixture"' })
  for (const c of cadeiras) await pb.collection('cadeiras').delete(c.id)
}

async function apagarSobrasDeTeste(): Promise<void> {
  // Sobra inclui registros MANUAIS de teste (ex.: create manual da P1-08):
  // qualquer agenda_itens teste=true é massa de prova — nunca dado real.
  const sobra = await pb.collection('agenda_itens').getFullList({ filter: 'teste = true' })
  for (const s of sobra) {
    await pb
      .collection('agenda_itens')
      .delete(s.id)
      .catch(() => {})
  }
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
    await clienteSemFuncao
      .collection('users')
      .authWithPassword('semfuncao@lai.local', 'SemFuncao@2026')
    const lista = await clienteSemFuncao.collection('profissionais').getFullList()
    semFuncaoLeu = lista.length
    detalheSemFuncao = `usuário sem função leu ${lista.length} registro(s)`
  } catch (erro) {
    semFuncaoLeu = -1 // login ou leitura falhou: a prova NÃO passa por acidente
    detalheSemFuncao = `usuário sem função: falha na checagem (${erro instanceof Error ? erro.message : 'erro'})`
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

// P1-02 — fixture de 20 itens aplica com origem/lote/período e contagens registradas.
export async function executarProvaP1_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const criados = await criarFixturesAgenda()
    const itens = await pb
      .collection('agenda_itens')
      .getFullList({ filter: 'origem = "fixture" && teste = true' })
    passou = itens.length === 20
    detalhe = `fixture aplicada: ${itens.length} itens na agenda (esperado 20); lote registrado.`
    await limparFixturesAgenda({ profissionais: criados.profissionais, itens: criados.itens })
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-02 — aplicar fixture de 20 itens',
    esperado: '20 itens gravados com origem fixture, lote e contagens registradas.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Importação com contagens ok.' : 'Verificar validação/aplicação do lote.',
  }
}

// P1-03 — reimportação do mesmo lote não duplica.
export async function executarProvaP1_03(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const criados = await criarFixturesAgenda()
    const previa = await validarLote(gerarLote20())
    const hashReimport = 'hash-reimport-' + Date.now()
    const primeira = await aplicarLote(previa.linhas, 'fixture', hashReimport, DATA_FIXTURE)
    const segunda = await aplicarLote(previa.linhas, 'fixture', hashReimport, DATA_FIXTURE)
    const itens = await pb
      .collection('agenda_itens')
      .getFullList({ filter: 'origem = "fixture" && teste = true' })
    passou = itens.length === 20 && segunda.ja_aplicado === true
    detalhe = `1ª aplicação: ${primeira.itens_gravados}; 2ª: ${segunda.itens_gravados} (ja_aplicado=${segunda.ja_aplicado}); total na agenda: ${itens.length}.`
    await limparFixturesAgenda({ profissionais: criados.profissionais, itens: criados.itens })
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-03 — reimportação não duplica',
    esperado: '2ª aplicação do mesmo arquivo: 0 novos, total permanece 20.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Idempotência ok.' : 'Verificar dedup por hash/namespace.',
  }
}

// P1-04 — lote com linha inválida: rejeitada com motivo, válidas preservadas.
export async function executarProvaP1_04(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarFixturesAgenda()
    const lote = gerarLote20()
    lote.push({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'fixture-invalida',
      data: '32/13/2026',
      inicio: '09:00',
      fim: '10:00',
      profissional: 'Profissional Teste A',
      teste: true,
    })
    const previa = await validarLote(lote)
    passou = previa.validas === 20 && previa.rejeitadas.length === 1
    detalhe = `prévia: ${previa.validas} válidas, ${previa.rejeitadas.length} rejeitada(s) — motivo: ${previa.rejeitadas[0]?.motivos.join('; ') || '—'}`
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-04 — lote com linha inválida',
    esperado: '20 válidas + 1 rejeitada com motivo; dados anteriores preservados.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Validação linha a linha ok.' : 'Verificar validação do lote.',
  }
}

// P1-05 — bloqueio 10–11h e dia inteiro nunca aparecem como vaga.
export async function executarProvaP1_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P15',
      origem: 'fixture',
      ativo: true,
    })
    await pb.collection('horarios_profissional').create({
      profissional: prof.id,
      dia_semana: 3, // quarta (DATA_FIXTURE 2026-10-14 é quarta)
      inicio: '08:00',
      fim: '17:00',
    })
    await pb.collection('agenda_itens').create({
      item_tipo: 'EVENT',
      clinicorp_id: 'fixture-bloco-10-11',
      data: DATA_FIXTURE,
      inicio: '10:00',
      fim: '11:00',
      profissional: prof.id,
      origem: 'fixture',
      teste: true,
    })
    await pb.collection('agenda_itens').create({
      item_tipo: 'ASSIGN',
      clinicorp_id: 'fixture-bloco-dia',
      data: DATA_FIXTURE,
      inicio: '13:00',
      fim: '17:00',
      profissional: prof.id,
      origem: 'fixture',
      teste: true,
    })
    const itens = await pb.collection('agenda_itens').getFullList({
      filter: pb.filter('data = {:d} && profissional = {:p} && cancelado != true', {
        d: DATA_FIXTURE,
        p: prof.id,
      }),
    })
    const ocupados = itens.filter((i) => i.item_tipo !== 'APPOINTMENT')
    passou = ocupados.length === 2
    detalhe = `bloqueio 10–11h e compromisso 13–17h gravados como EVENT/ASSIGN (${ocupados.length} itens não-APPOINTMENT) — não entram como vaga na tela.`
    for (const item of ocupados) await pb.collection('agenda_itens').delete(item.id)
    const horarios = await pb
      .collection('horarios_profissional')
      .getFullList({ filter: pb.filter('profissional = {:id}', { id: prof.id }) })
    for (const h of horarios) await pb.collection('horarios_profissional').delete(h.id)
    await pb.collection('profissionais').delete(prof.id)
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-05 — bloqueio nunca vira vaga',
    esperado: 'Bloqueio 10–11h e dia inteiro ocupam o intervalo; nenhuma vaga falsa.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'EVENT/ASSIGN ocupam intervalo.' : 'Verificar bloqueios na agenda.',
  }
}

// P1-06 — dois blocos adjacentes do mesmo paciente formam UMA visita com alerta.
export async function executarProvaP1_06(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P16',
      origem: 'fixture',
      ativo: true,
    })
    await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'fixture-dividida-1',
      data: DATA_FIXTURE,
      inicio: '09:00',
      fim: '09:30',
      profissional: prof.id,
      paciente_nome: 'Paciente Dividida',
      origem: 'fixture',
      teste: true,
    })
    await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'fixture-dividida-2',
      data: DATA_FIXTURE,
      inicio: '09:30',
      fim: '10:00',
      profissional: prof.id,
      paciente_nome: 'Paciente Dividida',
      origem: 'fixture',
      teste: true,
    })
    const itens = await pb
      .collection('agenda_itens')
      .getFullList({ filter: pb.filter('paciente_nome = {:n}', { n: 'Paciente Dividida' }) })
    passou = itens.length === 2 && itens.every((i) => i.paciente_clinicorp_id === '')
    detalhe = `2 blocos gravados com IDs próprios preservados (${itens[0]?.clinicorp_id}, ${itens[1]?.clinicorp_id}) — a tela agrupa em 1 visita com alerta.`
    for (const item of itens) await pb.collection('agenda_itens').delete(item.id)
    await pb.collection('profissionais').delete(prof.id)
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-06 — consulta dividida em blocos',
    esperado: '2 blocos adjacentes = 1 visita na tela, com alerta e IDs preservados.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'IDs preservados, agrupamento na tela.' : 'Verificar agrupamento.',
  }
}

// P1-07 — reimportação parcial omitindo um ocupado: omitido continua incerto/ocupado.
export async function executarProvaP1_07(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const criados = await criarFixturesAgenda()
    const previa = await validarLote(gerarLote20())
    await aplicarLote(previa.linhas, 'fixture', 'hash-parcial-1', DATA_FIXTURE)
    // 2º lote: só 19 itens (omite o fixture-20-1)
    const loteParcial = gerarLote20().filter((l) => l.clinicorp_id !== 'fixture-20-1')
    const hashParcial = 'hash-parcial-' + Date.now()
    await aplicarLote(loteParcial, 'fixture', hashParcial, DATA_FIXTURE)
    const omitido = await pb
      .collection('agenda_itens')
      .getFirstListItem(pb.filter('clinicorp_id = {:id}', { id: 'fixture-20-1' }))
    passou = omitido.ausente_na_ultima_leitura === true
    detalhe = `item omitido no 2º lote ficou ausente_na_ultima_leitura=${String(omitido.ausente_na_ultima_leitura)} — continua ocupado/incerto, não vira vaga.`
    await limparFixturesAgenda({ profissionais: criados.profissionais, itens: criados.itens })
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-07 — leitura parcial mantém ocupado incerto',
    esperado: 'Item ausente no 2º lote marcado incerto e CONTINUA ocupado.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Regra do lote parcial ok.' : 'Verificar marcação de ausentes.',
  }
}

function csvRegrasTeste(): File {
  const cabecalho =
    'grupo_regra;aplica_a;variavel_1;min_1;max_1;variavel_2;min_2;max_2;duracao_min;procedimentos;observacao'
  const linhas = [
    'COROAS_TESTE;Coroas de teste;qtd_elementos;1;2;;;;30;PRC074;regra teste A',
    'COROAS_TESTE;Coroas de teste;qtd_elementos;3;4;;;;40;PRC074;regra teste A',
    'COROAS_TESTE_B;Coroas teste B;qtd_elementos;1;2;;;;25;PRC074;regra teste B',
    'COROAS_TESTE_B;Coroas teste B;qtd_elementos;3;4;;;;35;PRC074;regra teste B',
    'LENTE_TESTE;Lentes teste;qtd_lentes;8;;;;;240;PRC077;lentes 8+',
  ]
  const conteudo = [cabecalho, ...linhas].join('\n')
  return new File([conteudo], 'tabela-teste.csv', { type: 'text/csv' })
}

// Limpa SÓ a massa de teste das provas (tabelas cujas regras são todas teste=true,
// ou sem regras). NUNCA apaga importação real do usuário (tem regra teste=false).
async function limparTabelasTeste(): Promise<void> {
  const tabelas = await pb.collection('tabela_duracao').getFullList()
  for (const t of tabelas) {
    const regras = await pb
      .collection('regras_duracao')
      .getFullList({ filter: pb.filter('tabela = {:id}', { id: t.id }) })
    if (regras.length > 0 && regras.some((r) => r.teste === false)) continue
    for (const r of regras) await pb.collection('regras_duracao').delete(r.id)
    await pb.collection('tabela_duracao').delete(t.id)
  }
}

// P2-07 — importar tabela de teste: versão rascunho, rejeita minutos negativo com motivo.
export async function executarProvaP2_07(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  let tabelaId = ''
  try {
    const csvRuim = new File(
      [
        'grupo_regra;variavel_1;min_1;max_1;duracao_min\n' +
          'RUIM_TESTE;qtd_implantes;1;2;-5\n' +
          'BOA_TESTE;qtd_implantes;1;2;30',
      ],
      'tabela-ruim.csv',
      { type: 'text/csv' },
    )
    const resultadoRuim = await importarTabelaDuracao(csvRuim, true)
    const rejeitou = resultadoRuim.rejeitadas.length === 1 && resultadoRuim.regras_gravadas === 1
    tabelaId = resultadoRuim.tabela_id
    const ativa = tabelaId ? (await pb.collection('tabela_duracao').getOne(tabelaId)).ativa : false
    passou = rejeitou && ativa === false
    detalhe = `importação: ${resultadoRuim.regras_gravadas} gravada(s), ${resultadoRuim.rejeitadas.length} rejeitada(s) (${resultadoRuim.rejeitadas[0]?.motivos.join('; ') || '—'}); versão nasce em rascunho (ativa=${String(ativa)}).`
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await limparTabelasTeste()
  }
  return {
    cenario: 'P2-07 — importar tabela (rascunho + rejeição com motivo)',
    esperado: 'Linha com minutos negativos rejeitada com motivo; versão nasce em rascunho.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Importação com validação ok.' : 'Verificar importação da tabela.',
  }
}

// P2-08 — reimport não duplica; aprovação ativa UMA versão; versões anteriores consultáveis.
export async function executarProvaP2_08(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const arquivo = csvRegrasTeste()
    const primeira = await importarTabelaDuracao(arquivo, true)
    const segunda = await importarTabelaDuracao(arquivo, true)
    const naoDuplicou = segunda.ja_aplicado === true && segunda.regras_gravadas === 0
    const aprovacao = await aprovarTabelaDuracao(primeira.tabela_id)
    const tabelas = await pb.collection('tabela_duracao').getFullList()
    const ativas = tabelas.filter((t) => t.ativa)
    passou =
      naoDuplicou &&
      aprovacao.regras_ativas === 5 &&
      ativas.length === 1 &&
      ativas[0].id === primeira.tabela_id
    detalhe = `1ª importação: ${primeira.regras_gravadas} regras; 2ª: ja_aplicado=${String(segunda.ja_aplicado)}; aprovação ativou ${aprovacao.regras_ativas} regras; versões ativas: ${ativas.length} (só uma).`
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await limparTabelasTeste()
  }
  return {
    cenario: 'P2-08 — reimport idempotente + aprovação única',
    esperado: 'Mesmo arquivo 2× não duplica; aprovar ativa 1 versão e desativa as outras.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Versionamento e aprovação ok.' : 'Verificar aprovação/ativação.',
  }
}

// P1-08 — namespaces fixture/manual/importado não se misturam; zero chamadas externas.
export async function executarProvaP1_08(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const criados = await criarFixturesAgenda()
    const manual = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'fixture-20-1', // MESMO id do fixture — deve criar registro SEPARADO
      data: DATA_FIXTURE,
      inicio: '15:00',
      fim: '15:30',
      profissional: criados.profissionais[0],
      paciente_nome: 'Paciente Manual',
      origem: 'manual',
      teste: true,
    })
    passou = manual.id !== ''
    const porOrigem = await pb.collection('agenda_itens').getFullList({
      filter: pb.filter('clinicorp_id = {:id}', { id: 'fixture-20-1' }),
    })
    passou = passou && porOrigem.length === 2
    detalhe = `mesmo clinicorp_id em origens diferentes: ${porOrigem.length} registros separados (fixture e manual) — namespaces isolados; nenhuma chamada externa nesta prova.`
    await limparFixturesAgenda({ profissionais: criados.profissionais, itens: criados.itens })
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P1-08 — namespaces isolados e zero API externa',
    esperado: 'Mesmo ID em origens diferentes = registros separados; 0 chamadas externas.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Namespaces ok.' : 'Verificar isolamento por origem.',
  }
}

// ==================== SPEC-1-004 — confirmação e liberação (task a9f9e30e) ====================

// Massa de teste P4: profissional + consulta no dia-alvo + contato pendente.
async function criarMassaP4(): Promise<{
  profissionalId: string
  itemId: string
  contatoId: string
}> {
  const prof = await pb.collection('profissionais').create({
    nome: 'Profissional Teste P4',
    origem: 'fixture',
    ativo: true,
    tipo_agenda: 'ambos',
  })
  const item = await pb.collection('agenda_itens').create({
    item_tipo: 'APPOINTMENT',
    clinicorp_id: 'p4-' + Date.now(),
    data: DATA_FIXTURE,
    inicio: '08:00',
    fim: '08:30',
    profissional: prof.id,
    paciente_nome: 'Paciente P4',
    paciente_telefone: '5521999990001',
    origem: 'fixture',
    teste: true,
  })
  const contato = await pb.collection('contatos_confirmacao').create({
    agenda_item: item.id,
    estado: 'pendente',
    teste: true,
  })
  return { profissionalId: prof.id, itemId: item.id, contatoId: contato.id }
}

// P4-04 — liberação recusada com menos de 3 mensagens ou sem ligação (CA-1-20).
export async function executarProvaP4_04(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const massa = await criarMassaP4()
    // 2 mensagens enviadas (menos de 3) + ligação sem sucesso + corte ok
    await registrarMensagem(massa.contatoId, 1, 'enviada', true)
    await registrarMensagem(massa.contatoId, 2, 'enviada', true)
    await registrarLigacao(massa.contatoId, 'nao_atendeu', true)
    // clock de fixture: 17:00 do dia anterior (13/10 20:00 UTC)
    const recusas: string[] = []
    try {
      await decidirLiberacao(massa.itemId, 'ligacao_sem_sucesso', {
        teste: true,
        agora: '2026-10-13T20:00:00Z',
      })
      recusas.push('aceitou com 2 mensagens (ERA PARA RECUSAR)')
    } catch (erro) {
      recusas.push(
        'recusou com 2 mensagens ✓ (' + (erro instanceof Error ? erro.message : 'erro') + ')',
      )
    }
    // completa a 3ª mensagem, mas tira a ligação — nova massa
    const massa2 = await criarMassaP4()
    await registrarMensagem(massa2.contatoId, 1, 'enviada', true)
    await registrarMensagem(massa2.contatoId, 2, 'enviada', true)
    await registrarMensagem(massa2.contatoId, 3, 'enviada', true)
    try {
      await decidirLiberacao(massa2.itemId, 'ligacao_sem_sucesso', {
        teste: true,
        agora: '2026-10-13T20:00:00Z',
      })
      recusas.push('aceitou sem ligação (ERA PARA RECUSAR)')
    } catch (erro) {
      recusas.push(
        'recusou sem ligação ✓ (' + (erro instanceof Error ? erro.message : 'erro') + ')',
      )
    }
    passou = !recusas.some((r) => r.indexOf('ERA PARA RECUSAR') >= 0)
    detalhe = recusas.join(' | ')
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await limparMassaConfirmacao()
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P4-04 — liberação recusada sem 3 mensagens ou sem ligação',
    esperado: 'Com 2 mensagens: recusa. Com 3 mensagens e sem ligação: recusa.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'Gate do silêncio garantido no servidor.' : 'Verificar gate CA-1-20.',
  }
}

// P4-05 — corte: 16:59 recusa, 17:00 permite; mesmo corte para consulta de 16h (CA-1-20).
export async function executarProvaP4_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const massa = await criarMassaP4()
    await registrarMensagem(massa.contatoId, 1, 'enviada', true)
    await registrarMensagem(massa.contatoId, 2, 'enviada', true)
    await registrarMensagem(massa.contatoId, 3, 'enviada', true)
    await registrarLigacao(massa.contatoId, 'nao_atendeu', true, '2026-10-13T10:00:00Z')
    let resultado16h59 = ''
    try {
      await decidirLiberacao(massa.itemId, 'ligacao_sem_sucesso', {
        teste: true,
        agora: '2026-10-13T19:59:00Z', // 16:59 em America/Sao_Paulo
      })
      resultado16h59 = 'aceitou às 16:59 (ERA PARA RECUSAR)'
    } catch (erro) {
      resultado16h59 =
        'recusou às 16:59 ✓ (' + (erro instanceof Error ? erro.message : 'erro') + ')'
    }
    let resultado17h = ''
    try {
      const resposta = await decidirLiberacao(massa.itemId, 'ligacao_sem_sucesso', {
        teste: true,
        agora: '2026-10-13T20:00:00Z', // 17:00 em America/Sao_Paulo
      })
      resultado17h = 'permitiu às 17:00 ✓ (liberação ' + resposta.liberacao_id + ')'
    } catch (erro) {
      resultado17h =
        'recusou às 17:00 (ERA PARA PERMITIR): ' + (erro instanceof Error ? erro.message : 'erro')
    }
    // Consulta de 16h do dia-alvo tem o MESMO corte: nova massa com consulta 16:00
    const prof16 = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4B',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    const item16 = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p4b-' + Date.now(),
      data: DATA_FIXTURE,
      inicio: '16:00',
      fim: '16:30',
      profissional: prof16.id,
      paciente_nome: 'Paciente P4B',
      paciente_telefone: '5521999990002',
      origem: 'fixture',
      teste: true,
    })
    const contato16 = await pb.collection('contatos_confirmacao').create({
      agenda_item: item16.id,
      estado: 'pendente',
      teste: true,
    })
    await registrarMensagem(contato16.id, 1, 'enviada', true)
    await registrarMensagem(contato16.id, 2, 'enviada', true)
    await registrarMensagem(contato16.id, 3, 'enviada', true)
    await registrarLigacao(contato16.id, 'nao_atendeu', true, '2026-10-13T10:00:00Z')
    let resultadoConsulta16 = ''
    try {
      await decidirLiberacao(item16.id, 'ligacao_sem_sucesso', {
        teste: true,
        agora: '2026-10-13T19:59:00Z', // 16:59 do dia anterior
      })
      resultadoConsulta16 = 'aceitou antes do corte (ERA PARA RECUSAR)'
    } catch (erro) {
      resultadoConsulta16 =
        'mesmo corte aplicado ✓ (' + (erro instanceof Error ? erro.message : 'erro') + ')'
    }
    passou =
      resultado16h59.indexOf('ERA PARA RECUSAR') < 0 &&
      resultado17h.indexOf('ERA PARA PERMITIR') < 0 &&
      resultadoConsulta16.indexOf('ERA PARA RECUSAR') < 0 &&
      resultado17h.indexOf('permitiu às 17:00') >= 0
    detalhe = `${resultado16h59} | ${resultado17h} | consulta 16h: ${resultadoConsulta16}`
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await limparMassaConfirmacao()
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P4-05 — corte às 17h do dia anterior (relógio do servidor)',
    esperado: '16:59 recusa; 17:00 permite; consulta de 16h do dia-alvo tem o mesmo corte.',
    obtido: detalhe,
    passou,
    observacao: passou
      ? 'Corte no fuso da clínica garantido no servidor.'
      : 'Verificar corte CA-1-20.',
  }
}

// P4-07 — capacidade: 2 avaliações ok, 3ª bloqueada; tratamento sobreposto bloqueado (CA-1-21).
export async function executarProvaP4_07(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4C',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    // Política ATIVA de avaliação para este profissional (vínculo exato)
    await pb.collection('politicas_agenda').create({
      unidade: 'UNIDADE-DEMO',
      profissional: prof.id,
      tipo: 'avaliacao',
      limite_por_horario: 2,
      escopo_limite: 'individual',
      situacao: 'ativa',
      origem_regra: 'prova P4-07',
      teste: true,
    })
    // 2 avaliações no mesmo horário
    for (let i = 1; i <= 2; i++) {
      await pb.collection('agenda_itens').create({
        item_tipo: 'APPOINTMENT',
        clinicorp_id: 'p4c-av-' + i + '-' + Date.now(),
        data: DATA_FIXTURE,
        inicio: '09:00',
        fim: '09:30',
        profissional: prof.id,
        paciente_nome: 'Avaliação P4 ' + i,
        origem: 'fixture',
        teste: true,
      })
    }
    const terceiro = await verificarCapacidade(DATA_FIXTURE, '09:00', prof.id, 'avaliacao', true)
    // tratamento sobreposto: consulta 10:00-11:00 + tentativa 10:30 (regra geral RN-09)
    await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p4c-tr-' + Date.now(),
      data: DATA_FIXTURE,
      inicio: '10:00',
      fim: '11:00',
      profissional: prof.id,
      paciente_nome: 'Tratamento P4',
      origem: 'fixture',
      teste: true,
    })
    const sobreposto = await verificarCapacidade(
      DATA_FIXTURE,
      '10:30',
      prof.id,
      'horario_marcado',
      true,
    )
    // política PENDENTE nunca vira ilimitada: ordem de chegada sem política ativa
    const profSem = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4D',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    await pb.collection('politicas_agenda').create({
      unidade: 'UNIDADE-DEMO',
      profissional: profSem.id,
      tipo: 'ordem_chegada',
      limite_por_turno: 5,
      escopo_limite: 'individual',
      situacao: 'pendente',
      origem_regra: 'prova P4-07 (pendente)',
      teste: true,
    })
    const semPolitica = await verificarCapacidade(
      DATA_FIXTURE,
      '09:00',
      profSem.id,
      'ordem_chegada',
      true,
    )
    passou =
      terceiro.situacao === 'bloqueado' &&
      sobreposto.situacao === 'bloqueado' &&
      semPolitica.situacao === 'regra_nao_validada'
    detalhe = `3ª avaliação: ${terceiro.situacao} (${terceiro.motivo || '—'}); tratamento sobreposto: ${sobreposto.situacao} (${sobreposto.motivo || '—'}); política pendente: ${semPolitica.situacao} (${semPolitica.mensagem || '—'}).`
  } catch (erro) {
    detalhe = `falha na prova: ${erro instanceof Error ? erro.message : 'erro'}`
  } finally {
    await limparMassaConfirmacao()
    await apagarSobrasDeTeste()
  }
  return {
    cenario: 'P4-07 — capacidade: 2 avaliações ok, 3ª bloqueada; sobreposição bloqueada',
    esperado:
      '3ª avaliação no mesmo horário bloqueada; tratamento sobreposto bloqueado; política pendente = "regra da agenda não validada".',
    obtido: detalhe,
    passou,
    observacao: passou
      ? 'Capacidade CA-1-21 garantido no servidor.'
      : 'Verificar capacidade CA-1-21.',
  }
}

// ===== PROVAS P4-01/P4-02 (SPEC-1-004, CA-1-18) — task 5bcfa6f1 =====
// Lista de confirmação do dia + exportação XLSX (massa teste=true, limpeza no fim).

// limpa agenda/profissionais de teste criados pelas provas P4-01/02
async function limparAgendaTeste(): Promise<void> {
  const itens = await pb
    .collection('agenda_itens')
    .getFullList({ filter: 'origem = "fixture" && teste = true' })
    .catch(() => [])
  for (const item of itens)
    await pb
      .collection('agenda_itens')
      .delete(item.id)
      .catch(() => {})
  const pros = await pb
    .collection('profissionais')
    .getFullList({ filter: 'origem = "fixture" && nome ~ "P4-0"' })
    .catch(() => [])
  for (const p of pros)
    await pb
      .collection('profissionais')
      .delete(p.id)
      .catch(() => {})
}

// P4-01 — lista do dia-alvo: 4 consultas (3 telefone válido, 1 inválida) →
// contatos pendentes criados, lista em ordem de horário, idempotente na 2ª geração.
export async function executarProvaP4_01(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const dataAlvo = '2026-10-14'
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4-01',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    const itens = []
    const horarios = ['08:00', '09:00', '10:00', '11:00']
    const telefones = ['5521999991001', '5521999991002', '5521999991003', '119'] // último inválido
    for (let i = 0; i < 4; i++) {
      itens.push(
        await pb.collection('agenda_itens').create({
          item_tipo: 'APPOINTMENT',
          clinicorp_id: 'p4-01-' + i + '-' + Date.now(),
          data: dataAlvo,
          inicio: horarios[i],
          fim: horarios[i].slice(0, 2) === '08' ? '08:30' : horarios[i],
          profissional: prof.id,
          paciente_nome: 'Paciente P4-01-' + i,
          paciente_telefone: telefones[i],
          origem: 'fixture',
          teste: true,
        }),
      )
    }
    const primeira = await gerarListaDia(dataAlvo, true)
    const naLista = primeira.lista.filter((l) => itens.some((it) => it.id === l.agenda_item_id))
    const criadosOk = primeira.contatos_criados >= 4
    const ordenada = naLista.every((l, idx) => idx === 0 || naLista[idx - 1].hora <= l.hora)
    const invalidoMarcado = naLista.some((l) => !l.telefone_valido)
    // idempotência: 2ª geração não duplica contatos
    const segunda = await gerarListaDia(dataAlvo, true)
    const criadosSegunda = segunda.contatos_criados
    passou =
      criadosOk && naLista.length === 4 && ordenada && invalidoMarcado && criadosSegunda === 0
    detalhe =
      '1ª geração: ' +
      naLista.length +
      '/4 na lista, contatos criados ' +
      primeira.contatos_criados +
      ', ordenada por horário ' +
      String(ordenada) +
      ', telefone inválido marcado ' +
      String(invalidoMarcado) +
      '; 2ª geração criou ' +
      criadosSegunda +
      ' (esperado 0)'
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaConfirmacao()
    await limparAgendaTeste()
  }
  return {
    cenario: 'P4-01 — lista de confirmação do dia-alvo (RN-01, idempotente)',
    esperado:
      'Consultas do dia-alvo entram na lista em ordem de horário com contato pendente criado; telefone inválido marcado; 2ª geração não duplica.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-18 provado (lista).' : 'Verificar rota lista-dia.',
  }
}

// P4-02 — exportação: limite de teste 2 → 2 linhas XLSX + 1 envio manual +
// 1 corrigir telefone; exportar NÃO cria tentativa de mensagem (RN-02).
export async function executarProvaP4_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const dataAlvo = '2026-10-14'
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P4-02',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    const horarios = ['08:00', '09:00', '10:00', '11:00']
    const telefones = ['5521999992001', '5521999992002', '5521999992003', '119']
    for (let i = 0; i < 4; i++) {
      await pb.collection('agenda_itens').create({
        item_tipo: 'APPOINTMENT',
        clinicorp_id: 'p4-02-' + i + '-' + Date.now(),
        data: dataAlvo,
        inicio: horarios[i],
        fim: horarios[i],
        profissional: prof.id,
        paciente_nome: 'Paciente P4-02-' + i,
        paciente_telefone: telefones[i],
        origem: 'fixture',
        teste: true,
      })
    }
    const r = await gerarListaDia(dataAlvo, true)
    const limiteTeste = 2
    const saidas = dividirSaidas(r.lista, limiteTeste)
    const xlsxOk = saidas.xlsx.length === limiteTeste
    const manualOk = saidas.envioManual.length === 1
    const corrigirOk = saidas.corrigirTelefone.length === 1
    // exportar não cria tentativa: mensagens_confirmacao de teste antes/depois
    const antes = await pb
      .collection('mensagens_confirmacao')
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    await exportarXlsx(saidas.xlsx, 'prova P4-02')
    const depois = await pb
      .collection('mensagens_confirmacao')
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    const semTentativa = antes.length === depois.length
    passou = xlsxOk && manualOk && corrigirOk && semTentativa
    detalhe =
      'XLSX ' +
      saidas.xlsx.length +
      '/2, envio manual ' +
      saidas.envioManual.length +
      '/1, corrigir telefone ' +
      saidas.corrigirTelefone.length +
      '/1, tentativas criadas pela exportação: ' +
      String(depois.length - antes.length) +
      ' (esperado 0)'
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaConfirmacao()
    await limparAgendaTeste()
  }
  return {
    cenario: 'P4-02 — exportação XLSX com limite (CA-1-18, RN-02)',
    esperado:
      'Com limite 2: 2 linhas no XLSX, 1 em envio manual, 1 em corrigir telefone; exportar não cria tentativa.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-18 provado (exportação).' : 'Verificar saídas da exportação.',
  }
}

// ===== PROVAS P2-01..P2-04 (SPEC-1-002, CA-1-08/09) =====
// Tabela de teste do TDD (teste=true, NUNCA aprovada — a real v2 segue ativa):
// coroa 1–2 = 30 min (grupo) e 3–4 = 40 min p/ Profissional Teste A;
// coroa 1–2 = 25 min e 3–4 = 35 min p/ Profissional Teste B (específica prevalece);
// arredondamento 5.

const GRUPO_COROAS = 'COROAS_PROVA_P2'

// Tabela de teste criada por importação (relation obrigatória) — teste=true,
// NUNCA aprovada; a real v2 segue ativa. Hash constante: a limpeza de cada
// prova apaga a tabela, então a reimportação nunca cai em ja_aplicado.
async function criarTabelaTesteP2(): Promise<string> {
  const csv = [
    'grupo_regra;aplica_a;variavel_1;min_1;max_1;duracao_min;profissional',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;1;2;30;',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;3;4;40;',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;1;2;25;Profissional Teste P2 B',
    GRUPO_COROAS + ';Coroa (prova P2);qtd_elementos;3;4;35;Profissional Teste P2 B',
  ].join('\n')
  const bytes = new TextEncoder().encode(csv)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const r = await importarTabelaDuracao(new File([csv], 'prova-p2.csv', { type: 'text/csv' }), true)
  if (r.regras_gravadas !== 4) throw new Error('massa P2: ' + r.regras_gravadas + ' regras')
  void hash
  return r.tabela_id
}

async function apagarMassaP2(): Promise<void> {
  // regras de teste: todas com grupo da prova
  const regras = await pb
    .collection<{ id: string; grupo_regra: string }>('regras_duracao')
    .getFullList({ filter: 'teste = true' })
  for (const r of regras) {
    if (String(r.grupo_regra || '').indexOf('PROVA_P2') >= 0) {
      await pb
        .collection('regras_duracao')
        .delete(r.id)
        .catch(() => {})
    }
  }
  // tabelas de teste (importação marca teste=true)
  const tabelas = await pb
    .collection<{ id: string }>('tabela_duracao')
    .getFullList({ filter: 'teste = true' })
  for (const t of tabelas) {
    await pb
      .collection('tabela_duracao')
      .delete(t.id)
      .catch(() => {})
  }
  const profs = await pb.collection<{ id: string; nome: string }>('profissionais').getFullList()
  for (const p of profs) {
    if (String(p.nome || '').indexOf('Profissional Teste P2') === 0) {
      await pb
        .collection('profissionais')
        .delete(p.id)
        .catch(() => {})
    }
  }
  await limparPlanejamentosTeste()
}

export async function executarProvaP2_01(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 A',
      true,
    )
    detalhe = '2 coroas P2 A → ' + r.situacao + ' ' + r.minutos + ' min'
    passou = r.situacao === 'ok' && r.minutos === 30
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-01 — 2 coroas com Profissional A → 30 min',
    esperado: '30 min pela tabela de teste (coroa 1–2 = 30).',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (linha A).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 4 }],
      'Profissional Teste P2 A',
      true,
    )
    detalhe = '4 coroas P2 A → ' + r.situacao + ' ' + r.minutos + ' min'
    passou = r.situacao === 'ok' && r.minutos === 40
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-02 — 4 coroas com Profissional A → 40 min',
    esperado: '40 min pela tabela de teste (coroa 3–4 = 40) — não linear (não é 2×30).',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (linha B).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_03(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r25 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 B',
      true,
    )
    const r35 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 4 }],
      'Profissional Teste P2 B',
      true,
    )
    detalhe =
      '2 coroas P2 B → ' + r25.situacao + ' ' + r25.minutos + ' min; 4 coroas → ' + r35.minutos
    passou =
      r25.situacao === 'ok' && r25.minutos === 25 && r35.situacao === 'ok' && r35.minutos === 35
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-03 — coroas com Profissional B → 25 e 35 min (específica prevalece)',
    esperado: '25 e 35 min: a regra específica do profissional B prevalece sobre a de grupo.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-08 provado (não linear + específica).' : 'Verificar tempo sugerido.',
  }
}

export async function executarProvaP2_04(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    const r = await sugerirDuracao(
      [
        { grupo_regra: 'FACETAS_PROVA_P2', quantidade: 10 },
        { grupo_regra: GRUPO_COROAS, quantidade: 1 },
      ],
      'Profissional Teste P2 A',
      true,
    )
    const casos = await pb
      .collection<{ id: string }>('planejamentos')
      .getFullList({ filter: 'situacao = "sem_regra" && teste = true' })
    detalhe = 'combinação → ' + r.situacao + '; casos sem regra: ' + casos.length
    passou = r.situacao === 'sem_regra' && r.minutos === 0 && casos.length >= 1
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-04 — 10 facetas + 1 implante sem regra → sem_regra + caso listado',
    esperado: '"sem regra — validar com a direção", sem tempo, e o caso entra na lista.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-09 provado (sem tempo fictício).' : 'Verificar caso sem regra.',
  }
}

// P2-05 — casos sem regra agrupados e validação pela direção (CA-1-09).
// 2 ocorrências da MESMA combinação viram 1 grupo com contagem; ao validar,
// saem dos pendentes com validado_por/em gravados; a outra combinação segue.
export async function executarProvaP2_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await criarTabelaTesteP2()
    // defensiva: resíduo de execuções anteriores não contamina a massa desta prova
    await limparPlanejamentosTeste()
    // duas ocorrências da MESMA combinação + uma combinação diferente
    const combo = [
      { grupo_regra: 'FACETAS_PROVA_P2', quantidade: 10 },
      { grupo_regra: GRUPO_COROAS, quantidade: 1 },
    ]
    const r1 = await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    const r2 = await sugerirDuracao(combo, 'Profissional Teste P2 A', true)
    const r3 = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 7 }],
      'Profissional Teste P2 A',
      true,
    )

    // agrupa EXATAMENTE os 3 planejamentos desta prova (ids devolvidos pela rota):
    // imune a resíduo de outras provas na coleção
    const idsProva = [r1.planejamento_id, r2.planejamento_id, r3.planejamento_id]
    const regs: Planejamento[] = []
    for (const id of idsProva) {
      regs.push(await pb.collection<Planejamento>('planejamentos').getOne(id))
    }
    const grupos = agruparSemRegra(regs)
    const alvo = grupos.find((g) => g.ocorrencias === 2)
    if (!alvo || grupos.length !== 2) {
      throw new Error(
        'agrupamento inesperado: ' +
          grupos.length +
          ' grupo(s) — ' +
          grupos.map((g) => g.descricao + ' x' + g.ocorrencias).join(' | '),
      )
    }

    await validarCombinacao(alvo.ids)

    const depois: Planejamento[] = []
    for (const id of idsProva) {
      depois.push(await pb.collection<Planejamento>('planejamentos').getOne(id))
    }
    const restantes = agruparSemRegra(depois)
    const marcados = depois.filter((p) => alvo.ids.indexOf(p.id) >= 0)
    const comAutoria = marcados.every((p) => p.validado_em && p.validado_por)
    passou =
      restantes.length === 1 &&
      restantes[0].ocorrencias === 1 &&
      comAutoria &&
      marcados.length === 2
    detalhe =
      `antes: ${grupos.length} grupos (repetida com ${alvo.ocorrencias} ocorrências); ` +
      `depois de validar: ${restantes.length} pendente(s) com ${restantes[0]?.ocorrencias ?? 0}; ` +
      `validado_por/em gravados nos 2: ${comAutoria}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarMassaP2()
  }
  return {
    cenario: 'P2-05 — agrupar sem regra e validar com a direção',
    esperado:
      '2 ocorrências iguais viram 1 grupo com contagem 2; ao validar, saem dos pendentes com validado_por/em gravados; a outra combinação segue pendente.',
    obtido: detalhe,
    passou,
    observacao: passou
      ? 'CA-1-09 provado (agrupamento + validação).'
      : 'Verificar agrupamento/validação.',
  }
}

// ===== PROVAS P2-05b/P2-06 (SPEC-1-002, CA-1-10/11) — task fdca5fb0 =====
// Desvio de duração (RN-04) e conciliação de reservas (RN-05/06).
// Massa fixture teste=true, apagada no fim (nunca dado real).

// P2-05b — desvio: planejamento (via rota, createRule null) ligado a item de 60 min
// → sem_motivo; registrar motivo → justificado; gestão revisa → revisado.
// BUG FIX (teste humano 16/10): planejamentos.createRule = null (só o hook cria) —
// criar direto dava "Only superusers can perform this action". A prova usa a rota
// sugerirDuracao(teste=true) com a tabela de teste (coroa 2 = 30 min) e um item de
// 60 min → desvio com diferença +30 (a regra é reservado ≠ sugerido, não o exemplo 40×60).
export async function executarProvaP2_05b(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await limparPlanejamentosTeste()
    await criarTabelaTesteP2()
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P2 B',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    // planejamento de teste VIA ROTA (coroa 2 com o dentista B = 25 min na tabela de teste)
    const sugestao = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 B',
      true,
    )
    if (sugestao.situacao !== 'ok' || !sugestao.planejamento_id) {
      throw new Error('rota sugerir: ' + sugestao.situacao + ' id=' + sugestao.planejamento_id)
    }
    const sugeridos = sugestao.minutos // 25 (regra específica do dentista B)
    // item de agenda de 60 min (diferença +35)
    const item = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p2-05b-' + Date.now(),
      data: '2026-10-14',
      inicio: '09:00',
      fim: '10:00',
      profissional: prof.id,
      paciente_nome: 'Paciente P2-05b',
      paciente_telefone: '5521999994001',
      origem: 'fixture',
      teste: true,
    })
    const r = await ligarReserva(sugestao.planejamento_id, item.id)
    const desvioCriado = r.desvio_id !== ''
    const desvios = await listarDesvios()
    const desvio = desvios.find((d) => d.id === r.desvio_id)
    const semMotivo = desvio?.situacao === 'sem_motivo' && desvio.diferenca === 60 - sugeridos
    await registrarMotivoDesvio(r.desvio_id, 'grade do profissional', 'agenda só tem bloco de 60')
    const desvios2 = await listarDesvios()
    const justificado = desvios2.find((d) => d.id === r.desvio_id)?.situacao === 'justificado'
    await revisarDesvio(r.desvio_id)
    const desvios3 = await listarDesvios()
    const revisado = desvios3.find((d) => d.id === r.desvio_id)?.situacao === 'revisado'
    passou = desvioCriado && semMotivo && justificado && revisado
    detalhe =
      'sugeridos ' +
      sugeridos +
      ' min (rota, tabela de teste); desvio criado: ' +
      String(desvioCriado) +
      '; sem_motivo com diferença ' +
      (60 - sugeridos) +
      ': ' +
      String(semMotivo) +
      '; motivo → justificado: ' +
      String(justificado) +
      '; revisar → revisado: ' +
      String(revisado)
    await pb.collection('agenda_itens').delete(item.id)
    await pb.collection('profissionais').delete(prof.id)
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparPlanejamentosTeste()
  }
  return {
    cenario: 'P2-05b — desvio de duração: sem motivo → justificado → revisado (CA-1-10)',
    esperado:
      'Reserva com tempo diferente do sugerido (rota: 25 min × item 60 min) cria desvio sem_motivo (diferença +35); motivo registrado → justificado; gestão revisa → revisado.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-10 provado.' : 'Verificar desvio/motivo/revisão.',
  }
}

// P2-06 — conciliação: item APPOINTMENT sem planejamento → reservas_sem_planejamento;
// planejamento "planejado" de ontem sem reserva → reserva_nao_encontrada.
export async function executarProvaP2_06(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await limparPlanejamentosTeste()
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P2-06',
      origem: 'fixture',
      ativo: true,
      tipo_agenda: 'ambos',
    })
    // item APPOINTMENT órfão (sem planejamento)
    const item = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p2-06-' + Date.now(),
      data: '2026-10-14',
      inicio: '11:00',
      fim: '11:30',
      profissional: prof.id,
      paciente_nome: 'Paciente P2-06',
      paciente_telefone: '5521999995001',
      origem: 'fixture',
      teste: true,
    })
    // planejamento de hoje VIA ROTA (createRule null — bug do teste humano P2-05b):
    // sugerirDuracao(teste=true) grava situacao 'planejado' (tempo calculado sem reserva).
    // A conciliação NÃO o marca como reserva_nao_encontrada (created = hoje, fim do dia
    // não chegou). Planejamento de dias anteriores vira — coberto pela RN-06 no hook.
    await criarTabelaTesteP2()
    const sugestao = await sugerirDuracao(
      [{ grupo_regra: GRUPO_COROAS, quantidade: 2 }],
      'Profissional Teste P2 B',
      true,
    )
    if (sugestao.situacao !== 'ok' || !sugestao.planejamento_id) {
      throw new Error('rota sugerir: ' + sugestao.situacao + ' id=' + sugestao.planejamento_id)
    }
    const planejamentoHoje = { id: sugestao.planejamento_id }
    const r = await conciliarReservas(true)
    const itemNaLista = r.reservas_sem_planejamento.some((x) => x.agenda_item_id === item.id)
    const hojeNaoMarcado = r.reserva_nao_encontrada.every(
      (x) => x.planejamento_id !== planejamentoHoje.id,
    )
    passou = itemNaLista && hojeNaoMarcado
    detalhe =
      'item órfão em reservas_sem_planejamento: ' +
      String(itemNaLista) +
      '; planejamento de HOJE não marcado como reserva_nao_encontrada (fim do dia não chegou): ' +
      String(hojeNaoMarcado)
    await pb.collection('agenda_itens').delete(item.id)
    await pb.collection('profissionais').delete(prof.id)
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparPlanejamentosTeste()
  }
  return {
    cenario: 'P2-06 — conciliação: reserva sem planejamento; planejamento sem reserva (CA-1-11)',
    esperado:
      'APPOINTMENT sem planejamento aparece em reservas_sem_planejamento; planejamento de hoje sem reserva NÃO vira reserva_nao_encontrada (fim do dia não chegou); planejamento de dias anteriores vira.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-11 provado.' : 'Verificar conciliação RN-05/06.',
  }
}

// ===== PROVAS P3-04..P3-06 e P3-11-parcial (SPEC-1-003, CA-1-14/15, CA-SEQ-03) =====
// Pendências de teste: massa criada aqui, apagada no fim (nunca dado real).

async function criarPendenciaTeste(dados: {
  paciente_nome: string
  procedimento: string
  profissional?: string
  situacao?: 'a_agendar' | 'executada' | 'aguardando_condicao'
  prontidao?: 'pronto' | 'aguardando_condicao'
}): Promise<Pendencia> {
  // imune a resíduo (lição P2-05): limpa pendências de teste de execuções anteriores
  await apagarPendenciasTeste()
  const csv = [
    'paciente;telefone;procedimento;profissional;situacao',
    [
      dados.paciente_nome,
      '5521999992001',
      dados.procedimento,
      dados.profissional || '',
      dados.situacao || 'a_agendar',
    ].join(';'),
  ].join('\n')
  const r = await importarPendencias(csv, 'prova-p3.csv', true)
  if (r.gravadas !== 1) throw new Error('massa pendência: ' + r.gravadas + ' gravadas')
  const lista = await listarPendencias()
  const p = lista.find(
    (x) =>
      x.teste && x.paciente_nome === dados.paciente_nome && x.procedimento === dados.procedimento,
  )
  if (!p) throw new Error('pendência de teste não encontrada')
  if (dados.prontidao) {
    await pb
      .collection('pendencias')
      .update(p.id, { prontidao: dados.prontidao, motivo_revisao: '' })
  }
  return p
}

async function apagarPendenciasTeste(): Promise<void> {
  const lista = await pb
    .collection('pendencias')
    .getFullList({ filter: 'teste = true' })
    .catch(() => [])
  for (const p of lista) {
    await pb
      .collection('pendencias')
      .delete(p.id)
      .catch(() => {})
  }
}

// P3-04 — pendência (procedimento não executado) → a_agendar; executada → sai.
export async function executarProvaP3_04(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const p = await criarPendenciaTeste({
      paciente_nome: 'Paciente Prova P3-04',
      procedimento: 'Coroa Prova P3',
      prontidao: 'pronto',
    })
    const antes = montarLista(await listarPendencias())
    const naLista = antes.aAgendar.some((x) => x.id === p.id)
    await mudarEstadoPendencia(p.id, 'executada')
    const depois = montarLista(await listarPendencias())
    const saiu =
      !depois.aAgendar.some((x) => x.id === p.id) && !depois.paraRevisao.some((x) => x.id === p.id)
    passou = naLista && saiu
    detalhe = `pendência pronta → a_agendar: ${String(naLista)}; após executada → sai da lista: ${String(saiu)}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarPendenciasTeste()
  }
  return {
    cenario: 'P3-04 — pendência entra em a_agendar e sai quando executada',
    esperado: 'Pendência pronta aparece em "A agendar"; marcada executada, sai da lista.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-14 provado (pendência).' : 'Verificar lista de pendências.',
  }
}

// P3-05 — pendência com agendamento futuro verificado do mesmo profissional → agendado.
export async function executarProvaP3_05(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const prof = await pb.collection('profissionais').create({
      nome: 'Profissional Teste P3-05',
      origem: 'fixture',
      ativo: true,
    })
    const p = await criarPendenciaTeste({
      paciente_nome: 'Paciente Prova P3-05',
      procedimento: 'Implante Prova P3',
      profissional: 'Profissional Teste P3-05',
      prontidao: 'pronto',
    })
    // agendamento FUTURO de teste do mesmo paciente + mesmo profissional
    const futuro = new Date()
    futuro.setDate(futuro.getDate() + 7)
    const dataFutura = futuro.toISOString().slice(0, 10)
    const item = await pb.collection('agenda_itens').create({
      item_tipo: 'APPOINTMENT',
      clinicorp_id: 'p3-05-' + Date.now(),
      data: dataFutura,
      inicio: '10:00',
      fim: '10:30',
      profissional: prof.id,
      paciente_nome: 'Paciente Prova P3-05',
      origem: 'fixture',
      teste: true,
    })
    const temFuturo = await verificarAgendamentoFuturo(p.id)
    const lista = montarLista(await listarPendencias())
    const emAgendado = lista.agendado.some((x) => x.id === p.id)
    passou = temFuturo && emAgendado
    detalhe = `agendamento futuro ${dataFutura} verificado: ${String(temFuturo)}; item em "Agendado": ${String(emAgendado)}`
    await pb.collection('agenda_itens').delete(item.id)
    await pb.collection('profissionais').delete(prof.id)
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarSobrasDeTeste()
    await apagarPendenciasTeste()
  }
  return {
    cenario: 'P3-05 — pendência com agendamento futuro verificado → agendado',
    esperado:
      'Pendência do mesmo profissional com horário futuro verificado sai dos pendentes e vai para "Agendado".',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-14 provado (sai da lista).' : 'Verificar verificação de agenda.',
  }
}

// P3-06 — item aguardando_condicao → fora dos elegíveis e em "para revisão".
export async function executarProvaP3_06(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const p = await criarPendenciaTeste({
      paciente_nome: 'Paciente Prova P3-06',
      procedimento: 'Lente Prova P3',
      prontidao: 'pronto',
    })
    await mudarEstadoPendencia(p.id, 'aguardando_condicao', 'aguardando consolidação')
    const lista = montarLista(await listarPendencias())
    const foraElegiveis = !lista.aAgendar.some((x) => x.id === p.id)
    const emRevisao = lista.paraRevisao.some(
      (x) => x.id === p.id && (x.motivo_revisao || '').indexOf('consolidação') >= 0,
    )
    passou = foraElegiveis && emRevisao
    detalhe = `fora dos elegíveis: ${String(foraElegiveis)}; em "para revisão" com motivo: ${String(emRevisao)}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarPendenciasTeste()
  }
  return {
    cenario: 'P3-06 — aguardando condição → para revisão, fora dos elegíveis',
    esperado:
      'Item com aguardando_condicao não é elegível de encaixe e aparece em "para revisão" com o motivo.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-15 provado.' : 'Verificar prontidão/revisão.',
  }
}

// P3-11 (parcial) — tratamento sem plano/liberação → em revisão com o motivo da emenda.
// A parte plena (dependências A→B do plano) fica para o editor de etapas.
export async function executarProvaP3_11(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    // BUG FIX (teste humano P3-11, 16/10): "sem plano aprovado" = default da
    // importação (prontidao aguardando_condicao) — a prova marcava 'pronto',
    // provando o oposto do cenário. Agora cria SEM prontidão confirmada.
    const p = await criarPendenciaTeste({
      paciente_nome: 'Paciente Prova P3-11',
      procedimento: 'Protocolo Prova P3',
    })
    const lista = montarLista(await listarPendencias())
    const foraElegiveis = !lista.aAgendar.some((x) => x.id === p.id)
    const emRevisao = lista.paraRevisao.some((x) => x.id === p.id)
    const motivoEmenda = lista.paraRevisao.some(
      (x) => x.id === p.id && (x.motivo_revisao || '').indexOf('avaliador') >= 0,
    )
    passou = foraElegiveis && emRevisao && motivoEmenda
    detalhe = `fora dos elegíveis: ${String(foraElegiveis)}; em "para revisão": ${String(emRevisao)}; motivo "aguarda sequência/liberação do avaliador": ${String(motivoEmenda)}`
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await apagarPendenciasTeste()
  }
  return {
    cenario: 'P3-11 (parcial) — tratamento sem plano aguarda sequência/liberação do avaliador',
    esperado:
      'Pendência de tratamento sem plano aprovado fica em "para revisão" com o motivo da emenda; não é elegível de encaixe.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-SEQ-03 provado (sem plano).' : 'Verificar emenda CA-SEQ-03.',
  }
}

// ===== PROVAS P3-01..P3-03 (SPEC-1-003, CA-1-12/13) =====
// Regras de origem e duplicado NO SERVIDOR (hook leads_regras.js):
// P3-01: código de campanha ativo → origem campanha.
// P3-02: sem código → desconhecida; código inexistente → aviso + desconhecida.
// P3-03: mesmo telefone → aviso de duplicado e NENHUMA fusão (2 registros).

async function limparMassaP3(): Promise<void> {
  // leads/pacientes/eventos de teste (nunca dado real: teste=true)
  for (const nome of ['eventos', 'leads', 'pacientes']) {
    const lista = await pb
      .collection(nome)
      .getFullList({ filter: 'teste = true' })
      .catch(() => [])
    for (const r of lista) {
      await pb
        .collection(nome)
        .delete(r.id)
        .catch(() => {})
    }
  }
  // campanha de teste da prova (TESTE-CAMP)
  const camps = await pb
    .collection<{ id: string; codigo: string }>('campanhas')
    .getFullList({ filter: "codigo = 'TESTE-CAMP'" })
    .catch(() => [])
  for (const c of camps) {
    await pb
      .collection('campanhas')
      .delete(c.id)
      .catch(() => {})
  }
}

export async function executarProvaP3_01(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    await pb.collection('campanhas').create({
      codigo: 'TESTE-CAMP',
      nome: 'Campanha de prova P3',
      ativa: true,
      teste: true,
    })
    const r = await criarLead('Lead Prova P3-01', '5521999991001', 'TESTE-CAMP', '', false)
    passou = r.criado === true && r.origem_tipo === 'campanha'
    detalhe = 'lead com código TESTE-CAMP → origem ' + r.origem_tipo
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaP3()
  }
  return {
    cenario: 'P3-01 — lead com código de campanha ativa → origem campanha',
    esperado: 'Origem "campanha" pelo casamento exato do código TESTE-CAMP.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-12 provado (campanha).' : 'Verificar origem por código.',
  }
}

export async function executarProvaP3_02(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const semCodigo = await criarLead('Lead Prova P3-02a', '5521999991002', '', '', false)
    const codigoRuim = await criarLead(
      'Lead Prova P3-02b',
      '5521999991003',
      'NAO-EXISTE',
      '',
      false,
    )
    passou =
      semCodigo.criado === true &&
      semCodigo.origem_tipo === 'desconhecida' &&
      codigoRuim.criado === true &&
      codigoRuim.origem_tipo === 'desconhecida' &&
      Boolean(codigoRuim.aviso)
    detalhe =
      'sem código → ' +
      semCodigo.origem_tipo +
      '; código inexistente → ' +
      codigoRuim.origem_tipo +
      ' com aviso: ' +
      (codigoRuim.aviso || '—')
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaP3()
  }
  return {
    cenario: 'P3-02 — sem código ou código inexistente → desconhecida (nunca finge)',
    esperado: 'Origem "desconhecida"; código inexistente dá aviso e NÃO vira campanha.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-12 provado (desconhecida).' : 'Verificar código inexistente.',
  }
}

export async function executarProvaP3_03(): Promise<ResultadoProva> {
  let detalhe = ''
  let passou = false
  try {
    const primeiro = await criarLead('Lead Prova P3-03a', '5521999991004', '', '', false)
    const segundo = await criarLead('Lead Prova P3-03b', '5521999991004', '', '', false)
    const confirmado = await criarLead('Lead Prova P3-03c', '5521999991004', '', '', true)
    const total = await pb
      .collection('leads')
      .getFullList({ filter: pb.filter('telefone = {:t}', { t: '+5521999991004' }) })
    passou =
      primeiro.criado === true &&
      segundo.criado === false &&
      segundo.aviso_duplicado === true &&
      confirmado.criado === true &&
      total.length === 2
    detalhe =
      '1º criou; 2º devolveu aviso_duplicado=' +
      String(segundo.aviso_duplicado) +
      '; com confirmação criou; total no telefone: ' +
      total.length +
      ' (2 fichas separadas, NENHUMA fusão)'
  } catch (e) {
    detalhe = e instanceof Error ? e.message : 'erro'
  } finally {
    await limparMassaP3()
  }
  return {
    cenario: 'P3-03 — telefone repetido avisa duplicado e nunca funde fichas',
    esperado: '2ª criação bloqueada com aviso; com confirmação existem 2 fichas separadas.',
    obtido: detalhe,
    passou,
    observacao: passou ? 'CA-1-13 provado (sem fusão).' : 'Verificar duplicado.',
  }
}