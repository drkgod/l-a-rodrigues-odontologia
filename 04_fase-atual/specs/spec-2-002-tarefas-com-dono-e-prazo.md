# SPEC-2-002 — Tarefas com dono e prazo

**Fase:** 2  
**Status:** planejada  
**Dono:** clínica com o Maestro; aceite do Luiz  
**Origem no escopo:** fase 2 (tarefas de continuidade; tarefa com responsável e prazo), RQ-009, RQ-017, RQ-018, LRQ-007  
**Degrau da solução:** construção mínima — coleção nova `tarefas`, funções de servidor reutilizáveis e uma tela, usando o histórico da Ficha que já existe.

## Contexto e decisões fechadas

- **Estado atual:**
  - **Ficha:** mostra histórico em `eventos` (append-only) e uma próxima ação com prazo e responsável, com a vencida destacada (SPEC-1-003).
  - **Falta:** vira pendência de reagendamento em `pendencias`, que alimenta Pacientes a agendar.
  - **Lista de trabalho:** não existe uma lista de trabalho por pessoa.
- **Estado desejado:** cada combinado, retorno ou contato a fazer vira uma tarefa com responsável, prazo e desfecho; cada pessoa vê a sua lista e a gestão acompanha a unidade.
- **Decisões já fechadas:**
  - **Coleções:** `tarefas` é uma coleção nova. `pendencias` e a falta como pendência de reagendamento continuam como estão.
  - **Próxima ação da Ficha:** continua como está e não é migrada. Criar ou concluir tarefa não altera a próxima ação, e a próxima ação não cria tarefa.
  - **Conclusão:** a tarefa nunca é concluída sem desfecho. "Sem contato" exige a próxima tarefa ou o motivo para encerrar, para o lead não sumir.
  - **Vencimento:** tarefa vencida aparece para a gestão no mesmo dia, sem prazo extra.
  - **Leitura:** toda leitura passa por rotas do servidor; a leitura direta da coleção fica fechada.
  - **Mensagens:** nesta fase não há cadência automática nem mensagem ao paciente.
- **Bloqueios:** nenhum.

## Resultado observável

Na tela Minhas tarefas, cada pessoa vê o que tem para fazer, com as vencidas primeiro, e registra o desfecho ao concluir. A gestão vê todas as tarefas da unidade, as vencidas e as que ficaram sem responsável ativo, e reatribui. Cada tarefa criada, concluída, cancelada ou reatribuída aparece no histórico da Ficha do paciente.

## Limites e dependências

- **Inclui:**
  - Tarefas: criar à mão, listar por responsável, concluir com desfecho, cancelar com motivo e reatribuir (gestão).
  - Vencimento: destacar as vencidas e levar à gestão as tarefas de usuário desativado.
  - Histórico: registrar cada ação na Ficha.
  - Reuso: funções de servidor de criar e cancelar, usadas também pela SPEC-2-003.
- **Fora de escopo:** cadência, mensagens, lembrete por WhatsApp ou e-mail; regras específicas de prótese e pré-cirúrgico (fase 3).
- **Entradas e pré-condições:** usuários e papéis da fase 1; Ficha do paciente; leads da fase 1 (todo lead tem Ficha desde a fase 1).
- **Saídas/artefatos:**
  - **Coleção:** `tarefas`.
  - **Funções de servidor:** `tarefaCriar` e `tarefaCancelar`.
  - **Rotas:** criar, concluir, cancelar e reatribuir.
  - **Tela:** `/tarefas`, com as abas Minhas tarefas e Unidade (gestão).
  - **Ficha:** lista de tarefas do paciente e eventos novos no histórico.
- **Dependências e responsáveis:** Maestro constrói; Luiz testa.
- **Atores e permissões mínimas:**
  - **Criar:** as CRCs, a recepção e a gestão criam tarefas para pacientes ou leads que já leem pela fase 1. O dentista cria tarefa só para paciente da própria fila do dia ou de plano em que é o avaliador atribuído, sem ganhar acesso à Ficha.
  - **Concluir e cancelar pela tela:** o responsável ou a gestão. Criação e cancelamento disparados por outra SPEC usam as funções de servidor, na transação de quem chama, com autor = quem disparou.
  - **Reatribuir:** só a gestão, para usuário ativo.
  - **Ler:** cada usuário lê as tarefas em que é responsável; a gestão lê todas da unidade. Na Ficha, a lista de tarefas do paciente aparece para quem já lê aquela Ficha pela fase 1.
- **Superfícies/arquivos/configurações afetadas:**
  - **Migration nova da coleção `tarefas`:** regras de lista, leitura e escrita fechadas; índice único parcial em `origem_chave` só quando não vazia.
  - **Migration aditiva em `eventos.tipo`:** acrescenta `tarefa_criada`, `tarefa_concluida`, `tarefa_cancelada` e `tarefa_reatribuida`, sem mudar os existentes.
  - **Outras:** hook novo de regras; tela `/tarefas`; menu; Ficha.
- **Risco e plano B:** lista grande demais → filtros por tipo e por paciente.
- **Rollback ou reversão:** coleção e tipos de evento aditivos; esconder a tela não afeta as telas da fase 1.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Tela/rota/função → `tarefas` | Central | `tipo` (combinado_avaliacao, continuidade, contato_lead, aprovar_avaliacao, outra); `paciente` ou `lead` (um dos dois obrigatório); `descricao`; `responsavel` (usuário ativo); `prazo` (data); `origem_tipo` (manual, avaliacao); `origem_id`; `origem_chave`; `estado` (aberta, feita, cancelada); `desfecho_resultado` (feito, sem_contato, paciente_recusou, remarcado, outro); `desfecho_texto`; `concluida_por`; `concluida_em`; `cancelada_motivo`; `cancelada_por`; `unidade`; `teste` | Rotas e funções do servidor; regras da coleção fechadas | Criar com `origem_chave` existente devolve a tarefa existente | 400 com o campo; 403 sem permissão |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Criar | Exige tipo, paciente ou lead, descrição, responsável ativo e prazo | — | RQ-009 |
| RN-02 | Concluir | Exige `desfecho_resultado`; `outro` exige texto; `sem_contato` exige a próxima tarefa (responsável e prazo) ou o texto do motivo para encerrar | — | RQ-009, RQ-018 |
| RN-03 | Cancelar | Exige motivo | — | RQ-008 |
| RN-04 | Prazo menor que hoje e estado aberta | Vencida na lista do responsável e na aba Unidade | — | RQ-009 (vencimento escalona) |
| RN-05 | Responsável desativado | Tarefas abertas dele aparecem na aba Unidade como "sem responsável ativo" até a reatribuição | — | RQ-018 |
| RN-06 | Mesma origem | Uma tarefa por `origem_chave` não vazia | Tarefa manual sem origem | RQ-017, RQ-018 |
| RN-07 | Criar, concluir, cancelar ou reatribuir | Evento na Ficha com tipo, autor, hora e descrição da tarefa | — | LRQ-007 |
| RN-08 | Vencimento | Calculado em America/Sao_Paulo | — | Fase 1 |

## Fluxo e regras

1. Em `/tarefas`, a pessoa cria uma tarefa escolhendo o paciente ou o lead, o tipo, a descrição, o responsável e o prazo.
2. Minhas tarefas mostra as abertas do usuário: primeiro as vencidas, depois por prazo.
3. Ao concluir, a pessoa escolhe o resultado; "outro" pede o texto; "sem contato" pede a próxima tarefa ou o motivo para encerrar.
4. A gestão vê a aba Unidade, com filtros por responsável, tipo, vencidas e sem responsável ativo, e reatribui.
5. Cada ação gera um evento na Ficha.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Tarefa criada e concluída com desfecho | Some de Minhas tarefas e aparece no histórico | — |
| Limite | Prazo ontem | Vencida para o responsável e para a gestão | — |
| Limite | "Sem contato" com a próxima tarefa | A tarefa fecha e a próxima aparece para o responsável | — |
| Falha | Concluir sem resultado | Recusado com o campo faltante | Pedir o resultado |
| Falha | Usuário desativado com tarefas abertas | Na aba Unidade como "sem responsável ativo" | Gestão reatribui |
| Falha | Mesma `origem_chave` duas vezes | Uma tarefa só | Devolver a existente |

## Instruções de execução para o Maestro

1. **Ler antes de alterar:** esta SPEC, a Ficha, o hook de regras da Ficha e a lista de `eventos.tipo` em `07-sistemas/`.
2. **Alterar somente:** as migrations desta SPEC, o hook novo, a tela `/tarefas`, o menu e a lista de tarefas na Ficha.
3. **Não alterar:** a coleção `pendencias`, a falta como pendência de reagendamento, a próxima ação da Ficha e as regras da fase 1.
4. **Executar nesta ordem:** coleção, funções e rotas de criar e listar; concluir e cancelar com eventos; aba Unidade com vencidas, sem responsável ativo e reatribuição.
5. **Parar e pedir validação quando:** nenhuma parada prevista.
6. **Estado válido ao parar:** as telas da fase 1 funcionam e as provas P1 a P6 passam.
7. **Ritmo:** construir as tasks vinculadas em sequência, sem pedir autorização nem teste a cada task. O teste do cliente é o roteiro único de `## Teste humano do cliente`, quando todas as tasks vinculadas estiverem no ar. Ponto de aprovação antes disso: nenhum.

## Checklist de execução

- [ ] Coleção `tarefas` com regras fechadas e índice único parcial.
- [ ] Funções `tarefaCriar` e `tarefaCancelar` reutilizáveis.
- [ ] Criar, concluir, cancelar e reatribuir com RN-01 a RN-08.
- [ ] Minhas tarefas e aba Unidade no ar.
- [ ] Tipos de evento novos e eventos na Ficha.
- [ ] Provas P2.2 na tela Provas.

## Critérios de aceite

- [ ] **CA-2-05:** tarefa sem responsável ativo, prazo, descrição ou paciente/lead é recusada; tarefa válida aparece em Minhas tarefas do responsável e só nela (e na aba Unidade da gestão).
- [ ] **CA-2-06:** concluir exige resultado, "outro" exige texto, "sem contato" exige a próxima tarefa ou o motivo, e cancelar exige motivo; as ações aparecem no histórico da Ficha com autor e hora.
- [ ] **CA-2-07:** tarefa vencida aparece destacada para o responsável e para a gestão; tarefas de usuário desativado aparecem para a gestão como "sem responsável ativo" e saem dali ao serem reatribuídas a um usuário ativo.
- [ ] **CA-2-08:** criar duas vezes com a mesma origem resulta em uma tarefa só, e tarefas manuais sem origem não colidem entre si.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P2.2-01: criar sem prazo, sem descrição, sem paciente nem lead, e com responsável inativo | Rotas pela tela Provas | 400 com o campo em cada caso | Registro da tela Provas |
| RED | P2.2-02: concluir sem resultado; "outro" sem texto; "sem contato" sem próxima nem motivo; cancelar sem motivo | Rotas | 400 em cada caso | Registro da tela Provas |
| RED | P2.2-03: CRC conclui tarefa de outra pessoa; CRC lê a coleção direto | Rotas e leitura direta | 403; leitura direta negada | Registro da tela Provas |
| RED | P2.2-08: CRC reatribui; gestão reatribui para usuário inativo | Rota | 403; 400 | Registro da tela Provas |
| GREEN | P2.2-04a: criar e listar | Rota + tela | Tarefa em Minhas tarefas do responsável; ausente para outro usuário | Registro da tela Provas |
| GREEN | P2.2-04b: concluir com desfecho | Rota | Tarefa feita; evento `tarefa_concluida` na Ficha | Registro da tela Provas |
| GREEN | P2.2-05: prazo ontem | Massa de teste | Vencida na lista e na aba Unidade | Registro da tela Provas |
| GREEN | P2.2-09: gestão reatribui tarefa de usuário desativado | Rota | Sai de "sem responsável ativo", entra em Minhas tarefas do novo, evento na Ficha | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.2-06: mesma origem duas vezes; duas manuais sem origem | Rotas | Uma tarefa na primeira; duas na segunda | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.2-07: desativar o responsável | Rota | Tarefas na aba Unidade como "sem responsável ativo" | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P1 a P6 da fase 1 | Tela Provas | Passam | Registro da tela Provas |

**Dados/fixtures:** pacientes, leads e usuários de teste marcados `teste`; limpeza pelo botão da tela Provas.  
**Caminhos de erro obrigatórios:** campo ausente, permissão negada, leitura direta, usuário desativado, origem repetida.  
**Evidência exigida:** registro das provas e uma captura de Minhas tarefas com uma vencida.

## Teste humano do cliente

- **Origem:** CL-008
- **Quando:** quando todas as tasks de `## Tasks vinculadas` estiverem no ar
- **Quem testa:** Luiz e uma pessoa da CRC
- **Passos:** criar uma tarefa para a CRC com prazo de ontem; entrar como CRC e ver a vencida no topo; concluir com desfecho; abrir a Ficha do paciente e ver o registro; como gestão, filtrar as vencidas e reatribuir uma tarefa.
- **Resultado esperado:** a tarefa aparece para quem deve, não fecha sem desfecho e fica no histórico.
- **Evidência do aceite:** "testei, pode seguir" do Luiz no grupo.

## Handoff e operação

- **Como demonstrar:** Minhas tarefas com uma vencida e a Ficha com o histórico.
- **Como operar depois:** cada pessoa começa o dia pela sua lista; a gestão olha as vencidas e as sem responsável ativo.
- **Como monitorar:** filtros de vencidas e de sem responsável ativo na aba Unidade.
- **Pendência conhecida:** nenhuma.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| f046773a-58f1-465a-8f40-da7a840b8e36 | Criar a lista de tarefas de cada pessoa | L A Rodrigues | SPEC-2-002 | CA-2-05, CA-2-08 | P2.2-01, P2.2-03, P2.2-04a, P2.2-06 | Provas e tela `/tarefas` | Fase 1 no ar | ☐ |
| 59352d82-b2a5-4e7a-a730-cda2db3037b6 | Concluir tarefa com desfecho registrado na ficha | L A Rodrigues | SPEC-2-002 | CA-2-06 | P2.2-02, P2.2-04b | Provas e evento na Ficha | Lista de tarefas no ar | ☐ |
| e3f767d3-e42c-4910-afae-532bf8e12e80 | Mostrar à gestão as tarefas vencidas e sem responsável ativo | L A Rodrigues | SPEC-2-002 | CA-2-07 | P2.2-05, P2.2-07, P2.2-08, P2.2-09 | Provas e captura da aba Unidade | Lista de tarefas no ar | ☐ |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
