# SPEC-1-005 — Atendimento do dia

**Fase:** 1  
**Status:** planejada  
**Dono:** L A Rodrigues (execução com o Maestro) · aceite: Rodrigo Santos (consultor)  
**Origem no escopo:** Fase 1, função (6) Atendimento do dia; RQ-007, RQ-018 (falta vira pendência), LRQ-006; decisões DH-05 (substitui o Trello), AC-L02 (botão iniciar/finalizar); itens CL-006 e CL-008  
**Degrau da solução:** construção mínima no projeto Skip da SPEC-1-001; leitura dos procedimentos executados já feita pela SPEC-1-003.

## Modo obrigatório da fase — AC-13-IT

Esta SPEC executa apenas no app e banco nativos. Dados vêm da SPEC-1-001 por fixture separada, arquivo validado ou cadastro auditado; não há API externa, segredo de fornecedor, webhook, polling ou chamada de IA. Referência a Clinicorp significa dados exportados/manual identificados, nunca leitura automática. Toda tela exibe origem/lote/data e “sem sincronização”. Provas e teste humano usam a mesma massa local. Teste de saída deve registrar zero chamadas a Clinicorp/Meta/IA/transcrição; recursos nativos do Skip são permitidos. Envio/reserva real e retirada de controles anteriores ficam para a fase 4. Não usar fixture para afirmar resultado operacional.

## Contexto e decisões fechadas

- **Estado atual:** a recepção cria um cartão no Trello, numa lista por profissional, quando o paciente chega, com etiquetas como ORÇAMENTO, REAVALIAÇÃO, PACIENTE ATRASADO, ENCAIXE e EMERGÊNCIA. A CRC olha o Trello para saber quem compareceu. Não há registro de espera, início e fim do atendimento.
- **Estado desejado:** a tela "Atendimento do dia" mostra os pacientes previstos de cada profissional; a recepção registra chegada e falta; o dentista (ou a recepção, a pedido dele) registra chamada, início e fim com um botão. A central calcula espera e duração real, marca tempo incompleto e transforma falta em pendência de reagendamento. O dentista vê quem chegou e quem aguarda.
- **Decisões já fechadas:**
  - O fim do atendimento é registrado pelo botão "Finalizar" na central. A baixa do procedimento no Clinicorp só poderá substituir o botão depois de prova (resposta de CL-006); nesta SPEC ela é apenas comparada.
  - Quem pode acionar início e fim: dentista e recepção; a central guarda quem acionou e quando.
  - Tempo sem início ou sem fim fica "incompleto" e fora de qualquer média.
  - Falta é registrada pela recepção; silêncio do paciente ou ausência de confirmação não é falta.
  - Correções de horário são permitidas à recepção e à gestão, com motivo e registro do antes e depois.
- **Bloqueios:** nenhum além das SPEC-1-001 e SPEC-1-003.

## Resultado observável

Na tela do dia, a recepção marca "chegou" e o dentista vê o paciente aguardando com o tempo de espera; o dentista clica "Iniciar" e "Finalizar"; quem faltou vira pendência de reagendamento com responsável. Ao fim do dia, cada atendimento tem espera e duração real ou aparece como "incompleto".

## Limites e dependências

- **Inclui:** lista do dia por profissional; chegada (inclusive sem agendamento); chamada, início e fim; falta; etiquetas; espera e duração real; tempo incompleto; correção auditada; visão do dentista; comparação do botão com a baixa registrada no arquivo/fixture.
- **Fora de escopo:** gravação da avaliação (fase 2); média automática por dentista (fase 2); escrita de status no Clinicorp; prontuário.
- **Entradas e pré-condições:** SPEC-1-001 (agenda do dia) e SPEC-1-003 (fichas, pendências e lista de pacientes a agendar) aceitas.
- **Saídas/artefatos:** coleção `atendimentos`; rotas `/backend/v1/atendimento/registrar` e `/backend/v1/atendimento/corrigir`; rotina `atendimentos_fechar_dia`; telas "Atendimento do dia", "Minha fila" (dentista) e relatório "Botão × Clinicorp".
- **Dependências e responsáveis:** recepção e dentistas usam; construção — clínica com o Maestro; resposta de CL-006 — consultor, a partir da comparação.
- **Atores e permissões mínimas:** `recepcao` registra chegada, falta, chamada, início, fim e correções; `dentista` registra chamada, início e fim só dos próprios pacientes e vê só a própria fila; `gestao` corrige e vê tudo; CRCs leem.
- **Superfícies/arquivos/configurações afetadas:** migrations; hooks das rotas e da rotina; telas e serviços em `src/`.
- **Risco e plano B:** dentista esquece de finalizar → tempo incompleto, fora da amostra; recepção pode finalizar a pedido do dentista.
- **Rollback ou reversão:** a recepção pode voltar ao Trello até a virada conectada da fase 4; SPEC-1-007 aceita somente a demonstração; nada é escrito no Clinicorp.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| `agenda_itens` do dia → `atendimentos` | Massa/arquivo local (previsto) | `inicio`, `fim`, `profissional`, `paciente_nome`, `paciente_telefone` | leitura | um atendimento por item da agenda (único); criado ao abrir o dia | Item desmarcado depois → atendimento `cancelado` |
| `pendencias_procedimento` (SPEC-1-003) → relatório "Botão × Clinicorp" | Arquivo/fixture local | `executado_fonte`, `executado_data_fonte`, `executado_hora_disponivel` (campos preservados pela SPEC-1-003), `paciente_clinicorp_id`, `profissional` | leitura | comparação diária | Sem baixa no dia → "sem baixa"; `executado_data_fonte` sem hora → "baixa sem horário" |

**Coleção `atendimentos`:** `agenda_item` (relação, único quando houver), `paciente` (relação com a ficha), `paciente_nome`, `profissional`, `data`, `tipo_chegada` (`agendado`, `sem_agendamento_emergencia`, `sem_agendamento_encaixe`), `etiquetas` (`orcamento`, `reavaliacao`, `atrasado`, `encaixe`, `emergencia`), `estado` (`previsto`, `chegou`, `chamado`, `em_atendimento`, `finalizado`, `falta`, `cancelado`), `chegada_em`, `chamado_em`, `inicio_em`, `fim_em`, `falta_em`, `chegada_por`, `inicio_por`, `fim_por`, `falta_por`, `espera_min`, `duracao_real_min`, `tempo_incompleto` (bool), `teste`. Cada registro e correção também gera um `evento` (SPEC-1-003) com antes, depois, autor e motivo.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Chegada registrada | `estado = chegou`; aparece na fila do dentista com espera correndo | Chegada sem agendamento exige nome, telefone, profissional e tipo | `00:50:27` |
| RN-02 | Início | `em_atendimento`; `espera_min = inicio − chegada` | Início sem chegada → chegada = início, marcada "chegada não registrada" | — |
| RN-03 | Fim | `finalizado`; `duracao_real_min = fim − início` | Fim antes do início → recusado | `00:52:42`, `00:54:45` |
| RN-04 | Atendimento sem início ou sem fim ao fim do dia | `tempo_incompleto = true`, fora de qualquer média | — | AC-L02 |
| RN-05 | Marcar falta | Consulta com hora individual: só depois do início previsto; ordem de chegada: só depois do fim do turno validado, se não houve chegada/atendimento | Regime/turno desconhecido bloqueia ação e pede conferência; ausência de confirmação nunca marca falta | WA-03 |
| RN-06 | Correção | Só `recepcao` e `gestao`, com motivo; evento com antes e depois; recalcula espera e duração | — | — |
| RN-07 | Dentista | Vê e aciona só os atendimentos do próprio profissional | — | Matriz da SPEC-1-001 |
| RN-08 | Comparação com o Clinicorp | Para cada atendimento finalizado com procedimento executado no mesmo dia e profissional: mostra `fim_em`, `executado_data_fonte` e a diferença | Sem baixa, ou baixa sem horário, aparece como tal | CL-006 |

**Fila por ordem de chegada:** separar do regime com horário marcado. Ordenar pelo instante de chegada registrado no backend; em empate, ID do registro. Exibir unidade, profissional/turno, limite da política aprovada e posição, sem gerar horário fictício. Não marcar falta antes do fim do turno para paciente sem hora individual. Contagem e capacidade vêm da SPEC-1-004; configuração pendente permanece visível e bloqueia novas ofertas dependentes da regra.


## Fluxo e regras

1. Ao abrir o dia, a central cria os atendimentos previstos a partir da agenda local/importada.
2. A recepção marca a chegada (ou registra chegada sem agendamento) e as etiquetas.
3. O dentista vê "Minha fila" com quem aguarda e há quanto tempo; clica "Chamar", "Iniciar" e "Finalizar".
4. Depois do início previsto em consulta marcada, ou depois do fim do turno validado em ordem de chegada, a recepção pode marcar falta de quem não veio; a falta vai para a lista de pacientes a agendar.
5. A rotina `atendimentos_fechar_dia` (03:00 UTC, meia-noite no horário da clínica) marca como incompleto o que ficou sem início ou fim.
6. O relatório "Botão × Clinicorp" compara o fim registrado com a baixa do procedimento.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Chegada 9:50, início 10:05, fim 10:45 | Espera 15 min, duração 40 min | — |
| Limite | Início sem fim até o fim do dia | Incompleto, fora da amostra | Correção com motivo no dia seguinte |
| Limite | Paciente de emergência sem agendamento | Entra na fila do profissional como "sem agendamento" | Ligado depois a um item da agenda, se houver |
| Falha | Falta marcada antes do horário | Recusada | — |
| Falha | Fim antes do início | Recusado | Correção com motivo |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC e as SPEC-1-001 e SPEC-1-003.
2. **Alterar somente:** coleção, rotas, rotina, telas e relatório desta SPEC.
3. **Não alterar:** nada no Clinicorp; regras de acesso das SPECs anteriores, salvo acrescentar as permissões de `recepcao` e `dentista` sobre `atendimentos`.
4. **Executar nesta ordem:** (a) coleção e permissões; (b) criação dos previstos; (c) chegada, chamada, início, fim e falta no backend; (d) fila do dentista; (e) fechamento do dia; (f) correção auditada; (g) relatório botão × Clinicorp; (h) provas.
5. **Parar e pedir validação quando:** a clínica quiser outra regra para falta ou atraso; o horário lido do Clinicorp não bater com o do dia.
6. **Estado válido ao parar:** a lista do dia continua mostrando os previstos; registros feitos não se perdem.

## Checklist de execução

- [ ] Atendimentos previstos criados a partir da agenda do dia.
- [ ] Chegada, chamada, início, fim e falta registrados com autor e horário.
- [ ] Espera, duração e tempo incompleto calculados.
- [ ] Fila do dentista restrita ao próprio profissional.
- [ ] Falta gerando pendência de reagendamento.
- [ ] Correção com motivo e histórico.
- [ ] Relatório botão × Clinicorp com atendimentos da massa/arquivo.
- [ ] Provas e teste humano registrados.

## Critérios de aceite

- [ ] **CA-1-26:** a tela do dia mostra os previstos por profissional e registra chegada, chamada, início, fim e falta com autor e horário.
- [ ] **CA-1-27:** espera e duração real são calculadas; atendimento sem início ou fim fica "incompleto" e fora da amostra; fim antes do início é recusado; correção exige motivo e guarda antes e depois.
- [ ] **CA-1-28:** o dentista vê e aciona só os próprios pacientes, com quem chegou e há quanto tempo aguarda; chegada sem agendamento entra na fila do profissional.
- [ ] **CA-1-29:** falta só pode ser marcada depois do horário previsto (ou fim do turno validado em ordem de chegada) nas consultas marcadas ou depois do fim do turno nas agendas por ordem de chegada e gera item em "Pacientes a agendar" com responsável; consulta sem confirmação não vira falta sozinha.
- [ ] **CA-1-30:** o relatório "Botão × Clinicorp" mostra, para cada atendimento finalizado do período de teste com procedimento/baixa identificados no arquivo/fixture, o fim pelo botão, a baixa e a diferença, ou "sem baixa"/"baixa sem horário".

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | Cenários P5-01 a P5-07 antes da coleção e das rotas | Tela "Provas" → "Rodar provas da SPEC-1-005" | Falham | `provas_execucoes` com `passou = false` |
| GREEN | P5-01: atendimento de teste com chegada 9:50, início 10:05, fim 10:45 → espera 15, duração 40. P5-02: início sem fim + rotina de fechamento → incompleto. P5-03: fim antes do início → recusado. P5-04: falta antes do horário previsto → recusada; depois → item em "Pacientes a agendar" com motivo `falta`. P5-05: usuário dentista A tenta iniciar paciente do dentista B → recusado. P5-06: correção sem motivo → recusada; com motivo → evento com antes e depois. P5-07: chegada sem agendamento → aparece na fila do profissional | mesma tela | Todos passam | `provas_execucoes` com `passou = true` |
| REFACTOR/REGRESSÃO | Rodar P1 a P5; usar a tela em um turno simulado conferido com a massa/arquivo, mantendo Trello em uso real e gerar o relatório botão × Clinicorp | Tela "Provas"; turno simulado | Provas passam; relatório gerado com atendimentos da massa/arquivo | Relatório anexado à task (sem enviar ao grupo) |

**Dados/fixtures:** atendimentos de teste ligados a itens de agenda de teste; usuários de teste de dentista A, dentista B e recepção.  
**Caminhos de erro obrigatórios:** fim sem início, início sem chegada, fim antes do início, falta antecipada, dentista de outro profissional, correção sem motivo.  
**Evidência exigida:** registros de prova, captura da fila do dentista, relatório botão × Clinicorp.

**Regressão P5-08 (CA-1-26/28/29):** dois pacientes sem horário individual chegam em momentos invertidos à ordem do cadastro; tela segue chegada. Chegada repetida não cria segundo lugar. Paciente que não chegou não vira falta antes do fim do turno; depois, ação humana registra falta e próxima ação. Limite excedido é sinalizado, sem remover atendimentos já registrados.


**Prova P5-09 (CA-1-30):** criar atendimento sintético finalizado às 10:45 e procedimento da mesma unidade/paciente/profissional com baixa no arquivo às 10:50; relatório mostra diferença de 5min. Repetir com data sem hora (baixa sem horário), vínculo ausente (sem baixa) e vínculo ambíguo (revisão). Não inventar hora nem afirmar evento real comprovado; resultado em `provas_execucoes`.

## Teste humano do cliente

- **Origem:** CL-008 (e a resposta de CL-006 pelo consultor)
- **Quem testa:** recepção, dois dentistas e Victor.
- **Passos:** (1) num turno simulado, a recepção marca as chegadas na central (o Trello ainda pode ser usado em paralelo até a virada); (2) os dentistas usam "Iniciar" e "Finalizar"; (3) a recepção marca uma falta depois do horário; (4) a gestão abre o relatório botão × Clinicorp no fim do dia.
- **Resultado esperado:** a fila do dentista mostra quem aguarda; espera e duração aparecem; a falta vira pendência.
- **Evidência do aceite:** "testei, pode seguir" no card e o relatório anexado.

## Handoff e operação

- **Como demonstrar:** acompanhar três pacientes sintéticos ou de arquivo autorizado da chegada ao fim.
- **Como operar depois:** recepção e dentistas usam a tela todos os dias; a gestão olha os incompletos.
- **Como monitorar:** quantidade de incompletos por dia e por profissional (painel da SPEC-1-006).
- **Pendência conhecida:** substituir o botão pela baixa do Clinicorp só se o consultor aprovar com base no relatório.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| a3dc6e0f-adca-4b99-83cf-933f305ba6cc | Montar a tela de atendimento do dia | CA-1-26 e CA-1-28 | P5-01 a P5-07 | Dados locais e dependências desta SPEC |
| 2ab1282b-8315-43c1-823d-1ddca08f05ed | Registrar chegada, chamada, início e fim de cada paciente | CA-1-27 | P5-01 a P5-07 | Dados locais e dependências desta SPEC |
| b517d69d-91e1-4496-82fc-f1e04a8be0c9 | Transformar falta em pendência de reagendamento | CA-1-29 | P5-01 a P5-07 | Dados locais e dependências desta SPEC |
| 3926f0ae-e2fe-4ffb-b508-0564ecf0be27 | Comparar o botão de finalizar com a baixa do Clinicorp | CA-1-30 | P5-09 | Dados locais e dependências desta SPEC |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
