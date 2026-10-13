# SPEC-1-006 — Painel de agendamento e linha de base

**Fase:** 1  
**Status:** planejada  
**Dono:** L A Rodrigues (execução com o Maestro) · definições: Luiz e Victor · aceite: Rodrigo Santos (consultor)  
**Origem no escopo:** Fase 1, função (8) Painel de agendamento e "Baseline enxuta"; critério do portal (organização e métricas de agendamento); RQ-011 (origem até o comparecimento), LRQ-008; decisões AC-001, DH-08; item CL-PEND-003  
**Degrau da solução:** construção mínima no projeto Skip da SPEC-1-001 — cálculo agregado no backend sobre os dados das SPECs 1-001 a 1-005; ocupação histórica de arquivo validado ou fixture.

## Modo obrigatório da fase — AC-13-IT

Esta SPEC executa apenas no app e banco nativos. Dados vêm da SPEC-1-001 por fixture separada, arquivo validado ou cadastro auditado; não há API externa, segredo de fornecedor, webhook, polling ou chamada de IA. Referência a Clinicorp significa dados exportados/manual identificados, nunca leitura automática. Toda tela exibe origem/lote/data e “sem sincronização”. Provas e teste humano usam a mesma massa local. Teste de saída deve registrar zero chamadas a Clinicorp/Meta/IA/transcrição; recursos nativos do Skip são permitidos. Envio/reserva real e retirada de controles anteriores ficam para a fase 4. Não usar fixture para afirmar resultado operacional.

## Contexto e decisões fechadas

- **Estado atual:** não existe visão das métricas de agendamento. O critério registrado no portal fala de dentista ora com poucos, ora com muitos pacientes. A precificação da clínica supõe 20% de ociosidade de cadeira; o custo de um dentista com diária alta atendendo poucos pacientes é a dor citada no kickoff.
- **Estado desejado:** a gestão abre o painel e vê, para o período escolhido, os números de agendamento, confirmação, ligação, falta, reposição de vagas, carga por dentista, tempos sugerido × reservado × real, espera e duração e as reservas sem planejamento, cada um com período e denominador. A linha de base da unidade piloto (custo do dentista por paciente e ociosidade) fica registrada antes da virada conectada da fase 4, com a definição usada.
- **Decisões já fechadas:**
  - Todo indicador mostra período e denominador; sem denominador, "dados insuficientes". Correlação não é apresentada como causa.
  - Registros de teste (`teste = true`) nunca entram no painel nem na linha de base.
  - A linha de base é da unidade piloto, medida no histórico do Clinicorp antes da virada conectada da fase 4; metas só depois da medição.
  - **Ociosidade de cadeira:** 1 − minutos ocupados válidos por cadeira ÷ minutos disponíveis comprovados das mesmas cadeiras no período. Usar união de intervalos para evitar sobreposição duplicada, com CANCELAMENTO excluído e atendimento/reserva válidos. A clínica confirma a definição; agregado Clinicorp só é usado se equivalência de unidade, período e denominador for comprovada. Mesma definição na comparação final.
  - **Custo do dentista por paciente:** custo dos profissionais no período ÷ pacientes atendidos no período. Custo por profissional e forma de remuneração vêm da clínica (CL-PEND-003); se for por diária, dias trabalhados = dias com pelo menos um agendamento não desmarcado do profissional no período (a clínica confirma); pacientes atendidos = agendamentos do período com status mapeado como "compareceu" (CL-PEND-004).
  - A rota do painel devolve só números agregados, sem nome, telefone ou dado clínico (é a fonte de leitura dos loops das fases 4 e 5).
- **Bloqueios:** sem CL-PEND-003 e CL-PEND-004 a linha de base mostra "dados insuficientes" no indicador afetado, sem estimativa.

## Baseline: cálculo preparado e medição oficial

A fase 1 prova fórmula e memória de cálculo com massa/arquivo e marca esse resultado como demonstrativo ou provisório. A baseline oficial para comparação de negócio é confirmada na fase 4, antes da virada, com fonte/período/denominador e conferência humana. A prova local não exige esse marco operacional nem o antecipa. O painel em demonstração mostra somente fixtures com banner; o painel operacional exclui fixtures. Nenhum agregado de teste vira resultado da clínica.

## Resultado observável

A gestão escolhe "esta semana" e vê, por exemplo: 412 agendados; 61% confirmados (252/412); 38 na lista de ligação; 9 faltas (9/380 previstos); 6 vagas liberadas e 4 preenchidas (4/6) com reposição mediana de 3 h; carga por dentista no dia; desvios de duração com e sem motivo. Na aba "Linha de base", vê os dois indicadores do período informado, com fórmula, fonte e data do cálculo.

## Limites e dependências

- **Inclui:** rota agregada do painel; tela "Painel"; carga por profissional e dia; tempos sugerido × reservado × real; espera e duração; lista de ligação × cobertura; reservas sem planejamento; incompletos; importação de histórico validado; cálculo e registro da linha de base.
- **Fora de escopo:** custo de fornecedores e teto (fase 2); resultado financeiro por campanha (fase 3); metas (definidas pela direção depois); painel gerencial comparado (fase 5).
- **Entradas e pré-condições:** SPEC-1-001 a SPEC-1-005 com dados; CL-PEND-003 (custo por profissional e período) e CL-PEND-004 (status de compareceu) para a linha de base.
- **Saídas/artefatos:** rota `/backend/v1/painel`; coleção `linhas_de_base`; tela "Painel" com abas "Operação", "Carga por dentista", "Tempos" e "Linha de base".
- **Dependências e responsáveis:** definições — Luiz e Victor; construção — clínica com o Maestro; conferência — gestão.
- **Atores e permissões mínimas:** `gestao` vê o painel completo e registra a linha de base; CRCs veem a aba "Operação"; demais funções não acessam.
- **Superfícies/arquivos/configurações afetadas:** hooks da rota `/backend/v1/painel` e `linha_de_base_calcular`; migration de `linhas_de_base`; telas e serviços em `src/`.
- **Risco e plano B:** ocupação histórica indisponível na API → importação histórica controlada com todos os campos do contrato do período e fonte visível; sem campos/período/denominador, dados insuficientes. A agenda corrente não substitui automaticamente histórico da baseline.
- **Rollback ou reversão:** a linha de base registrada não é apagada; recálculo cria nova versão com motivo.

## Análise dos documentos e perguntas permitidas

**Fonte:** https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9, materiais já recebidos e dados internos citados nesta SPEC. O conteúdo da pasta ainda não foi verificado neste preparo; não presumir que falta documento. Consultar pasta/subpastas com acesso de leitura, registrar arquivos e conteúdo efetivamente lidos em `.adapta-cliente/fontes-do-projeto.md` e seguir `AGENTS.md`. A consulta pelo assistente não é integração do app.

**Método antes de perguntar:** identificar a task e a análise abaixo; procurar os campos nos materiais existentes, mesmo distribuídos entre arquivos; relacionar campo de origem ao campo interno; validar qualidade e conflitos; reaproveitar os dados válidos; registrar apenas a lacuna específica. Preservar unidade/versão/ID de origem, não converter campo vazio em zero nem inferir regra de produção. Arquivo de nome diferente também pode atender. Falha de acesso pede somente acesso, não reenvio. Converter o formato no ambiente autorizado quando viável, sem pedir à clínica trabalho que o assistente pode fazer.

| Material e campos a localizar | Análise que o executor deve fazer | Saída que alimenta o app |
|---|---|---|
| Dados locais e período do painel | Conferir estados/contagens e denominador conforme tabela de indicadores desta SPEC; separar demonstração de operação; dado ausente não vira resultado zero | Memória de cálculo por indicador e painel com fonte/período/denominador |
| Histórico disponível: unidade, cadeira, profissional, visita/paciente, início/fim, regime, comparecimento, cancelado/excluído, jornada/capacidade | Validar cobertura do mesmo período; união de intervalos por cadeira sem duplicar sobreposição; excluir CANCELAMENTO e exigir evidência de atendimento; turno sem duração individual não ganha minutos fictícios | Base histórica validada, numerador/denominador equivalentes, ou dados insuficientes com campo/período exatos |
| Custo/remuneração por profissional e período | Identificar diária ou forma efetivamente documentada; ligar custo ao período e número de atendidos; não inventar salário, prorrata, câmbio ou rateio | Custo por paciente calculável apenas com base equivalente; senão pendência explicada |

**Perguntar somente se necessário:** esclarecer remuneração/unidade/período realmente ambíguos e dizer qual indicador depende disso. Não pedir histórico novo se o recebido cobre a medição, nem dados reais para aprovar cálculo demonstrativo. A baseline oficial continua na fase 4; faltas de fonte ficam como dados insuficientes, sem bloquear telas ou outros indicadores válidos.

**Registro e limite:** antes de pedir complemento, produzir em `06_notas/analises-documentais/SPEC-1-006.md` a task/critério, arquivos efetivamente consultados (link/ID, aba/seção/página, versão/data), mapa campo de origem → campo interno, dados aproveitados, validações/rejeições, conflitos, lacuna e seu efeito. Pode atualizar uma análise existente; não exigir arquivo separado por cada tarefa. Relatório não contém nomes, telefones, valores individuais, senhas, tokens ou prontuário; registrar metadados e exemplos anonimizados. Não copiar planilhas de pacientes para o Git. Dados normalizados vão ao banco/armazenamento autorizado conforme permissões desta SPEC, com revisão/aprovação já exigidas antes de uso real.

**Pedido permitido:** “Consultei [arquivos/abas]. Já aproveitei [campos]. Para [task e funcionalidade], falta somente [campo/regra/decisão], porque [efeito concreto]. Isso [bloqueia só o uso real afetado / permite continuar a demonstração]. Podem [complementar ou esclarecer esse ponto]?” Perguntar apenas após leitura suficiente e busca nas fontes autorizadas. Falha de acesso deve ser declarada como acesso pendente, nunca como documento ausente; informar conta/permissão só se identificadas. Nenhum pedido ou mensagem à clínica é enviado automaticamente pela análise.

**Conferência da análise (quando a task consumir documentos):** arquivo encontrado suficiente → aproveitar sem pedido; arquivo parcial → pedir só campo ausente; acesso negado → pedir acesso, não upload; fontes conflitantes → apresentar valores/regras para decisão, sem escolher por suposição. Conferir três exemplos anonimizados (válido, incompleto e conflito) contra o contrato e guardar esperado/obtido. Os cenários não exigem novas tasks nem reabrem entregas concluídas; nenhuma leitura ou teste é declarado executado por esta atualização das SPECs.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| CSV/XLSX histórico ou fixture validada | Fonte declarada no lote | Unidade, cadeira, profissional, visita/paciente, início/fim, regime, comparecimento, cancelado/excluído e capacidade do mesmo período | Gestão; sem segredos/API | Reimportação idempotente; não sobrescrever agenda corrente | Campo/período/denominador ausente → dados insuficientes |

| Coleções das SPECs 1-001 a 1-005 → rota do painel | Central | contagens e médias por período | `gestao` (completo) e CRCs (operação) | cálculo sob demanda | Sem dados → "dados insuficientes" |

**Indicadores (aba "Operação" e "Tempos")**

| Indicador | Numerador | Denominador | Observação |
|---|---|---|---|
| Agendados | consultas não desmarcadas no período | — | por data da consulta |
| Confirmados | contatos `confirmou` ou ligação com confirmação | consultas com contato no período | — |
| Sem resposta | contatos em lista de ligação ou com ligação sem sucesso | consultas com contato no período | mostra também o tamanho atual da lista × cobertura do turno |
| Ligações feitas | ligações registradas | — | por CRC e turno |
| Faltas | atendimentos `falta` | atendimentos previstos não desmarcados | — |
| Vagas preenchidas | liberações `preenchida` | liberações `liberada` ou posteriores | e tempo mediano de reposição (liberada → preenchida) |
| Carga por dentista | pacientes e minutos reservados no dia | minutos de `horarios_profissional` no dia | "horário não cadastrado" quando faltar |
| Ocupação do dia | minutos reservados de todos os profissionais | minutos disponíveis de todos os profissionais | estimativa da central; não é a linha de base |
| Tempos | média de sugerido, reservado e real por procedimento e dentista | n de atendimentos com os três valores | exclui incompletos |
| Desvios | reservas diferentes do sugerido; e quantas sem motivo | reservas ligadas a planejamento | lista para revisão |
| Reservas sem planejamento | itens de agenda sem planejamento ligado | consultas do período | — |
| Espera e duração | médias | atendimentos completos | e número de incompletos |
| Leads por origem | leads do período por campanha, manual e desconhecida | leads do período | detalhe no relatório da SPEC-1-003 |

**Coleção `linhas_de_base`:** `indicador` (`ociosidade`, `custo_dentista_por_paciente`), `periodo_de`, `periodo_ate`, `valor`, `numerador`, `denominador`, `definicao`, `fonte` (`clinicorp_schedule_occupation`, `central`, `clinicorp_agenda_e_custos_da_clinica`), `versao`, `motivo_recalculo`, `calculada_por`, `calculada_em`, `confirmada_pela_clinica_por`.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Indicador sem denominador ou denominador zero | "dados insuficientes" | — | Métricas sem denominador |
| RN-02 | Registro `teste = true` | Excluído de todo cálculo | Modo de prova | SPEC-1-001 |
| RN-03 | Linha de base registrada | Não pode ser editada; recálculo cria nova versão com motivo | — | DH-08 |
| RN-04 | Custo por profissional ausente | Indicador de custo "dados insuficientes"; ociosidade segue | — | DH-08 |
| RN-05 | Rota do painel | Só números agregados; nenhum nome, telefone ou texto livre | — | Privacidade |

**Integridade da mensuração:** excluir o profissional fictício CANCELAMENTO da produção e do denominador “pacientes atendidos”, mesmo se o procedimento vier como Executed. Exigir evidência de comparecimento/atendimento real, não baixa financeira; registros incertos não viram atendimentos. A mesma definição deve seguir na comparação final. Na agenda por ordem de chegada, mostrar pessoas por turno e limite; não calcular minutos reservados por pessoa sem reserva individual válida. Ocupação histórica de cadeira usa união dos intervalos válidos, sem somar duas avaliações simultâneas como duas vezes a mesma cadeira; fonte/denominador ausentes => dados insuficientes.

**Marketing histórico:** os gastos/leads recuperados são referência de marketing, não baseline de ocupação clínica ou de custo do dentista. Não usar o CPL informado de junho como medição validada nem calcular ROAS sem receita atribuível. Reconstrução mensal e métricas operacionais têm fontes e períodos distintos.


**Contrato histórico da baseline:** usar arquivo ou leitura histórica controlada do período aprovado com `unidade_id`, `cadeira_id`, `profissional_id`, `paciente/visita_id`, `inicio`, `fim`, `regime`, `status_comparecimento`, `cancelado/excluido`, identificação de CANCELAMENTO e origem/data da extração. Agenda atual D−7/D+45 não basta para qualquer período histórico. Nesta fase importar CSV/XLSX com os campos e fonte; consultas API pertencem à fase 4. Ler agregados de ocupação somente quando unidade de medida, cadeiras, período e denominador forem comprovados iguais à definição. Falta de cadeira/início/fim impede a união por cadeira e registra dados insuficientes; não trocar ocupação de cadeira por soma de minutos de profissionais. Custo por profissional vem da clínica, ligado ao mesmo período; atendimento real deve ser comprovado. A baseline só é confirmada após memória de cálculo e conferência humana.

**P6-08 (CA-1-35):** escolher período anterior à janela corrente; fornecer histórico com campos completos => união reproduzível e fonte; omitir cadeira ou fim => dados insuficientes, sem extrapolar pelo profissional ou pela janela atual. O roteiro deve ser anexado à task da baseline e repetido na comparação final.


## Fluxo e regras

1. A rota `/backend/v1/painel?de=AAAA-MM-DD&ate=AAAA-MM-DD` calcula os indicadores do período a partir das coleções da fase.
2. A tela "Painel" mostra as abas com período e denominador em cada número e a lista de desvios para a gestão marcar "revisado".
3. A clínica informa o custo por profissional, a forma de remuneração e o período da linha de base (CL-PEND-003) e confirma a definição de ociosidade.
4. A gestão aciona "Calcular linha de base": a central calcula sobre o arquivo/massa do período e registra os dois indicadores com definição, fonte e versão.
5. A gestão confere um dia da massa/arquivo do painel com os registros da massa/arquivo.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Semana com operação registrada | Indicadores com período e denominador | — |
| Limite | Período sem liberações | "Vagas preenchidas: dados insuficientes" | — |
| Limite | Dentista sem horário cadastrado | Carga mostra "horário não cadastrado" | Gestão cadastra o horário |
| Falha | Ocupação histórica do Clinicorp indisponível | Usar somente histórico importado completo do mesmo período; se faltar, dados insuficientes | Recalcular com fonte comprovada, em nova versão, sem trocar definição |
| Falha | Custo por profissional não enviado | Indicador de custo "dados insuficientes" | Calcular quando chegar, antes da virada conectada da fase 4 |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC e as SPEC-1-001 a SPEC-1-005.
2. **Alterar somente:** a rota e a tela do painel, a coleção `linhas_de_base` e a rotina de cálculo.
3. **Não alterar:** dados operacionais das outras SPECs; não criar meta; não estimar valor ausente.
4. **Executar nesta ordem:** (a) rota agregada com a tabela de indicadores; (b) tela "Painel"; (c) carga por dentista; (d) importação de arquivo histórico ou fixture; (e) cálculo e registro da linha de base; (f) provas.
5. **Parar e pedir validação quando:** a clínica não reconhecer a definição de ociosidade ou de custo; um indicador precisar de dado que nenhuma SPEC registra.
6. **Estado válido ao parar:** o painel mostra o que já é calculável; linhas de base registradas continuam intactas.

## Checklist de execução

- [ ] Rota agregada sem dados pessoais.
- [ ] Painel com período e denominador em cada número.
- [ ] Carga por dentista com horários cadastrados.
- [ ] Desvios revisáveis pela gestão.
- [ ] Definições de ociosidade e custo confirmadas pela clínica.
- [ ] Cálculo provisório/demonstrativo registrado; baseline oficial só na fase 4.
- [ ] Provas e conferência de um dia da massa/arquivo registradas.

## Critérios de aceite

- [ ] **CA-1-31:** todo número do painel mostra período e denominador; sem denominador aparece "dados insuficientes"; registros de teste não entram.
- [ ] **CA-1-32:** em um dia da massa/arquivo, agendados, confirmados, faltas, vagas liberadas e preenchidas do painel conferem com a contagem feita pela gestão nos registros do dia.
- [ ] **CA-1-33:** a aba "Carga por dentista" mostra, por profissional e dia, pacientes e minutos reservados × minutos disponíveis.
- [ ] **CA-1-34:** a aba "Tempos" mostra sugerido × reservado × real por procedimento e dentista e a lista de desvios, que a gestão marca como revisados.
- [ ] **CA-1-35:** a linha de base da unidade piloto (ociosidade e custo do dentista por paciente) tem cálculo provisório preparado nesta fase, com período, fórmula, fonte, versão e confirmação da clínica, ou com "dados insuficientes" justificado; a rota do painel não devolve nome, telefone nem texto livre.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | Cenários P6-01 a P6-06 antes da rota | Tela "Provas" → "Rodar provas da SPEC-1-006" | Falham | `provas_execucoes` com `passou = false` |
| GREEN | Massa de teste do período: 10 consultas, 6 contatos confirmados de 8 com contato, 1 falta em 9 previstos, 2 liberações e 1 preenchida, 1 desvio sem motivo. P6-01: rota devolve confirmados 6/8, faltas 1/9, preenchidas 1/2. P6-02: período sem liberações → "dados insuficientes". P6-03: registros com `teste = true` fora do modo de prova → não contados. P6-04: profissional de teste com horário 8:00–12:00 e 120 min reservados → carga 120/240. P6-05: resposta da rota não contém nome nem telefone (busca pelos valores da massa de teste). P6-06: linha de base registrada e tentativa de edição → recusada; recálculo → nova versão com motivo | mesma tela | Todos passam | `provas_execucoes` com `passou = true` |
| REFACTOR/REGRESSÃO | Rodar P1 a P6; conferir um dia da massa/arquivo com a gestão (CA-1-32); calcular a linha de base provisória/demonstrativa | Tela "Provas", painel e aba "Linha de base" | Provas passam; dia da massa/arquivo confere; linha de base registrada | Conferência e captura da linha de base anexadas à task |

**Dados/fixtures:** massa de teste descrita no GREEN; profissional de teste com horário cadastrado.  
**Caminhos de erro obrigatórios:** denominador zero, ocupação do Clinicorp indisponível, custo ausente, edição de linha de base, vazamento de dado pessoal na rota.  
**Evidência exigida:** registros de prova, conferência do dia da massa/arquivo, cálculo provisório/demonstrativo com definição e conferência humana.

**Regressão P6-07 (CA-1-31/33/35):** massa com um atendimento sintético comprovado na fixture, uma baixa Executed pelo profissional CANCELAMENTO e uma cirurgia de implanteR$0; só evidência de atendimento real entra no denominador, nunca CANCELAMENTO. Duas avaliações simultâneas na mesma cadeira ocupam união de30min, não60; turno sem duração individual mostra contagem/limite, não minutos fictícios. Um PDF mensal de714 leads não altera pacientes atendidos da baseline. Registrar memória do cálculo e repetir na regressão integrada.


## Teste humano do cliente

- **Origem:** CL-008
- **Quem testa:** Victor e Luiz.
- **Passos:** (1) abrir o painel do dia anterior e conferir cinco números com a operação; (2) abrir a carga por dentista de um dia cheio e de um dia vazio; (3) revisar a lista de desvios; (4) conferir a definição e os valores da linha de base.
- **Resultado esperado:** números conferem e a gestão entende cada denominador.
- **Evidência do aceite:** "testei, pode seguir" no card e confirmação da definição da linha de base.

## Handoff e operação

- **Como demonstrar:** comparar o painel de um dia com os registros desse dia.
- **Como operar depois:** a gestão olha o painel diariamente e revisa desvios semanalmente.
- **Como monitorar:** "dados insuficientes" recorrente indica registro faltando na operação.
- **Pendência conhecida:** metas definidas pela direção depois da linha de base; comparação na fase 5.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| 86053b82-b444-4950-b0a0-c31a87242bb2 | Montar o painel de agendamento da gestão | CA-1-31, CA-1-32 e CA-1-34 | P6-01 a P6-05 | Dados locais e dependências desta SPEC |
| 22de9577-d910-49c1-95de-38bc0377c0dc | Mostrar a carga de pacientes e minutos por dentista | CA-1-33 | P6-01 a P6-05 | Dados locais e dependências desta SPEC |
| 7fc031f6-15da-45ba-adfd-3764a1c8d266 | Calcular a linha de base da unidade piloto | CA-1-35 | P6-06/07 | Dados locais e dependências desta SPEC |
| 04d3496d-faf3-4332-85d2-9e8c4478e993 | Informar o custo de cada dentista e o período da linha de base | CA-1-35 | P6-06 | Dados locais e dependências desta SPEC |
| d350fb12-466a-47a0-a5c5-f60a45b0d599 | Conferir cancelamentos na linha de base | CA-1-31/33/35 | P6-07 | Dados locais e dependências desta SPEC |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
