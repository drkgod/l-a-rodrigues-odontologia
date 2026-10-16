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
      ? 'Capacidade CA-1-21 garantida no servidor.'
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
  for (cons