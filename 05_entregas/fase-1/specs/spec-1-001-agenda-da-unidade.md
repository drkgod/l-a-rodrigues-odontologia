# SPEC-1-001 — Base do app, agenda e importação local

**Fase:** 1 · **Status:** planejada, não implementada  
**Dono:** L A Rodrigues com o Maestro; aceite: Rodrigo Santos  
**Origem:** RQ-001/003, CL-001/008, AC-13-IT; fundamentação antes de conexões.  
**Degrau:** recursos nativos do Skip: login, banco, arquivos, telas e regras do backend.

## Contexto e decisões fechadas

A agenda oficial continua no Clinicorp. O app é construído e validado com fixture, cadastro manual ou CSV/XLSX fornecido pela equipe. Não coletar token nem criar adaptador HTTP, cron Clinicorp ou webhook nas fases 1–3. A futura integração entra na fase 4 com SPEC e prova próprias. A base, papéis, estados e mecanismo de provas são reutilizados pelas SPECs 002–007.

## Resultado observável

A equipe entra por função e navega na agenda por profissional/cadeira. Vê origem, data do lote e “Demonstração” ou “Dados importados — sem sincronização”. Ocupados, bloqueios e horários desconhecidos não aparecem como vagas confirmadas na clínica. Usuário sem papel ou inativo não acessa dados.

## Limites e dependências

- Inclui base por unidade, usuários/papéis, horários, catálogos, agenda, importação validada, tela Provas e logs de lote.
- Entradas: tabelas CL-001 e pessoas/papéis quando recebidos; fixture declarada permite começar sem unidade real definida. Unidade de teste `UNIDADE-DEMO`, isolada de dados importados.
- Nenhuma dependência de token, API ou outro sistema conectado. Não inclui prontuário, financeiro, IA, áudio, envio ou segunda unidade.
- Saídas: coleções abaixo; telas Agenda, Importar dados e Provas; rotas internas `POST /backend/v1/dados/validar-lote` e `POST /backend/v1/dados/aplicar-lote`, somente gestão. Não são endpoints de fornecedor.
- Superfícies: migrations/regras, serviços de importação e `src/provas/spec-1-001.ts`; aproveitar schema existente antes de migrar. Não apagar campos ou dados anteriores sem conciliar.
- Recuperação: rejeitar lote inválido; último lote válido preservado. Reversão cria evento auditado, sem apagar tentativas/aceites das outras SPECs. Não modificar sistema oficial.

### Matriz de acesso (funções)

| Função (`papel`) | Vê | Altera |
|---|---|---|
| `gestao` | tudo da unidade, inclusive provas e configuração | configuração, usuários, tabelas e revisões |
| `crc_agendamento` | agenda, profissionais, cadeiras | o que as SPECs seguintes liberarem para agendamento |
| `crc_confirmacao` | agenda, profissionais, cadeiras | o que as SPECs seguintes liberarem para confirmação |
| `crc_comercial` | agenda, profissionais | o que as SPECs seguintes liberarem para follow-up |
| `recepcao` | agenda do dia | o que a SPEC-1-005 liberar |
| `dentista` | agenda do próprio profissional | o que a SPEC-1-005 liberar |
| sem `papel` ou `ativo = false` | nada | nada |

## Análise dos documentos e perguntas permitidas

**Fonte:** https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9, materiais já recebidos e dados internos citados nesta SPEC. O conteúdo da pasta ainda não foi verificado neste preparo; não presumir que falta documento. Consultar pasta/subpastas com acesso de leitura, registrar arquivos e conteúdo efetivamente lidos em `.adapta-cliente/fontes-do-projeto.md` e seguir `AGENTS.md`. A consulta pelo assistente não é integração do app.

**Método antes de perguntar:** identificar a task e a análise abaixo; procurar os campos nos materiais existentes, mesmo distribuídos entre arquivos; relacionar campo de origem ao campo interno; validar qualidade e conflitos; reaproveitar os dados válidos; registrar apenas a lacuna específica. Preservar unidade/versão/ID de origem, não converter campo vazio em zero nem inferir regra de produção. Arquivo de nome diferente também pode atender. Falha de acesso pede somente acesso, não reenvio. Converter o formato no ambiente autorizado quando viável, sem pedir à clínica trabalho que o assistente pode fazer.

| Material e campos a localizar | Análise que o executor deve fazer | Saída que alimenta o app |
|---|---|---|
| Catálogos, horários/cadeiras e agenda: unidade, IDs, profissional, cadeira, regime, início/fim, status, cancelado/excluído | Mapear IDs/nomes sem fundir homônimos; normalizar datas/fuso; validar início < fim e vínculo da unidade; separar consulta/compromisso/bloqueio; cadeira ausente não vira vaga livre | Mapa de colunas para profissionais/cadeiras/horários/status/categorias/agenda_itens; prévia e rejeições do importador |
| Arquivos/lotes do mesmo período | Identificar duplicados, chaves e namespaces; reconhecer visita dividida preservando IDs; omissão não prova cancelamento; registrar período coberto e lote parcial | Chave estável por origem/tipo/ID, alertas de divisão/incerteza e cobertura do lote |
| Pessoas/papéis já informados | Relacionar papel à matriz desta SPEC, sem gerar permissão a partir de cargo presumido | Configuração proposta de acesso para revisão humana; sem senha/token no relatório |

**Perguntar somente se necessário:** pedir identificação da unidade de um arquivo ambíguo, vínculo de profissional/cadeira ou coluna temporal realmente ausente. Explicar que esse dado determina ocupação/vagas e mostrar os arquivos já aproveitados. Não pedir token nem exportação nova se uma versão existente atende. A demonstração sintética não depende de conta real.

**Registro e limite:** antes de pedir complemento, produzir em `06_notas/analises-documentais/SPEC-1-001.md` a task/critério, arquivos efetivamente consultados (link/ID, aba/seção/página, versão/data), mapa campo de origem → campo interno, dados aproveitados, validações/rejeições, conflitos, lacuna e seu efeito. Pode atualizar uma análise existente; não exigir arquivo separado por cada tarefa. Relatório não contém nomes, telefones, valores individuais, senhas, tokens ou prontuário; registrar metadados e exemplos anonimizados. Não copiar planilhas de pacientes para o Git. Dados normalizados vão ao banco/armazenamento autorizado conforme permissões desta SPEC, com revisão/aprovação já exigidas antes de uso real.

**Pedido permitido:** “Consultei [arquivos/abas]. Já aproveitei [campos]. Para [task e funcionalidade], falta somente [campo/regra/decisão], porque [efeito concreto]. Isso [bloqueia só o uso real afetado / permite continuar a demonstração]. Podem [complementar ou esclarecer esse ponto]?” Perguntar apenas após leitura suficiente e busca nas fontes autorizadas. Falha de acesso deve ser declarada como acesso pendente, nunca como documento ausente; informar conta/permissão só se identificadas. Nenhum pedido ou mensagem à clínica é enviado automaticamente pela análise.

**Conferência da análise (quando a task consumir documentos):** arquivo encontrado suficiente → aproveitar sem pedido; arquivo parcial → pedir só campo ausente; acesso negado → pedir acesso, não upload; fontes conflitantes → apresentar valores/regras para decisão, sem escolher por suposição. Conferir três exemplos anonimizados (válido, incompleto e conflito) contra o contrato e guardar esperado/obtido. Os cenários não exigem novas tasks nem reabrem entregas concluídas; nenhuma leitura ou teste é declarado executado por esta atualização das SPECs.

## Ajuste de papéis — planejamento clínico (14/10)

Preservar os papéis existentes. Acrescentar `users.avaliador_habilitado` (bool, default false), ligado a profissional ativo; apenas gestão habilita/atribui, com auditoria. Isso permite ao dentista designado na SPEC-1-003 ver e validar o planejamento mínimo dos seus pacientes. Não dá acesso a todos os leads/fichas, não expõe prontuário e não concede autorização clínica a usuário de gestão sozinho. Operações clínicas verificam papel dentista + flag + vínculo da mesma unidade no backend. Gestão coordena cadastro/designação; quem também é avaliador usa seu acesso clínico habilitado. A matriz de leitura clínica específica da SPEC-1-003 complementa a visão da agenda definida aqui. Não ativar permissão nova por inferência de cargo.

## Dados e integrações

| Entrada | Contrato | Permissão e integridade | Falha |
|---|---|---|---|
| Fixture versionada | Catálogos e 20 itens sintéticos, todos `teste=true`, sem telefone real | Gestão, modo demonstração separado | Nunca promover fixture a produção |
| CSV/XLSX catálogos/agenda | unidade, tipo, ID de origem, paciente/visita, data, início/fim, profissional, cadeira quando disponível, status/categoria, cancelado/excluído explícitos | Gestão valida mapeamento e prévia; arquivo hash + versão; linhas com chave estável; datas normalizadas em America/Sao_Paulo | Rejeição por linha com motivo; campos essenciais ausentes impedem aplicação dessa linha |
| Cadastro manual | Mesmos campos; ID local estável, autor/data, origem manual | Gestão; edição auditada | Não atribuir ID Clinicorp artificial |
| Banco → telas | Coleções locais e matriz de papéis | Backend verifica unidade/papel; filtros de UI não bastam | Negar acesso sem vazar dados |

Identidade e tempo: conservar ID de origem como texto, sem arredondar números de planilha; fixture/manual/importação têm namespaces distintos. Datas e horários válidos, início < fim, profissional/unidade conhecidos. Cadeira não informada usa padrão explicitamente cadastrado, com aviso; sem padrão, capacidade fica desconhecida. Mapeamento de nomes ambíguos vai para revisão. Descrição livre não substitui status de cancelamento.

**Coleções criadas nesta SPEC** (todas com as cinco regras de acesso definidas):

- `users` (auth, já existente) + campos `papel` (select da matriz), `profissional` (relação, para dentistas), `ativo` (bool).
- `config_unidade` (um registro): `nome_unidade`, `clinicorp_business_id` (opcional nesta fase), `modo_dados` (`demonstracao` ou `importado`), `integracoes_externas_habilitadas` (false nas fases 1–3), `fuso` (`America/Sao_Paulo`), `dias_passados_leitura` (7), `dias_futuros_leitura` (45), `arredondamento_min` (5 ou 10, usado na SPEC-1-002). As SPECs seguintes acrescentam seus parâmetros neste registro.
- `profissionais`: `clinicorp_id` (identificador de origem; IDs de teste no namespace `fixture`), `origem`, `lote_id`, `nome`, `ativo`, `cadeira_padrao` (relação), `tipo_agenda` (`avaliacao`, `tratamento` ou `ambos`).
- `cadeiras`: `clinicorp_id` (identificador de origem; IDs de teste no namespace `fixture`), `origem`, `lote_id`, `nome`, `tipo` (`avaliacao` ou `tratamento`).
- `horarios_profissional`: `profissional` (relação), `dia_semana` (0–6), `inicio`, `fim` (hora local); cadastrados pela gestão a partir dos horários enviados em CL-001. Profissional sem horário cadastrado mostra "horário não cadastrado" e não exibe blocos livres.
- `status_clinicorp`: `clinicorp_id`, `descricao`, `tipo`. `categorias_clinicorp`: `clinicorp_id`, `descricao`, `tipo_agenda` (`avaliacao`, `tratamento` ou `nao_mapeada`).
- `agenda_itens`: `item_tipo` (`APPOINTMENT`, `ASSIGN`, `EVENT`), `clinicorp_id`, `data` (dia local), `inicio`, `fim` (data-hora local), `duracao_reservada_min`, `profissional` (relação), `cadeira` (relação), `paciente_nome`, `paciente_telefone`, `paciente_clinicorp_id` (quando vier), `status` (relação), `categoria` (relação), `cancelado`, `excluido`, `notas`, `clinicorp_alterado_em`, `sincronizado_em`, `origem` (`fixture`, `manual` ou `importacao`), `ausente_na_ultima_leitura`, `alerta` (texto), `teste` (bool). Índice único em (`origem`, `item_tipo`, `clinicorp_id`). IDs manuais gerados no app; não inventar ID Clinicorp. Identificador local estável usado pelas demais coleções.
- `sincronizacoes` (nome interno legado para os lotes de importação, não conexão API): `inicio`, `fim`, `situacao` (`ok`, `parcial`, `falha`, `nao_configurado`), `janelas`, `itens_lidos`, `itens_gravados`, `erro_resumo` (sem credencial nem dado de paciente), `disparada_por`, `origem`, `arquivo_hash`, `versao_mapeamento`, `contagem_rejeitada`, `periodo_coberto`.
- `provas_execucoes`: `spec`, `cenario`, `esperado`, `obtido`, `passou`, `executado_por`, `executado_em`, `observacao`.


## Fluxo e regras

1. Criar a base e os usuários com regras por papel; garantir acesso por unidade no servidor.
2. Carregar fixture ou selecionar arquivo, mapear colunas, escolher unidade/período, conferir prévia e rejeições. Aplicação transacional apenas de registros validados.
3. Upsert por namespace/tipo/ID, sem duplicar reimportação do mesmo arquivo; armazenar hash, autor, versão, data e período. Não criar cron nem botão que busque dados externos; Atualizar recarrega apenas o banco local.
4. Mostrar agenda por dia/profissional/cadeira. Bloqueio/compromisso ocupa intervalo; dia inteiro bloqueia a jornada. Sem horário de trabalho, “horário não cadastrado”. Intervalos adjacentes do mesmo paciente/profissional formam visita com alerta de possível divisão, preservando IDs.
5. Lote parcial/omissão não cancela registro: manter ocupado/incerto até cancelamento/exclusão explícitos na fonte ou conferência auditada. Não eliminar registros que deixaram de vir. Agenda por chegada exibe turno/pessoas; política pendente não vira ilimitada.

## Instruções de execução para o Ethos

Ler esta SPEC e o schema existente. Construir uma task de cada vez: base/acesso → importador/prévia → agenda → provas. Alterar apenas essas superfícies. Não configurar provedores, credenciais externas ou polling. Parar o caso afetado por coluna/identidade/regra ambígua; o modo sintético permanece utilizável. Não afirmar sincronização ou reserva clínica real.

### Mecanismo de provas da fase

Tela Provas somente gestão executa `src/provas/spec-1-00N.ts` contra rotas/serviços reais internos; grava `spec`, cenário, esperado, obtido, passou, autor e data. RED antes do comportamento; GREEN após; regressão das SPECs anteriores. Fixture `teste=true` em modo separado; painel operacional exclui teste, painel demonstrativo exibe banner e apenas teste. Limpar fixture apaga só registros sintéticos sem referências reais. Dados reais de paciente não entram em fixtures/capturas de grupo.

Instrumentar chamadas de saída para Clinicorp, Meta, DeepSeek, transcrição e agência: zero chamadas em cada cenário de fase 1. Login/banco/arquivos nativos do Skip são permitidos. Não instalar conectores desligados como requisito desta fase.

## Checklist de execução

- [ ] Base e regras de acesso por papel/unidade.
- [ ] Importação com prévia, rejeição e upsert auditados.
- [ ] Agenda com origem/data e dados incertos conservados.
- [ ] Tela Provas e massa separada.
- [ ] Provas e CL-008 sem API externa.

## Critérios de aceite

- [ ] **CA-1-01:** sem papel/inativo não lê registros; cada papel vê apenas sua unidade e atribuição.
- [ ] **CA-1-02:** fixture/arquivo aplica catálogos/agenda com origem/lote/período e contagens registrados.
- [ ] **CA-1-03:** 20 itens conferem com a massa/arquivo validado em horário, profissional, paciente e status; não é prova de API.
- [ ] **CA-1-04:** origem/data/mode aparecem; importação inválida mantém dados anteriores com erro; nenhuma chamada externa.
- [ ] **CA-1-05:** visão por profissional/cadeira nunca mostra ocupado/bloqueio/incerto como livre confirmado.
- [ ] **CA-1-06:** reimportação não duplica; visita dividida tem alerta e IDs preservados.

## TDD da SPEC

| Etapa | Prova/ação | Esperado | Evidência |
|---|---|---|---|
| RED | P1-01 acesso; P1-02 importação; P1-03 reimportação; P1-04 arquivo inválido; P1-05 bloqueio; P1-06 visita dividida, antes de construir | Falhas relevantes registradas | provas_execucoes |
| GREEN | P1-01 usuário sem papel; P1-02 aplicar fixture 20 itens; P1-03 aplicar duas vezes; P1-04 lote com data inválida | Sem acesso; 20 itens válidos; mesma contagem; anterior preservado/erro | Esperado/obtido e log de lote |
| GREEN | P1-05 bloqueio 10–11 e dia inteiro; P1-06 dois blocos adjacentes; P1-07 reimportação parcial omitindo ocupado | Nenhuma vaga falsa; uma visita com alerta; omitido incerto e ocupado | provas_execucoes |
| REFACTOR/REGRESSÃO | P1-08 namespace fixture/manual/importado e chamadas externas interceptadas; P1-09 ID longo/texto e horário ambíguo | Sem mistura/HTTP fornecedor; ID preservado; ambíguo rejeitado | Contagem de saídas = 0 |

## Teste humano do cliente

CL-008: Luiz/Victor e CRC entram por papel; conferem 20 itens com fixture/arquivo, mudam visão, importam cancelamento explícito de teste e depois lote parcial. Ver origem, nenhum envio/conexão e nenhum intervalo falso. Resposta “testei, pode seguir” no card com resultado e massa usada. Não criar/cancelar consulta real para testar esta fase.

## Handoff e operação

Demonstrar app local, manter Clinicorp/Trello/APP CRC na rotina atual. Campo de conexão permanece indisponível; não pede credenciais. Importar nova versão é ação humana. Prova de API, evento de fim, conciliação e go-live são fase 4.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| 029c9b34-b67b-4390-9df1-ca940b9eaa25 | Fazer a call de início da construção da fase 1 | CA-1-01–06 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| 7805f88a-2157-43fc-9a25-a59ef7b45691 | Criar a base da unidade piloto com acesso por função | CA-1-01 | P1-01 | Dados locais e dependências desta SPEC |
| 556859ba-f5f4-4154-9908-69d216d1070a | Montar a tela de provas da fase 1 | CA-1-01 | P1-01 | Dados locais e dependências desta SPEC |
| c7194c3e-4a69-49aa-935b-136865c09d1d | Trazer a agenda do Clinicorp para a central | CA-1-02/04/06 | P1-02/03/04/07/08 | Dados locais e dependências desta SPEC |
| a38335a3-52a3-4bcd-9bb0-74f978b3eea7 | Ler profissionais, cadeiras, status e categorias | CA-1-02, CA-1-04 e CA-1-06 | P1-02 a P1-04; P1-06 | Dados locais e dependências desta SPEC |
| 416ed8cc-aa7a-4e30-b9e7-aeb76913d02c | Conferir 20 horários da central com o Clinicorp | CA-1-03 | P1-02/09 | Dados locais e dependências desta SPEC |
| 5b3fe9b6-78b3-4cda-b45d-9c3f23f49305 | Montar a tela de agenda e vagas da unidade | CA-1-05 | P1-05 | Dados locais e dependências desta SPEC |
| 81d10fc4-1ab6-4c12-85cf-8d99442e74ff | Cadastrar os horários de atendimento de cada dentista | CA-1-05 | P1-05 | Dados locais e dependências desta SPEC |
| b1b67130-339f-4348-bfd5-db6bb5a12f0c | Testar a agenda de um dia real com a equipe | CA-1-05 | P1-05 | Dados locais e dependências desta SPEC |
| 11aeb329-28b3-401b-8cc9-e6a16f3ef73f | Testar consulta ausente em leitura parcial | CA-1-04/05/06 | P1-07 | Dados locais e dependências desta SPEC |
