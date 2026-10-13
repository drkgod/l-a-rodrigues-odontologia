# Análise — Task c7194c3e: Trazer a agenda do Clinicorp para a central

**SPEC**: spec-1-001-agenda-da-unidade.md · **Critérios**: CA-1-02/04/06 · **Provas**: P1-02/03/04/07/08
**Recorte desta task**: importação de agenda por CSV/XLSX ou fixture, SEM API (integração real adiada pra fase 4). Inclui as subtasks em ordem: ler profissionais/cadeiras/status/categorias (a38335a3) + conferir 20 horários (416ed8cc).

## Objetivo e resultado observável

Você (ou a CRC) exporta a agenda do Clinicorp pra um arquivo, importa na central, e a central mostra a agenda do dia com origem ("Dados importados — sem sincronização"), data do lote e os horários ocupados/livres. Reimportar o mesmo arquivo não duplica nada. Uma consulta que sumir numa leitura parcial continua ocupada/incerta — nunca vira vaga sozinha. Conferência: 20 horários batem com o arquivo de origem.

## Estado atual (baseline)

- Skip v0.0.9 (77dd470) publicada; QA verde; migrations 0001/0002 applied.
- Coleções existentes: users (com papel/ativo/profissional), profissionais, cadeiras, config_unidade, provas_execucoes. `agenda_itens`, `status_clinicorp`, `categorias_clinicorp`, `horarios_profissional` e `sincronizacoes` AINDA NÃO EXISTEM — nasce nesta task.
- Telas: Login, Sem acesso, Index, Provas. Menu por função funcionando.
- Prova P1-01 passando (verificada 5×).

## Plano em código (ordem: migration → hook/rota → serviço → telas → rotas/menu → provas)

### 1. Migration `0003_agenda_importacao.js` (aditiva)

- **`status_clinicorp`**: clinicorp_id, descricao, tipo. Regras: leitura com papel+ativo; escrita gestão.
- **`categorias_clinicorp`**: clinicorp_id, descricao, tipo_agenda (avaliacao/tratamento/nao_mapeada). Regras idem.
- **`horarios_profissional`**: profissional (rel), dia_semana (0–6), inicio, fim (hora local). Regras idem.
- **`agenda_itens`**: item_tipo (APPOINTMENT/ASSIGN/EVENT), clinicorp_id, data, inicio, fim, duracao_reservada_min, profissional (rel), cadeira (rel), paciente_nome, paciente_telefone, paciente_clinicorp_id, status (rel), categoria (rel), cancelado/excluido/notas, clinicorp_alterado_em, sincronizado_em, origem (fixture/manual/importacao), ausente_na_ultima_leitura, alerta, teste. Índice único em (origem, item_tipo, clinicorp_id). Regras: leitura com papel+ativo; escrita gestão.
- **`sincronizacoes`**: inicio, fim, situacao (ok/parcial/falha/nao_configurado), janelas, itens_lidos, itens_gravados, erro_resumo, disparada_por, origem, arquivo_hash, versao_mapeamento, contagem_rejeitada, periodo_coberto. Regras: leitura com papel+ativo; create/update gestão.
- Seed idempotente: status básicos (Confirmado, Sem confirmação, Atendido, Falta) e categorias básicas.

### 2. Rota de importação (hook `agenda_validar_lote.js` + `agenda_aplicar_lote.js`)

`POST /backend/v1/dados/validar-lote` e `POST /backend/v1/dados/aplicar-lote` (SPEC manda essas duas rotas, somente gestão):
- **validar-lote**: valida linha a linha (campos essenciais, datas válidas, início<fim, profissional/cadeira conhecidos), devolve prévia + rejeitadas com motivo. NÃO grava nada.
- **aplicar-lote**: aplica os registros validados; upsert por (origem, item_tipo, clinicorp_id); grava hash do arquivo (reimport idêntico não duplica — devolve contagem "já aplicado"); registra em `sincronizacoes` (autor, data, contagens, período). Lote parcial NÃO cancela registro ausente: marca `ausente_na_ultima_leitura` — ocupado/incerto permanece até cancelamento/exclusão explícito.
- Acesso por `requireAuth` (regras de coleção garantem papel gestão).

### 3. Serviços

- `agenda.ts`: parser CSV (vírgula ou ponto-e-vírgula) + validarLote/aplicarLote (rotas) + listarAgendaDoDia/listarProfissionais/listarCadeiras/listarStatus/listarHorarios/listarLotes.
- Histórico de lotes na própria tela Importar (coleção sincronizacoes).

### 4. Telas

- **Importar dados** (`/importar`, gestão): arquivo CSV → prévia com contagens (válidas/rejeitadas com motivo) → botão "Aplicar lote" → histórico de lotes na mesma tela.
- **Agenda** (`/agenda`, todos os papéis): visão por dia (data + profissional + cadeira), blocos ocupados com paciente/hora/status (rótulo legível), vagas livres calculadas dos horários do dentista menos ocupados/bloqueios; banner "Dados importados — sem sincronização"; consulta dividida agrupada com alerta; "horário não cadastrado" quando o dentista não tem grade.

### 5. Provas (tela Provas)

- P1-02: fixture de 20 itens → contagens registradas.
- P1-03: mesmo lote 2× → sem duplicar (ja_aplicado).
- P1-04: linha inválida → rejeitada com motivo, válidas preservadas.
- P1-05: bloqueio 10–11h + dia inteiro → nunca vira vaga.
- P1-06: 2 blocos adjacentes mesmo paciente → 1 visita com alerta.
- P1-07: leitura parcial → omitido continua ocupado/incerto.
- P1-08: namespaces fixture/manual/importado isolados; zero chamadas externas.

## Ficha de Tela — Importar dados (`/importar`)

- Quem usa: gestão, computador.
- Tarefa: importar a agenda exportada do Clinicorp e conferir o resultado.
- Ação primária: "Aplicar lote" (só depois da prévia).
- Padrão: importação (arquivo → prévia → confirmação → resultado).
- Dados: arquivo → sincronizacoes (lote) → agenda_itens.
- Estados: carregando · sem arquivo · prévia com rejeitadas · sucesso com contagens · erro com saída.
- Validações: arquivo obrigatório; formato CSV (o Clinicorp exporta CSV); linhas rejeitadas listadas com motivo.
- Celular: prévia em cards; importação é tarefa de computador.
- Textos: "Importar agenda", "Prévia do lote", "Aplicar lote", "Nenhuma linha válida", "X linhas rejeitadas — veja os motivos".

## Ficha de Tela — Agenda (`/agenda`)

- Quem usa: todos os papéis; computador e celular.
- Tarefa: ver a agenda do dia por profissional/cadeira e saber o que está ocupado/livre.
- Ação primária: trocar de dia/profissional (navegação, não escrita).
- Padrão: lista de blocos por profissional (celular-friendly) + colunas no desktop.
- Dados: agenda_itens (ocupados) + horarios_profissional (grade) → vagas livres.
- Estados: carregando · vazio de primeiro uso (instrução pra importar) · vazio de filtro (dia sem agenda) · "horário não cadastrado" · erro com saída.
- Celular: visão por UM profissional (lista de blocos), sem rolagem horizontal.
- Acessibilidade: status nunca só por cor; blocos com texto (hora + paciente + status).
- Textos: "Agenda do dia", "Dados importados — sem sincronização", "Horário não cadastrado", "Vaga livre", "Ocupado".

## Teste de mesa — regras centrais

| Entrada | Regra | Saída |
|---|---|---|
| Lote com 20 itens válidos | aplicar com upsert por namespace | 20 gravados, lote "ok" |
| Mesmo lote 2× | hash do arquivo | 2ª vez: 0 novos, "já aplicado" |
| Linha com data "32/13/2026" | validação | rejeitada com motivo; lote não perde as outras |
| Consulta A presente no lote 1, ausente no lote 2 | lote parcial | A fica `ausente_na_ultima_leitura` — continua OCUPADA |
| Bloqueio 10–11h | item_tipo EVENT/ASSIGN | intervalo não aparece como vaga |
| 2 blocos 09:00-09:30 e 09:30-10:00 mesmo paciente | agrupamento | 1 visita 09:00–10:00 com alerta |
| Cancelamento explícito no arquivo (status cancelado) | cancelado=true | vira livre (único jeito de liberar) |

## Matriz critério → prova

| Critério | Prova |
|---|---|
| CA-1-02 (fixture/arquivo aplica com origem/lote/período/contagens) | P1-02 |
| CA-1-04 (origem/data/mode aparecem; importação inválida preserva dados; zero chamada externa) | P1-04 + P1-08 |
| CA-1-06 (reimportação não duplica; visita dividida com alerta e IDs preservados) | P1-03 + P1-06 |
| CA-1-05 (ocupado/bloqueio/incerto nunca livre) | P1-05 + P1-07 |
| CA-1-03 (20 itens conferem com a massa) | P1-02 + conferência dos 20 (subtask 416ed8cc) |

## Riscos

- XLSX parse no navegador: o template não tem lib de planilha — CSV é o formato principal (o Clinicorp exporta CSV). Se tiver XLSX sem CSV, me avisa que avalio caminho.
- Índice único com reimport: dedup por hash do arquivo no hook (idempotente).
- Agenda por colunas é a tela mais complexa da fase — começou com lista de blocos por profissional (celular-friendly).

## Decisões que a SPEC já fechou (não pergunto)

- Sem API/token/polling; arquivos exportados ou fixture.
- Lote parcial não cancela registro (ausente_na_ultima_leitura).
- Cancelamento só explícito.
- Fixture teste=true isolada.

## O que precisava de você (não bloqueou)

- A planilha CL-001 (tabela de tempos) é OUTRA task (f4982b80) — não precisava dela aqui.
- Pra testar com arquivo REAL: exporta a agenda do dia do Clinicorp em CSV e manda quando quiser (a prova usa massa sintética, então a task não dependia disso).

## Roteiro de teste humano (executado pelo champion 13/10 ~14:42)

1. Entrar como gestão → Importar → importar o arquivo de teste → conferir prévia e contagens;
2. Aplicar o lote → abrir Agenda → conferir que os horários aparecem com o banner "Dados importados — sem sincronização";
3. Importar o MESMO arquivo de novo → conferir que NADA duplicou;
4. Importar arquivo com uma linha errada → conferir que a linha vem rejeitada com motivo e o resto entra;
5. Conferir que um horário ocupado nunca aparece como vaga; bloqueio ocupa o intervalo;
6. Abrir no celular → agenda de um dentista empilhada, sem rolagem lateral.

## RESULTADO DA EXECUÇÃO (13/10/2026)

- Implementado conforme plano: migration 0003 (agenda_itens/status_clinicorp/categorias_clinicorp/horarios_profissional/sincronizacoes, índice único por namespace); hooks agenda_validar_lote.js e agenda_aplicar_lote.js; services agenda.ts (parser CSV); telas Importar e Agenda; provas P1-02..08.
- DEBUG: aplicar-lote TRAVOU o pod (timeout sem log) — causa raiz: $app.runInTransaction no JSVM (callback não vê escopo externo nem `e`). Fix: sem transação, upsert idempotente por namespace (índice único como rede de segurança). Publicado v0.0.11 (84f34d2).
- E2E no servidor (provas reais, dados apagados depois): validar-lote 200 + rejeição com motivo; sem auth = 401; aplicar-lote = 1 gravado; reimport mesmo hash = ja_aplicado true; leitura parcial = ausente_na_ultima_leitura true; mesmo ID em fixture e manual = 2 registros separados; EVENT de bloqueio gravado; limpeza = 0 restantes.

## DEBUG (13/10/2026, v0.0.12→0.0.15)

- Rodada 1: botões das provas novas não registravam resultado (chamavam a prova direto) — fluxo executar→registrar aplicado a todas. Correção interim derrubou a função limpar (tela branca) — restaurada (v0.0.14).
- Rodada 2: P1-02 na tela gravava 0 itens — aplicar-lote revalidava profissional por nome, validar-lote devolve ID; mapa aceita ID ou nome (v0.0.15).
- Prova real na tela em produção (v0.0.15): P1-02 = 20 itens, ✓ Passou, registrado na tabela com autor/hora.

## CONCLUSÃO (13/10/2026)

- Teste humano aprovado pelo champion: 7 provas executadas na tela em produção, todas ✓ Passou (14:42, admin@lai.local).
- Verificação independente completa: versão no ar = testada, migrations applied, QA verde, zero API externa, sem segredo, diff no escopo, banco sem dados de teste.
- Achado corrigido no fecho: filtro de cadeira funcional (v0.0.16, ref 3dd018e).
- Estado: concluida. 5/49 cards da fase 1.
