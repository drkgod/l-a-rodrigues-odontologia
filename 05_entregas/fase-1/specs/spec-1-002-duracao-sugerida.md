# SPEC-1-002 — Duração sugerida e desvio justificado

**Fase:** 1  
**Status:** planejada  
**Dono:** L A Rodrigues (execução com o Maestro) · tabela de duração: Luiz · aceite: Rodrigo Santos (consultor)  
**Origem no escopo:** Fase 1, função (2) Duração no agendamento; RQ-002, LRQ-002; decisões AC-001, DH-03 (arredondamento), AC-L03; item CL-001  
**Degrau da solução:** construção mínima no projeto Skip da SPEC-1-001 — tabela versionada e cálculo determinístico no backend; sem IA.

## Modo obrigatório da fase — AC-13-IT

Esta SPEC executa apenas no app e banco nativos. Dados vêm da SPEC-1-001 por fixture separada, arquivo validado ou cadastro auditado; não há API externa, segredo de fornecedor, webhook, polling ou chamada de IA. Referência a Clinicorp significa dados exportados/manual identificados, nunca leitura automática. Toda tela exibe origem/lote/data e “sem sincronização”. Provas e teste humano usam a mesma massa local. Teste de saída deve registrar zero chamadas a Clinicorp/Meta/IA/transcrição; recursos nativos do Skip são permitidos. Envio/reserva real e retirada de controles anteriores ficam para a fase 4. Não usar fixture para afirmar resultado operacional.

## Contexto e decisões fechadas

**Consulta de CL-001 antes de solicitar:** a clínica informou a pasta https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9. Procurar e ler os arquivos disponíveis, seguindo `AGENTS.md` e `.adapta-cliente/fontes-do-projeto.md`, antes de pedir tabela ou reenvio. “CL-001” identifica uma necessidade de dados, não um nome obrigatório de arquivo: regras podem estar distribuídas entre materiais existentes. Se faltar acesso, explicar e pedir somente acesso; se faltar campo após leitura, especificar campo, finalidade no cálculo e fonte consultada. Não declarar tabela ausente sem verificar. Essa consulta pelo assistente não conecta o app ao Drive.

- **Estado atual:** quem agenda decide a duração "de cabeça". Os critérios existem, mas não são aplicados; a duração depende de procedimento, quantidade, combinação e profissional, e não é linear (exemplos da clínica: 3 facetas ≈ 30 min, 10 facetas ≈ 1 h, 10 facetas + 1 implante ≈ 1 h 15; 2 coroas ≈ 30 min, 4 coroas ≈ 40 min).
- **Estado desejado:** ao planejar um agendamento na central, a CRC informa paciente, procedimento, quantidade, combinação e profissional e recebe o tempo sugerido pela tabela da clínica, arredondado, e as vagas compatíveis. Depois de vincular uma reserva importada ou simulada, a CRC liga a reserva ao planejamento; se o tempo reservado for diferente do sugerido, registra o motivo. A gestão revisa os desvios.
- **Decisões já fechadas:**
  - A fonte da duração é a tabela enviada pela clínica (CL-001). O sistema nunca inventa tempo: combinação sem regra vai para validação.
  - Arredondamento para cima no múltiplo de `config_unidade.arredondamento_min` (5 ou 10, definido pela clínica).
  - A CRC pode reservar tempo diferente do sugerido, com motivo; a gestão revisa depois. Desvio sem motivo fica como pendência da CRC.
  - Nesta fase a reserva é simulada na massa de teste ou vinculada a um item de arquivo validado; a central não lê nem escreve no Clinicorp. O sistema oficial continua operado fora do app.
  - A média automática por dentista **não** faz parte desta fase.
- **Bloqueios:** sem a tabela (CL-001), a tela funciona, mas todo cálculo retorna "sem regra".

## Resultado observável

A CRC escolhe "4 coroas com a Dra. X" e a central mostra, por exemplo, "40 min (regra: coroas 3–4, Dra. X)" e as vagas do dia em que esse tempo cabe; para "2 coroas" mostra outro tempo, que não é a metade. Quando a reserva da massa/arquivo sai com tempo diferente, a central pede o motivo e a gestão vê a lista de desvios.

## Limites e dependências

- **Inclui:** importação e versionamento da tabela; cálculo do tempo sugerido; lista de vagas compatíveis; planejamento do agendamento; vínculo com a reserva importada ou simulada; desvio com motivo; lista de casos sem regra e de desvios para a gestão.
- **Fora de escopo:** escrita no Clinicorp; média automática por dentista (fase 2); uso de IA; definição clínica de tempos (é da clínica).
- **Entradas e pré-condições:** SPEC-1-001 aceita (agenda e profissionais aplicados de lote local); CL-001 (tabela de duração e cadeiras); `arredondamento_min` informado pela clínica (5 ou 10).
- **Saídas/artefatos:** coleções `tabela_duracao`, `regras_duracao`, `planejamentos`, `desvios_duracao`; rota `/backend/v1/duracao/sugerir`; tela "Planejar agendamento"; listas "Casos sem regra" e "Desvios".
- **Dependências e responsáveis:** tabela — Luiz; construção — clínica com o Maestro; revisão de desvios — gestão.
- **Atores e permissões mínimas:** CRCs planejam e ligam reservas; gestão importa, organiza/publica versões e revisa desvios; avaliador habilitado valida clinicamente novas combinações e tempos conforme a emenda. Demais funções só leem a duração. Gestão sem habilitação clínica não substitui essa validação.
- **Superfícies/arquivos/configurações afetadas:** migrations das coleções desta SPEC; hook `duracao_sugerir` (rota); hook de verificação pós-importação `planejamentos_conciliar`; telas e serviços em `src/`.
- **Risco e plano B:** tabela incompleta → casos sem regra listados para a direção, sem tempo fictício; CRC continua agendando no Clinicorp normalmente.
- **Rollback ou reversão:** voltar para a versão anterior da tabela (versões nunca são apagadas); desligar a tela de planejamento sem afetar a agenda.

## Análise dos documentos e perguntas permitidas

**Fonte:** https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9, materiais já recebidos e dados internos citados nesta SPEC. O conteúdo da pasta ainda não foi verificado neste preparo; não presumir que falta documento. Consultar pasta/subpastas com acesso de leitura, registrar arquivos e conteúdo efetivamente lidos em `.adapta-cliente/fontes-do-projeto.md` e seguir `AGENTS.md`. A consulta pelo assistente não é integração do app.

**Método antes de perguntar:** identificar a task e a análise abaixo; procurar os campos nos materiais existentes, mesmo distribuídos entre arquivos; relacionar campo de origem ao campo interno; validar qualidade e conflitos; reaproveitar os dados válidos; registrar apenas a lacuna específica. Preservar unidade/versão/ID de origem, não converter campo vazio em zero nem inferir regra de produção. Arquivo de nome diferente também pode atender. Falha de acesso pede somente acesso, não reenvio. Converter o formato no ambiente autorizado quando viável, sem pedir à clínica trabalho que o assistente pode fazer.

| Material e campos a localizar | Análise que o executor deve fazer | Saída que alimenta o app |
|---|---|---|
| Regras de tempo existentes: procedimento, quantidade/faixa, combinação, profissional, minutos | Consolidar regras de vários arquivos; conferir unidade de tempo, minutos > 0, faixas sobrepostas, regra por profissional versus “todos”; não extrapolar por proporção e não somar combinação sem regra aprovada | Tabela candidata no contrato de tabela_duracao, versão/fonte por regra e lista de linhas conflitantes/rejeitadas |
| Horários/cadeiras e agenda local da SPEC-1-001 | Separar duração sugerida de tempo reservado; cruzar capacidade apenas quando política aprovada; minutos de jornada não são tempo por procedimento | Vagas compatíveis ou capacidade pendente; comparação sugerido/reservado e motivo de desvio |
| Exemplos de duração das calls | Identificar o que é exemplo, não catálogo completo; comparar com arquivo aprovado, sem promover estimativa a regra clínica | Exemplos rastreados e lacunas somente das combinações/profissionais realmente sem regra |

**Perguntar somente se necessário:** se duas regras válidas divergem, citar procedimento/faixa/profissional e valores encontrados e pedir qual prevalece. Se faltar regra, perguntar só os minutos daquela combinação; explicar o uso no cálculo e na reserva. Se arredondamento 5/10 ainda não estiver aprovado em nenhuma fonte, pedir essa escolha uma vez, sem preencher por suposição. “CL-001” é um conjunto de dados, não nome obrigatório de planilha. Dados reais suficientes passam pelo versionamento/aceite já previsto; não exigir novo catálogo nem aprovação extra por arquivo. Demonstração usa tabela sintética separada.

**Registro e limite:** antes de pedir complemento, produzir em `06_notas/analises-documentais/SPEC-1-002.md` a task/critério, arquivos efetivamente consultados (link/ID, aba/seção/página, versão/data), mapa campo de origem → campo interno, dados aproveitados, validações/rejeições, conflitos, lacuna e seu efeito. Pode atualizar uma análise existente; não exigir arquivo separado por cada tarefa. Relatório não contém nomes, telefones, valores individuais, senhas, tokens ou prontuário; registrar metadados e exemplos anonimizados. Não copiar planilhas de pacientes para o Git. Dados normalizados vão ao banco/armazenamento autorizado conforme permissões desta SPEC, com revisão/aprovação já exigidas antes de uso real.

**Pedido permitido:** “Consultei [arquivos/abas]. Já aproveitei [campos]. Para [task e funcionalidade], falta somente [campo/regra/decisão], porque [efeito concreto]. Isso [bloqueia só o uso real afetado / permite continuar a demonstração]. Podem [complementar ou esclarecer esse ponto]?” Perguntar apenas após leitura suficiente e busca nas fontes autorizadas. Falha de acesso deve ser declarada como acesso pendente, nunca como documento ausente; informar conta/permissão só se identificadas. Nenhum pedido ou mensagem à clínica é enviado automaticamente pela análise.

**Conferência da análise (quando a task consumir documentos):** arquivo encontrado suficiente → aproveitar sem pedido; arquivo parcial → pedir só campo ausente; acesso negado → pedir acesso, não upload; fontes conflitantes → apresentar valores/regras para decisão, sem escolher por suposição. Conferir três exemplos anonimizados (válido, incompleto e conflito) contra o contrato e guardar esperado/obtido. Os cenários não exigem novas tasks nem reabrem entregas concluídas; nenhuma leitura ou teste é declarado executado por esta atualização das SPECs.

## Emenda — duração não define sequência (14/10)

A tabela responde quanto tempo reservar para procedimentos feitos na mesma visita. A ordem entre etapas pertence ao planejamento individual da SPEC-1-003. A tela “Sem regra” pode ser construída antes desse planejamento; cálculo/rascunho não depende dele. Finalizar planejamento de tratamento, ofertar ou vincular nova reserva exige a liberação descrita na SPEC-1-004. Avaliações e cadastro de leads não exigem plano de tratamento prévio.

Construir a lista e visualizar os casos pode continuar agora. Antes de ativar gravação de validação clínica nessa tela, concluir a task “Configurar quem pode validar o planejamento clínico”. Sua primeira entrega habilita o avaliador e protege a aprovação de duração; o vínculo por paciente é provado com estrutura mínima/fixture, sem depender do editor completo de etapas. A sequência individual deve estar construída antes das novas ofertas e reservas de tratamento, não como condição para listar casos sem duração.

**Validar duração:** gestão mantém a tabela; dentista avaliador habilitado faz a validação clínica das novas combinações/tempos e direção/gestão aprova sua publicação conforme o versionamento existente. Casos são agrupados por combinação/quantidade/faixa/profissional, exibindo ocorrências e última data; acesso clínico somente aos avaliadores habilitados, usando dados agregados sem fichas de outros pacientes. Gestão lê/organiza, mas não inventa duração.

“Marcar validado” sem regra utilizável não resolve a pendência. Registrar combinação, faixa/quantidade, profissional e minutos, autor/data da validação clínica; gestão publica nova versão. Só sair dos pendentes quando a versão ativa resolve o cálculo correspondente. Decisão de não cadastrar a combinação encerra como rejeitada, com motivo; o planejamento continua sem regra. Uma exceção do paciente não cria regra global nem altera outros tratamentos. Regras existentes aprovadas permanecem válidas; a revisão não reabre tasks aceitas ou exige reenviar tabela.

**Campos adicionais:** `regras_duracao.validada_clinicamente_por/em`, `origem_validacao` (referência restrita), `casos_sem_regra.situacao` (pendente/resolvido/rejeitado), `regra_resolvedora`, autor/data/motivo. Se os casos já são derivados de planejamentos, manter essa origem e registrar resolução por chave lógica, sem duplicar casos.

**CA-SEQ-D / P2-07:** usuário gestão sem autorização clínica não valida; avaliador registra nova regra sem publicá-la; versão ativa antiga continua; publicação torna a combinação resolvida. Tentar apenas ocultar pendência sem regra permanece sem tempo. **P2-08:** ajustar a sequência de paciente A não muda duração/catálogo/ordem de B. RED antes dos controles, GREEN com esses resultados e regressão P2-01–06. CL-008: avaliador + gestão conferem um caso com regra criada e outro rejeitado; mensagem ao paciente não faz parte do teste.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Planilha CL-001 → `tabela_duracao` | Clínica (Luiz) | colunas: `procedimento`, `quantidade_min`, `quantidade_max`, `combinacao` (procedimentos somados, opcional), `profissional` (nome igual ao Clinicorp ou "todos"), `minutos` | upload só por `gestao` | importação cria uma nova versão; reimportar o mesmo arquivo não duplica (hash do arquivo) | Linha inválida rejeitada com motivo (profissional não encontrado, minutos ≤ 0, faixa sobreposta); versão não ativa até a gestão aprovar |
| `agenda_itens` (SPEC-1-001) → `planejamentos` | Massa/arquivo validado (reserva) | `inicio`, `fim`, `duracao_reservada_min`, `profissional`, `paciente_nome`, `paciente_telefone` | leitura | vínculo por escolha da CRC; um item da agenda liga a no máximo um planejamento | Item não encontrado → pendência "reserva não encontrada" |

**Coleções:**

- `tabela_duracao`: `versao`, `arquivo_hash`, `importada_por`, `importada_em`, `aprovada_por`, `aprovada_em`, `ativa` (somente uma ativa).
- `regras_duracao`: `tabela` (relação), `procedimento`, `quantidade_min`, `quantidade_max`, `combinacao`, `profissional` (relação ou vazio = todos), `minutos`.
- `planejamentos`: `paciente_nome`, `paciente_telefone`, `paciente_ref` (relação com a ficha da SPEC-1-003, quando existir), `procedimento`, `quantidade`, `combinacao`, `profissional`, `minutos_sugeridos`, `regra_aplicada` (relação), `situacao` (`planejado`, `reservado`, `sem_regra`, `reserva_nao_encontrada`, `cancelado`), `agenda_item` (relação, único), `minutos_reservados`, `criado_por`, `teste`.
- `desvios_duracao`: `planejamento`, `minutos_sugeridos`, `minutos_reservados`, `diferenca`, `motivo_tipo` (`grade do profissional` ou `outro`; a gestão pode acrescentar opções), `motivo` (texto obrigatório para fechar), `situacao` (`sem_motivo`, `justificado`, `revisado`), `crc`, `revisado_por`, `revisado_em`.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Existe regra para procedimento + faixa de quantidade + profissional | Sugere `minutos` da regra, arredondado para cima no múltiplo configurado | Regra do profissional prevalece sobre a de "todos" | CL-001; `00:52:42` (arredondar para 5 ou 10) |
| RN-02 | Combinação de procedimentos | Usa a regra cuja `combinacao` corresponde exatamente; sem correspondência, `sem_regra` | Nunca soma tempos automaticamente | `00:11:56`, `00:41:17` |
| RN-03 | Nenhuma regra aplicável | `situacao = sem_regra`; entra em "Casos sem regra" para avaliador habilitado e gestão; nenhum tempo é mostrado | — | AC-001 |
| RN-04 | Reserva ligada com `minutos_reservados ≠ minutos_sugeridos` | Cria `desvios_duracao` com `sem_motivo`; vira pendência da CRC até o motivo ser registrado | A comparação usa o tempo sugerido já arredondado; se a grade do profissional no Clinicorp obrigar um bloco maior, o motivo "grade do profissional" é uma opção da lista de motivos | AC-001 |
| RN-05 | Item de agenda novo sem planejamento ligado | Aparece em "Reservas sem planejamento" (contagem no painel) | Compromissos e bloqueios não contam | AC-001 |
| RN-06 | Planejamento `planejado` sem reserva ligada até o fim do dia do planejamento | `reserva_nao_encontrada`, pendência da CRC que planejou | — | Registro duplo na fase 1 |
| RN-07 | Vagas compatíveis | Intervalos livres (SPEC-1-001) do profissional com duração ≥ `minutos_sugeridos`, nos próximos dias da janela | Agenda de avaliação segue o limite de sobreposição da SPEC-1-004 | — |

## Fluxo e regras

1. A gestão importa a planilha CL-001; a central valida, mostra as linhas rejeitadas e a gestão aprova a versão.
2. A CRC abre "Planejar agendamento", escolhe paciente (ou digita nome e telefone), procedimento, quantidade, combinação e profissional.
3. A rota `/backend/v1/duracao/sugerir` devolve minutos sugeridos e a regra aplicada (ou `sem_regra`); a tela mostra as vagas compatíveis.
4. A CRC clica “Ligar reserva” e escolhe um item da massa/arquivo (mesmo profissional e paciente, com origem e lote), sem ação externa. Reserva simulada tem marcador de demonstração.
5. Se os minutos reservados forem diferentes do sugerido, a central abre o campo "motivo" e cria o desvio; sem motivo, o desvio fica pendente na lista da CRC.
6. Gestão revisa desvios; avaliador habilitado valida clinicamente combinações novas e gestão publica a versão, conforme a emenda. Não encerrar caso só por clicar em validado.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | 4 coroas, Dra. X, regra 3–4 coroas = 40 min | 40 min, regra mostrada, vagas ≥ 40 min | — |
| Limite | 2 coroas, mesma profissional, regra 1–2 = 30 min | 30 min (não é metade de 40) | — |
| Limite | Profissional com regra própria e regra "todos" | Usa a do profissional | — |
| Falha | Combinação sem regra | "Sem regra — validar com a direção"; caso listado | Avaliador habilitado valida clinicamente a combinação; gestão publica a regra em nova versão |
| Falha | Reserva de 60 min para sugestão de 40 | Desvio `sem_motivo` até a CRC justificar | Pendência visível para a CRC e no painel |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC, a SPEC-1-001 (coleções e mecanismo de provas) e o esquema atual do projeto.
2. **Alterar somente:** coleções, rota e telas desta SPEC; acrescentar `arredondamento_min` em `config_unidade` se ainda não existir.
3. **Não alterar:** a tabela de tempos por conta própria (tempos vêm só da clínica); a agenda do Clinicorp; as regras de acesso da SPEC-1-001.
4. **Executar nesta ordem:** (a) coleções; (b) importação com validação e aprovação de versão; (c) rota de sugestão; (d) tela de planejamento com vagas compatíveis; (e) ligar reserva e desvios; (f) listas da gestão; (g) provas.
5. **Parar e pedir validação quando:** a planilha tiver coluna que não cabe no contrato; um procedimento aparecer com nomes diferentes; houver dúvida se uma diferença é desvio ou arredondamento.
6. **Estado válido ao parar:** a versão ativa anterior continua valendo; nenhum planejamento perde o vínculo já feito.

## Checklist de execução

- [ ] Tabela CL-001 recebida e importada; linhas rejeitadas devolvidas à clínica.
- [ ] Versão aprovada pela gestão.
- [ ] Sugestão, casos sem regra e vagas compatíveis funcionando.
- [ ] Ligação de reserva, desvio com e sem motivo exercitados.
- [ ] Listas da gestão revisadas.
- [ ] Provas e teste humano registrados.

## Critérios de aceite

- [ ] **CA-1-07:** a importação cria uma versão com autor e data, rejeita linhas inválidas com motivo e só passa a valer depois da aprovação da gestão; versões anteriores continuam consultáveis.
- [ ] **CA-1-08:** duas e quatro coroas, com dois profissionais diferentes, geram quatro tempos de acordo com a tabela, não lineares e arredondados no múltiplo configurado.
- [ ] **CA-1-09:** combinação ou profissional sem regra mostra "sem regra — validar com a direção", não mostra tempo e entra em "Casos sem regra".
- [ ] **CA-1-10:** reserva ligada com tempo diferente do sugerido cria desvio; sem motivo ele fica pendente para a CRC; com motivo aparece em "Desvios" para a revisão da gestão.
- [ ] **CA-1-11:** reserva sem planejamento aparece em "Reservas sem planejamento" e planejamento sem reserva até o fim do dia vira "reserva não encontrada".

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | Cenários P2-01 a P2-06 antes da rota e das telas | Tela "Provas" → "Rodar provas da SPEC-1-002" | Falham (rota inexistente ou sem regra) | `provas_execucoes` com `passou = false` |
| GREEN | Tabela de teste (versão `teste`): coroa 1–2 = 30 min e 3–4 = 40 min para Profissional Teste A; coroa 1–2 = 25 min e 3–4 = 35 min para Profissional Teste B; arredondamento 5. P2-01: 2 coroas A → 30. P2-02: 4 coroas A → 40. P2-03: 2 coroas B → 25 e 4 coroas B → 35. P2-04: 10 facetas + 1 implante sem regra → `sem_regra` e caso listado. P2-05: planejamento 40 min ligado a item de teste de 60 min → desvio `sem_motivo`; registrar motivo → `justificado`. P2-06: item de teste sem planejamento → "reserva sem planejamento"; planejamento de ontem sem reserva → `reserva_nao_encontrada` | mesma tela | Todos passam | `provas_execucoes` com `passou = true` |
| REFACTOR/REGRESSÃO | Importar a tabela fornecida pela clínica ou a tabela sintética declarada no modo de prova; rodar de novo P1 (SPEC-1-001) e P2; planejar dois agendamentos da fixture com a equipe | Tela "Provas" e tela de planejamento | Provas passam; tempos calculados conferem com a tabela identificada | Captura da tela de planejamento e da lista de desvios |

**Dados/fixtures:** tabela de teste acima; profissionais de teste A e B; itens de agenda de teste com `teste = true`.  
**Caminhos de erro obrigatórios:** linha com minutos zero, profissional inexistente, faixas sobrepostas, combinação sem regra, reserva sem planejamento, planejamento sem reserva.  
**Evidência exigida:** registros de prova, versão aprovada da tabela, capturas das listas "Casos sem regra" e "Desvios".

**Integração com capacidade:** este recurso calcula a duração e prepara um rascunho; não cria reserva no Clinicorp. Duração e rascunho podem ser aceitos isoladamente sem a SPEC-1-004 inteira aceita; a capacidade só é validada depois do cadastro de políticas e prova integrada da SPEC-1-004. Quando a política de agenda da SPEC-1-004 estiver cadastrada, consultá-la antes de finalizar oferta/planejamento. Se a política local estiver pendente, cálculo pode aparecer como referência, mas vaga não pode ser apresentada como capacidade validada nem oferta ser concluída. A implementação da capacidade não muda a fórmula de duração ou cria escrita na agenda oficial.


**Regressão de estágio (CA-1-08/09):** procedimento com duração conhecida e sem política de agenda retorna duração + rascunho, “capacidade pendente”, sem conclusão/oferta validada. A prova isolada de duração usa política sintética validada; não ativa regra real. Depois de cadastrar política aprovada na SPEC-1-004, repetir e concluir planejamento permitido. A integração usa módulo de consulta `politica_capacidade` compartilhado definido na SPEC-1-004; não copiar ou completar a regra na SPEC-1-002. O aceite da capacidade integrada pertence à SPEC-1-004, resolvendo a dependência circular.


## Teste humano do cliente

- **Origem:** CL-008
- **Quem testa:** Luiz (tempos) e uma CRC de agendamento.
- **Passos:** (1) planejar 2 coroas e 4 coroas com dois dentistas diferentes e conferir os tempos com a tabela; (2) planejar uma combinação que não está na tabela; (3) vincular um item de teste com tempo diferente e ligar a reserva sem motivo, depois com motivo; (4) abrir "Desvios" como gestão.
- **Resultado esperado:** tempos iguais aos da tabela, combinação sem regra sinalizada e desvio pedindo motivo.
- **Evidência do aceite:** "testei, pode seguir" no card, com a captura da lista de desvios.

## Handoff e operação

- **Como demonstrar:** planejar 2 e 4 coroas na frente da equipe.
- **Como operar depois:** a gestão atualiza a tabela por nova versão quando a clínica mudar um tempo; revisa desvios semanalmente.
- **Como monitorar:** contagem de casos sem regra, desvios sem motivo e reservas sem planejamento (painel da SPEC-1-006).
- **Pendência conhecida:** média automática por dentista na fase 2.

**Fixtures após a emenda:** P2-01–04 de cálculo continuam independentes de plano. P2-05/06, quando envolverem vínculo/finalização de tratamento, usam plano/etapas sintéticos aprovados e liberados na mesma unidade/paciente, sem reaproveitar autor de produção. Vincular avaliação não exige plano; tratamento sem plano é cenário negativo. Durante construção da tela Sem regra, antes do guard, cálculo/rascunho permanecem aceitos e não prometem reserva real. Regressão do vínculo integrado ocorre após a task de guard; provas anteriores não são reabertas sem mudança no caminho testado.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| f4982b80-9c9e-4a0b-95b2-49a41af4e476 | Enviar a tabela de tempo por procedimento e por dentista | CA-1-07 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| 1f4de19d-189b-46a2-8538-fd394a7be2dc | Cadastrar a tabela de duração na central | CA-1-07 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| 097ff6ce-cdc7-44fd-984c-4ee315fc8406 | Mostrar o tempo sugerido ao planejar um agendamento | CA-1-08 | P2-01 a P2-03 | Dados locais e dependências desta SPEC |
| 6d5de2f5-cdc0-4314-bbee-293d7f3b3d71 | Listar as combinações sem regra para a direção validar | CA-1-09; CA-SEQ-D | P2-04; P2-07/08 | Dados locais e dependências desta SPEC |
| fdca5fb0-379d-4ede-8b73-409508033157 | Pedir o motivo quando a reserva fugir do tempo sugerido | CA-1-10 e CA-1-11 | P2-05 e P2-06 | Dados locais e dependências desta SPEC |
| c9b95987-0344-4a5f-b528-b5561c1717ca | Testar duas e quatro coroas com dentistas diferentes | CA-1-08/09; CA-1-10/11 | P2-01 a P2-04; P2-05/06 | Dados locais e dependências desta SPEC |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
