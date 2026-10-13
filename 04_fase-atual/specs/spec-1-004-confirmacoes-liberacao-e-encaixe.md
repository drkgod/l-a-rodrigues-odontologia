# SPEC-1-004 — Confirmações, liberação e encaixe de vagas

**Revisão:** 13/10/2026 — regras do cliente incorporadas; nenhuma execução comprovada.

**Fase:** 1  
**Status:** planejada  
**Dono:** L A Rodrigues (execução com o Maestro) · regras: Luiz · aceite: Rodrigo Santos (consultor)  
**Origem no escopo:** Fase 1, funções (4) Confirmações e ligações e (5) Encaixe; RQ-005, RQ-006, LRQ-004, LRQ-005; decisões DH-03, AC-L01, AC-05-04; canal da fase 1 (lista para o robô, kickoff); itens CL-004 e CL-009  
**Degrau da solução:** reuso do robô de disparo que a clínica já usa (a central gera a planilha) + construção mínima no projeto Skip; regras garantidas no backend.

## Modo obrigatório da fase — AC-13-IT

Esta SPEC executa apenas no app e banco nativos. Dados vêm da SPEC-1-001 por fixture separada, arquivo validado ou cadastro auditado; não há API externa, segredo de fornecedor, webhook, polling ou chamada de IA. Referência a Clinicorp significa dados exportados/manual identificados, nunca leitura automática. Toda tela exibe origem/lote/data e “sem sincronização”. Provas e teste humano usam a mesma massa local. Teste de saída deve registrar zero chamadas a Clinicorp/Meta/IA/transcrição; recursos nativos do Skip são permitidos. Envio/reserva real e retirada de controles anteriores ficam para a fase 4. Não usar fixture para afirmar resultado operacional.

## Contexto e decisões fechadas

- **Estado atual:** a CRC monta à mão a planilha do robô (nome, telefone e mensagem) e o robô envia aos poucos, no máximo cerca de 80 mensagens por dia. Muitos pacientes idosos não respondem e aparecem mesmo assim. No dia, falta tempo para ligar para quem não confirmou, e a vaga de quem falta não é reposta.
- **Estado desejado:** a central gera a lista de confirmação já no formato do robô, guarda o estado de cada contato separado do estado da consulta, monta a lista de ligação com responsável por turno, só permite liberar a vaga pela regra da clínica e, depois da desmarcação no Clinicorp, ajuda a CRC a oferecer a vaga a até três pacientes compatíveis, garantindo que só o primeiro que aceitar fique com ela.
- **Decisões já fechadas:**
  - Silêncio isolado não libera vaga. Cancelamento/remarcação explícitos são caminhos próprios. No caminho sem resposta, exigir três mensagens efetivamente enviadas e registradas e uma ligação sem sucesso no dia anterior, ausência de confirmação e relógio do servidor às 17:00 ou depois do dia anterior à consulta, em America/Sao_Paulo. Exportar planilha não conta como envio.
  - Nesta fase a central não envia mensagens: gera somente prévia/planilha no modelo do robô e a CRC registra as respostas. Não há envio automático nem integração com WhatsApp.
  - Na prova local, cancelamento e nova reserva vêm da fixture/arquivo com evidência explícita. Nenhuma ação no Clinicorp é exigida; a operação oficial e sua conciliação entram na fase 4.
  - Oferta simultânea a no máximo 3 pacientes; a vaga fica com o primeiro aceite registrado; os demais são avisados de que a vaga foi preenchida; aceite tardio recebe a mesma resposta.
  - Avaliação: até dois pacientes por horário, trinta minutos por consulta. Tratamento com horário marcado: não admite sobreposição, salvo regra específica identificada e aprovada da agenda local. Ordem de chegada usa limite por turno. As regras recebidas e seus gates estão integralmente abaixo.
  - Enquanto a clínica não definir critério de prioridade (CL-PEND-005), os elegíveis aparecem em ordem de entrada na lista (mais antigo primeiro), marcada como "ordem provisória", e a CRC escolhe a quem ofertar.
- **Bloqueios:** WA-01 e avaliação já respondidas. Sem cobertura de ligação e modelo do robô, a operação afetada fica pendente; não criar responsável nem liberação por ausência de tentativas. Limites específicos incompletos ficam não ativados e não são tratados como ilimitados. Sem o modelo do robô (CL-009) a planilha sai com as colunas `nome`, `telefone`, `mensagem`.

## Resultado observável

A CRC confere a prévia e o XLSX na massa local, registra respostas/tentativas sintéticas e vê a lista de ligação. A regra completa permite decisão; somente cancelamento explícito validado libera o intervalo. A oferta assistida mostra até três elegíveis, dois aceites concorrentes têm um vencedor local e aviso pendente aos demais. Tudo aparece como demonstração, sem envio, ligação real ou consulta marcada no Clinicorp.

## Limites e dependências

- **Inclui:** parâmetros da regra; lista de confirmação e exportação no modelo do robô, sem acioná-lo; estados de contato; lista de ligação por turno; decisão de liberação; acompanhamento da desmarcação; sinalização de sobreposição e conflito; elegíveis para a vaga; ofertas com reserva exclusiva; vínculo do aceite com a nova reserva.
- **Fora de escopo:** envio de mensagens pela central; WhatsApp oficial; oferta automática; escrita no Clinicorp (fase 4); cadência de faltosos (fase 4).
- **Entradas e pré-condições:** SPEC-1-001 (agenda), SPEC-1-002 (tempo sugerido e "Ligar reserva") e SPEC-1-003 (pacientes a agendar e fichas) aceitas; CL-004 e CL-009.
- **Saídas/artefatos:** coleções `contatos_confirmacao`, `ligacoes`, `liberacoes`, `ofertas`; rotas `/backend/v1/confirmacao/registrar`, `/backend/v1/liberacao/decidir`, `/backend/v1/encaixe/ofertar`, `/backend/v1/encaixe/aceite`; telas "Confirmações", "Lista de ligação" e "Encaixe".
- **Dependências e responsáveis:** regras — Luiz; operação — CRC de confirmação; construção — clínica com o Maestro.
- **Atores e permissões mínimas:** `crc_confirmacao` e `crc_agendamento` registram respostas, ligações, decisões e ofertas; `gestao` edita parâmetros e vê tudo; `recepcao` e `dentista` só leem o estado de confirmação dos pacientes do dia.
- **Superfícies/arquivos/configurações afetadas:** migrations; hooks das rotas acima e `liberacoes_conciliar` (após cada importação validada); telas e serviços em `src/`; parâmetros em `config_unidade`; dependência de frontend `xlsx` (SheetJS) para gerar a planilha `.xlsx`.
- **Risco e plano B:** robô com limite diário → as linhas além do limite saem numa segunda lista "envio manual"; lista de ligação maior que a cobertura → aparece no painel para a gestão decidir.
- **Rollback ou reversão:** gestão suspende novas ofertas e registra o momento da falha; preserva/exporta os eventos recentes quando acessíveis; CRC registra contatos e decisões numa lista de contingência identificada (consulta, tentativa, horário, autor, resultado). Antes de retomar, concilia tentativas, respostas, vencedores e reservas com o último lote local validado, sem apagar eventos, repetir mensagens ou liberar vaga por silêncio. Nenhuma informação do Clinicorp é alterada automaticamente.

## Análise dos documentos e perguntas permitidas

**Fonte:** https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9, materiais já recebidos e dados internos citados nesta SPEC. O conteúdo da pasta ainda não foi verificado neste preparo; não presumir que falta documento. Consultar pasta/subpastas com acesso de leitura, registrar arquivos e conteúdo efetivamente lidos em `.adapta-cliente/fontes-do-projeto.md` e seguir `AGENTS.md`. A consulta pelo assistente não é integração do app.

**Método antes de perguntar:** identificar a task e a análise abaixo; procurar os campos nos materiais existentes, mesmo distribuídos entre arquivos; relacionar campo de origem ao campo interno; validar qualidade e conflitos; reaproveitar os dados válidos; registrar apenas a lacuna específica. Preservar unidade/versão/ID de origem, não converter campo vazio em zero nem inferir regra de produção. Arquivo de nome diferente também pode atender. Falha de acesso pede somente acesso, não reenvio. Converter o formato no ambiente autorizado quando viável, sem pedir à clínica trabalho que o assistente pode fazer.

| Material e campos a localizar | Análise que o executor deve fazer | Saída que alimenta o app |
|---|---|---|
| Respostas da clínica e políticas existentes | Aplicar regra já recebida: 3 mensagens + 1 ligação sem sucesso no dia anterior, sem confirmação, corte às 17h locais; avaliação 2 por horário de 30min. Não reabrir esses parâmetros | Configuração/prova da política; evento sintético identificado no modo demonstrativo |
| Agendas por profissional/turno e cobertura de CRC | Cruzar regra com unidade/regime/turno: Leonel 5; Wesley/Pamela Itaboraí 20 com escopo individual/grupo a confirmar somente se não encontrado; Erika Alcântara sábado 2/horário, regime/categoria a identificar. Não inferir 40, ilimitado ou tratamento sobreposto | Políticas com vínculos completos; caso ambíguo fica pendente apenas no uso afetado |
| Modelo do robô, textos e registros de contato existentes | Mapear nome/telefone/mensagem, ordenação, campos exigidos, limite do canal quando comprovado; texto sem procedimento/dado clínico; separar exportação de mensagem enviada e tentativa lógica de retry/correção | XLSX/prévia no formato lido, rejeições de contato e contrato de tentativa auditada; nenhum envio na fase 1 |

**Perguntar somente se necessário:** indicar exatamente qual turno/profissional ou coluna/texto não foi encontrado e explicar o uso na fila/limite/exportação. Pedir aprovação de texto somente quando não houver versão já aprovada; redação derivada não autoriza envio. Prioridade ainda não definida usa a ordem provisória já prevista, visível, sem bloquear toda a demonstração. Se o modelo não estiver disponível após consulta, testar o formato padrão desta SPEC sem cobrar reenvio genérico.

**Registro e limite:** antes de pedir complemento, produzir em `06_notas/analises-documentais/SPEC-1-004.md` a task/critério, arquivos efetivamente consultados (link/ID, aba/seção/página, versão/data), mapa campo de origem → campo interno, dados aproveitados, validações/rejeições, conflitos, lacuna e seu efeito. Pode atualizar uma análise existente; não exigir arquivo separado por cada tarefa. Relatório não contém nomes, telefones, valores individuais, senhas, tokens ou prontuário; registrar metadados e exemplos anonimizados. Não copiar planilhas de pacientes para o Git. Dados normalizados vão ao banco/armazenamento autorizado conforme permissões desta SPEC, com revisão/aprovação já exigidas antes de uso real.

**Pedido permitido:** “Consultei [arquivos/abas]. Já aproveitei [campos]. Para [task e funcionalidade], falta somente [campo/regra/decisão], porque [efeito concreto]. Isso [bloqueia só o uso real afetado / permite continuar a demonstração]. Podem [complementar ou esclarecer esse ponto]?” Perguntar apenas após leitura suficiente e busca nas fontes autorizadas. Falha de acesso deve ser declarada como acesso pendente, nunca como documento ausente; informar conta/permissão só se identificadas. Nenhum pedido ou mensagem à clínica é enviado automaticamente pela análise.

**Conferência da análise (quando a task consumir documentos):** arquivo encontrado suficiente → aproveitar sem pedido; arquivo parcial → pedir só campo ausente; acesso negado → pedir acesso, não upload; fontes conflitantes → apresentar valores/regras para decisão, sem escolher por suposição. Conferir três exemplos anonimizados (válido, incompleto e conflito) contra o contrato e guardar esperado/obtido. Os cenários não exigem novas tasks nem reabrem entregas concluídas; nenhuma leitura ou teste é declarado executado por esta atualização das SPECs.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Central → planilha do robô (`.xlsx`) | Central | colunas na ordem do modelo CL-009 (padrão: `nome`, `telefone`, `mensagem`); mensagem montada a partir de `modelo_mensagem_confirmacao` com `{nome}`, `{data}`, `{hora}`, `{profissional}` | `crc_confirmacao`, `crc_agendamento`, `gestao` | exportar de novo gera o mesmo conteúdo para o mesmo filtro; marcar "lista enviada" é idempotente | Linha sem telefone válido fica fora e aparece em "corrigir telefone" |
| `agenda_itens` (SPEC-1-001) → `liberacoes` | Massa/arquivo validado | cancelamento ou exclusão explícitos com evidência; ausência isolada é incerteza, não desmarcação | leitura | conciliação após cada importação validada | Decisão sem desmarcação → pendência "desmarcar no Clinicorp" |
| Rotas de decisão e aceite | Central | ver regras | função exigida no backend | aceite em transação única (`$app.runInTransaction`); repetir o mesmo aceite não muda o vencedor | Segundo aceite → "vaga preenchida" |

**Parâmetros de `config_unidade`:** `confirmacao_dias_antes=1`, `mensagens_minimas=3`, `ligacoes_minimas=1`, `corte_dia_anterior_hora="17:00"`, `timezone="America/Sao_Paulo"`, `limite_sobreposicao_avaliacao=2`, `duracao_avaliacao_minutos=30`, `cobertura_turnos`, `limite_linhas_robo` (referência antiga 80; capacidade real deve ser conferida, não garantia), `modelo_mensagem_confirmacao` e `formato_telefone_robo`. Remover o cálculo por horas antes da consulta. Horários individuais das três mensagens não foram aprovados; a CRC registra o que realmente fez. Sem escala de ligação, alertar a gestão e manter pendências.

**Cálculo do corte:** extrair a data civil da consulta no fuso da unidade; subtrair um dia civil e formar 17:00 nesse mesmo fuso. Usar relógio do backend. Exemplo: consulta de 14/10/2026 às 08h ou 16h tem o mesmo corte: 13/10/2026 às 17h. Não mudar para dia útil. Domingo/feriado sem equipe/tentativas gera pendência, não liberação automática. Relógio controlado de teste só é aceito em fixture identificada como teste e por gestão; nunca no caminho de produção.

**Tabela de políticas por agenda (coleção `politicas_agenda`):** `unidade`, `profissional_id`/`grupo_profissionais_ids`, `tipo` (avaliação, horário marcado ou ordem de chegada), `dia_semana`, `turno_inicio`, `turno_fim`, `limite_por_horario`, `limite_por_turno`, `escopo_limite` (individual/grupo), `duracao_minutos`, `origem_regra`, `aprovado_por`, `situacao` (ativa/pendente), `versao`. Vincular IDs reais; nunca aplicar por correspondência aproximada do nome. Janela de turno é [início,fim), por unidade/data/regime e escopo. Primeiro filtrar a agenda/política, depois contar visitas distintas não canceladas; dois registros da mesma visita não consomem dois lugares. Permissões de cadastro: gestão.

| Aplicação | Limite recebido | Estado inicial da configuração |
|---|---|---|
| Avaliações da clínica | Dois por horário; trinta minutos por consulta | Ativar após mapear a categoria de avaliação no Clinicorp |
| Dr. Leonel, ordem de chegada | Cinco pacientes por turno | Pendente: unidade, ID real e intervalo do turno |
| Dr. Wesley e Dra. Pamela em Itaboraí | Vinte pacientes por turno | Pendente: confirmar individual ou conjunto, IDs e intervalos; não presumir quarenta |
| Dra. Erika em Alcântara aos sábados | Dois pacientes por horário na agenda indicada | Pendente: identificar categoria/regime exato dessa agenda; não estender a toda agenda de tratamento |

Regra específica aprovada prevalece sobre a geral apenas no vínculo exato de unidade/profissional/regime/dia. Sem política identificável, mostrar “regra da agenda não validada”, impedir oferta/planejamento que dependam do limite e pedir validação. A central só lê: sinaliza excesso já existente no Clinicorp e bloqueia novos planejamentos/ofertas incompatíveis na central; não remove consulta da agenda oficial.

**Coleções:**

- `mensagens_confirmacao`: `contato`, `tentativa` (1, 2 ou 3), `chave_evento` (única), `enviada_em`, `registrada_por`, `canal=robo_ou_manual`, `resultado` (enviada/falhou), `lote_origem`, `teste`. Só `enviada` conta; exportação e fila não contam. Cada tentativa lógica tem `tentativa_id` estável e ordinal1/2/3 por consulta e dia civil anterior. Eventos e correções vinculam `tentativa_id` e `corrige_evento_id`; contar o estado válido atual de cada tentativa efetivamente enviada, nunca a quantidade de UUIDs de eventos. Um envio com duas correções conta uma mensagem. Corrigir enviada para falhou retira a tentativa da contagem válida, conservando histórico. Retry da mesma tentativa não aumenta contagem. Repetição da mesma chave é idempotente; correção é novo evento auditado, não edição que apague a tentativa. Uma confirmação interrompe novas tentativas. Não guardar texto clínico nem credenciais.
- `contatos_confirmacao`: `agenda_item` (relação, único), `estado` (`pendente`, `mensagem_enviada`, `confirmou`, `pediu_remarcacao`, `cancelou`, `sem_resposta`, `em_lista_ligacao`, `ligacao_sucesso`, `ligacao_sem_sucesso`), `responsavel`, `turno`, `atualizado_por`, `atualizado_em`, `teste`.
- `ligacoes`: `contato` (relação), `resultado` (`confirmou`, `pediu_remarcacao`, `cancelou`, `nao_atendeu`, `numero_invalido`), `crc`, `feita_em`, `chave_evento` (única), `teste`. Tentativa inválida ou dado desconhecido não atende a regra; sem prova de ligação real, continuar pendente.
- `liberacoes`: `agenda_item` (relação, único), `motivo` (`cancelamento`, `remarcacao`, `ligacao_sem_sucesso`), `decidida_por`, `decidida_em`, `situacao` (`decidida`, `liberada`, `em_oferta`, `preenchida`, `nao_preenchida`), `oferta_vencedora` (relação), `inicio`, `fim`, `profissional`, `tipo_agenda`, `teste`.
- `ofertas`: `liberacao` (relação), `item_a_agendar` (relação com `pacientes_a_agendar`), `enviada_por`, `enviada_em`, `estado` (`enviada`, `aceitou_vencedor`, `aceitou_tarde`, `recusou`, `sem_resposta`, `avisar_vaga_preenchida`, `avisado`), `planejamento` (relação, SPEC-1-002), `teste`.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Consulta do dia-alvo (`confirmacao_dias_antes`) sem contato | Entra na lista de confirmação com `pendente`, ordenada pelo horário | Compromissos e bloqueios não entram | Kickoff (planilha do robô) |
| RN-02 | Exportação | Até `limite_linhas_robo` linhas; excedente em envio manual. Exportar cria lote, nunca prova de envio. Registrar individualmente cada tentativa enviada/falha com chave única | Sem comprovação, não contar tentativa | WA-01 |
| RN-03 | Resposta registrada | `confirmou`, `pediu_remarcacao` ou `cancelou`; evento na ficha; `pediu_remarcacao` também cria item em "Pacientes a agendar" com motivo `remarcacao` | A consulta no Clinicorp não muda | `00:16:58` |
| RN-04 | CRC aciona "mover não respondentes" | `mensagem_enviada` sem resposta → `em_lista_ligacao`, com responsável pelo turno da consulta | Sem cobertura cadastrada → responsável "a definir" e alerta para a gestão | `00:16:58`, CL-004 |
| RN-05 | Ligação registrada | Sucesso atualiza contato; `nao_atendeu` com autor, horário real, identidade estável e prova de tentativa atende ao requisito de uma ligação sem sucesso | `numero_invalido`, campo vazio ou relato sem tentativa comprovada => corrigir dado/pendência, não elegível para liberação | WA-01 |
| RN-06 | Pedido de liberação | Cancelamento/remarcação explícitos ou, no caminho sem resposta, 3 mensagens enviadas + 1 ligação sem sucesso no dia anterior, sem confirmação e agora >= corte local de 17h | Falta de qualquer evento, cobertura ou clock válido bloqueia; revalidar estado atual no backend | WA-01 |
| RN-07 | Liberação decidida | `decidida` e tarefa desmarcar no Clinicorp; só `liberada` após cancelamento/exclusão explicitamente comprovados ou conferência humana registrada da desmarcação no Clinicorp, com autor/hora/evidência | Item ausente, leitura parcial ou falha => ocupado/incerto; nunca ofertar | DH-01 e WA-01 |
| RN-08 | Capacidade por agenda | Avaliação 2 por horário e 30min; ordem de chegada por turno e política local identificada; regra específica aprovada prevalece só no vínculo exato | Excesso alerta e bloqueia planejamento/oferta; configuração ambígua fica pendente | WA-02/03 |
| RN-09 | Tratamento com horário marcado | Sem sobreposição na política geral | Exceção somente em agenda específica aprovada; Erika/regime pendente não autoriza exceção geral | WA-03 |
| RN-10 | Elegíveis para a vaga liberada | Itens `aberto` e `pronto` de "Pacientes a agendar" cujo procedimento tem regra de duração para o profissional da vaga, com tempo sugerido ≤ duração da vaga e disponibilidade compatível com a data | Lista vazia → "nenhum elegível"; nunca inventa candidato | RQ-004 |
| RN-11 | Ofertas | No máximo 3 ofertas abertas por vaga; vaga passa a `em_oferta` | — | DH-03 |
| RN-12 | Primeiro aceite | Revalidar política e agenda disponível; se leitura falhou, está incerta ou foi ocupado/bloqueado, não atribuir vencedor e devolver pendência. Em transação local sobre versão da liberação, eleger apenas um candidato, com aceite pendente de reserva | Transação local não reserva no Clinicorp; No modo local, CRC valida a massa/arquivo e marca o resultado como demonstrativo; reserva real só na fase 4. Conflito => vaga indisponível, avisos e próxima ação, sem nova consulta | DH-01/WA-01 e exclusividade local |
| RN-13 | Vencedora sem reserva ligada até o fim do dia | Pendência "aceite sem reserva" para a CRC | Reserva ligada → vaga `preenchida` | — |
| RN-14 | Fim do dia da vaga sem aceite | `nao_preenchida`; ofertas ainda abertas passam a `sem_resposta` | — | — |
| RN-15 | Exportação da planilha do robô | Registra evento com quem exportou, quando e quantas linhas; a mensagem não inclui procedimento nem dado clínico; o arquivo não deve ser enviado em grupo | — | Privacidade |

**Atomicidade de confirmação e liberação:** atualizar contato/confirmacão e decidir liberação usando a mesma proteção de versão no backend (`versao_contato`). A decisão lê condição e grava liberação numa operação transacional/compare-and-set com essa versão. Se outra requisição confirmou antes do commit, abortar e recarregar; nunca gravar liberação baseada no contato antigo. Confirmação posterior à decisão entra na revisão humana já descrita, sem desfazer nova reserva. Autor/hora/versão integram auditoria.

**Revalidação do aceite:** conferir versão/política do lote local antes de eleger vencedor. Lote parcial, importação com falha ou nova ocupação => revisar disponibilidade. Transação local garante uma proposta vencedora; em demonstração, nova reserva local validada permite “preenchida — demonstração”. Em registros reais, permanecer “pendente de reserva oficial” até evidência humana auditada. Provas reais e conexão somente na fase 4; não prometer consulta definitivamente marcada nesta fase.


## Distinção entre demonstração e registro real

No modo demonstrativo, eventos sintéticos de mensagem/ligação e cancelamento valem só para a prova. Em dados importados, registro humano deve declarar identidade da tentativa, autor, horário e resultado real; exportar XLSX, criar tentativa ou erro de entrega não conta como envio. A fase 1 não pede que a equipe faça contatos novos para testar. “Vencedor local” e “preenchida na demonstração” nunca significam reserva aceita no Clinicorp. Campo/política real desconhecidos bloqueiam o caso; parâmetros de fixture não preenchem configuração operacional.

## Fluxo e regras

1. Gestão configura regras completas e modelo de XLSX; no modo de prova, políticas sintéticas ficam identificadas e não alteram parâmetros reais pendentes.
2. CRC abre Confirmações e confere prévia/XLSX com dados sintéticos; não carrega robô nem envia. Fixture de tentativa simula envio/resultado/horário no backend de provas.
3. Registrar respostas e tentativas de ligação sintéticas; exportação nunca conta como tentativa bem sucedida.
4. Simular a regra 3+1 e corte, registrar decisão e aplicar cancelamento explícito no lote local. Ausência em lote parcial mantém ocupado/incerto.
5. Selecionar até três elegíveis e registrar ofertas locais; concorrer dois aceites e validar um vencedor.
6. Revalidar versão/política da agenda local e ligar reserva demonstrativa. Marcar preenchida apenas com fonte explícita e banner; dados reais sem evidência permanecem pendentes de reserva oficial. Nenhum fornecedor é chamado.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Paciente não responde, 3 mensagens enviadas, 1 ligação sem sucesso, corte às 17h alcançado | Liberação permitida; vaga livre depois da desmarcação | — |
| Limite | Paciente não responde e ninguém ligou | Liberação recusada; consulta mantida | — |
| Limite | Ligação sem sucesso antes do prazo-limite | Liberação recusada até o prazo | — |
| Limite | Três ofertas, dois aceites | Primeiro vence; segundo `aceitou_tarde` e "avisar" | — |
| Falha | Decisão registrada e consulta não desmarcada | Pendência "desmarcar no Clinicorp"; vaga não aparece livre | CRC registra evidência explícita da fonte/massa; importação confere |
| Falha | Vencedor sem reserva | Pendência "aceite sem reserva" | CRC reserva e liga |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC e as SPEC-1-001, SPEC-1-002 e SPEC-1-003.
2. **Alterar somente:** coleções, rotas, rotina de conciliação, telas e parâmetros desta SPEC.
3. **Não alterar:** a regra de liberação (vem da clínica); nada no Clinicorp; nenhum envio de mensagem.
4. **Executar nesta ordem:** (a) parâmetros; (b) lista e exportação; (c) estados de contato; (d) lista de ligação; (e) decisão de liberação no backend; (f) conciliação com a leitura; (g) sobreposição; (h) elegíveis; (i) ofertas e aceite em transação; (j) provas.
5. **Parar e pedir validação quando:** faltar qualquer parâmetro de CL-004; o modelo do robô exigir campo que a central não tem; a equipe pedir liberação fora da regra.
6. **Estado válido ao parar:** nenhuma vaga aparece livre sem desmarcação lida; estados registrados continuam íntegros.

## Checklist de execução

- [ ] Parâmetros de CL-004 e modelo do robô gravados.
- [ ] Planilha exportada e conferida contra o modelo/prévia, sem envio ou robô.
- [ ] Estados de contato e lista de ligação por turno funcionando.
- [ ] Liberação recusada fora da regra e aceita dentro dela.
- [ ] Sobreposição e conflito sinalizados.
- [ ] Ofertas com reserva exclusiva e avisos.
- [ ] Provas, call de validação e teste humano registrados.

## Critérios de aceite

- [ ] **CA-1-18:** a lista de confirmação do dia-alvo sai em `.xlsx` no formato do robô, em ordem de horário, com no máximo `limite_linhas_robo` linhas; o excedente vai para "envio manual"; linhas sem telefone válido ficam em "corrigir telefone".
- [ ] **CA-1-19:** cada resposta registrada muda só o estado do contato; quem não respondeu vai para a lista de ligação com responsável do turno; a consulta continua agendada.
- [ ] **CA-1-20:** o backend recusa liberação por silêncio com menos de 3 mensagens enviadas ou menos de 1 ligação sem sucesso no dia anterior, antes de 17h do dia anterior ou depois de confirmação. Às 17h, com eventos completos e sem confirmação, permite decisão; cancelamento/remarcação explícitos são caminhos próprios. Exportação, evento duplicado e relógio do browser não burlam a regra.
- [ ] **CA-1-21:** avaliação permite 2 por horário e alerta/bloqueia o terceiro planejamento; duração 30min. Ordem de chegada conta visitas únicas por turno sob política aprovada e alerta/bloqueia acima do limite local. Uma configuração pendente não vira ilimitada nem 40; exceções de profissional só se aplicam na agenda validada, sem contaminar a regra geral de tratamento.
- [ ] **CA-1-22:** vaga só aparece livre após confirmação explícita da desmarcação/exclusão ou conferência humana auditada no Clinicorp. Item ausente em leitura parcial, falha ou erro de permissão mantém ocupado/incerto e bloqueia oferta. Antes da desmarcação, a pendência segue visível.
- [ ] **CA-1-23:** os elegíveis respeitam profissional (regra de duração), tempo, disponibilidade e prontidão; sem elegível, a tela diz "nenhum elegível".
- [ ] **CA-1-24:** com três ofertas e dois aceites, só o primeiro fica com a vaga, o segundo recebe "vaga preenchida" e a tela lista quem avisar; toda oferta termina em estado final.
- [ ] **CA-1-25:** o aceite vencedor só vira vaga `preenchida` quando a nova reserva é ligada; sem reserva até o fim do dia vira pendência "aceite sem reserva".

## TDD da SPEC

| Etapa | Prova | Ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P4-01 a P4-21 antes da implementação revisada | Tela Provas → Rodar provas SPEC-1-004 | Falham as regras de contagem, corte, ausência de agenda e capacidade ainda não implementadas | Execução identificada com esperado/obtido, sem forçar falha artificial |
| GREEN | P4-01/02: 4 consultas (3 com telefone válido,1 inválida) e limite de exportação de teste2 | Gerar XLSX | 2 linhas no XLSX +1 na lista manual +1 em corrigir telefone; zero tentativas só por exportar | XLSX e execução |
| GREEN | P4-03: registrar mensagens; repetir chave; resposta confirmada | Chamar registro e fila | Contagem distinta; resposta altera contato e interrompe régua, sem alterar visita | Execução |
| GREEN | P4-04: 3 mensagens, sem ligação, às17h | Chamada direta à rota liberação | Recusa | Execução CA-1-20 |
| GREEN | P4-05: consulta 14/10 08h; três mensagens e ligação sem sucesso em13/10; clock16:59 e17:00 | Duas chamadas backend com clock de fixture | Recusa16:59; permite17:00; consulta14/10 16h tem o mesmo corte | Execução CA-1-20 |
| GREEN | P4-06: decisão, mas agenda permanece; depois leitura explícita cancelada | Conciliar | Mantém ocupada e pendência; cancelada comprovada libera | Execução CA-1-22 |
| GREEN | P4-07: 2/3 avaliações no mesmo horário;2 tratamentos sem exceção | Planejar no regime correto | 2 avaliações aceitas;3º bloqueado; tratamento em conflito | Execução CA-1-21 |
| GREEN | P4-08: elegíveis prontos, incompatível e sem regra | Abrir encaixe | Só compatíveis sob política aprovada | Execução CA-1-23 |
| GREEN | P4-09: 3 ofertas e2 aceites concorrentes | Duas chamadas paralelas | Um vencedor; outro tardio; avisos e vínculo da reserva | Execução CA-1-24/25 |
| GREEN | P4-10: somente2 mensagens; ligação feita;17h | Chamada backend | Recusa; três exportações ou falhas também não atendem contagem | Execução CA-1-20 |
| GREEN | P4-11: terceiro evento depois de17h sem data anterior válida; confirmação antes da decisão | Revalidar | Tentativa válida no dia anterior conta somente após registro; confirmação impede liberação. Eventos de outro dia/consulta não contam | Execução CA-1-20 |
| GREEN | P4-12: consulta desaparece em leitura parcial, sem cancelamento explícito | Conciliar e tentar oferta | Estado ocupado/incerto; oferta bloqueada; nenhuma vaga falsa | Execução CA-1-22 |
| GREEN | P4-13: Leonel em unidade/turno sintéticos aprovados:5/6 visitas; turno seguinte | Planejar, contar | Aceita até5, bloqueia6; não soma turnos; visita duplicada conta uma vez. Em produção unidade pendente impede ativação | Execução CA-1-21 |
| GREEN | P4-14: grupo sintético com capacidade20,20/21; configuração Wesley/Pamela pendente | Usar fixture, depois política recebida | Limite respeitado sob escopo conhecido; política real incompleta bloqueia, sem presumir20 individual/40 total | Execução CA-1-21 |
| GREEN | P4-15: Erika/Alcântara/sábado, categoria sintética explicitamente aprovada;2/3 pacientes; outro dia/unidade | Consultar capacidade | Regra2 aplicada só na agenda validada;3 bloqueia; não estende exceção a outros tratamentos. Regime real pendente bloqueia ativação | Execução CA-1-21 |
| GREEN | P4-16: domingo anterior sem equipe/tentativas e clock17h | Tentar liberar | Mantém consulta e alerta cobertura; não antecipa o corte para sexta | Execução CA-1-20 |
| GREEN | P4-17: confirmação chega após decisão/liberação e existe nova reserva | Registrar resposta | Interrompe régua e gera revisão da CRC; nenhuma reserva nova é cancelada nem visita recriada automaticamente | Execução CA-1-19/22/25 |
| GREEN | P4-18: confirmação concorrente entre leitura e commit da decisão | Intercalar as duas requisições com barreira de teste | Confirmacão gravada antes impede decisão por versão; nenhuma liberação indevida | Execução CA-1-19/20 |
| GREEN | P4-19:1 envio e2 correções; depois3 envios reais distintos; corrigir1 para falhou | Registrar eventos/auditar contador | Contagens1,3,2; retries e correções não multiplicam tentativa | Execução CA-1-20 |
| GREEN | P4-20:3 mensagens + telefone inválido sem ligação efetiva | Pedir liberação | Recusa e pendência corrigir contato | Execução CA-1-20 |
| GREEN | P4-21: vaga ofertada é ocupada em um novo lote local antes do aceite; depois importar lote parcial | Atualizar e tentar aceite | Sem vencedor/consulta confirmados; disponibilidades em revisão e aviso para CRC | Execução CA-1-22/24/25 |
| REFACTOR/REGRESSÃO | P1 a P4; XLSX com telefones fictícios, sem robô ou envio | Rodar provas e abrir prévia do XLSX | Passam os cenários e o formato; tentativas sintéticas identificadas apenas na demonstração | Execuções e captura permitida |

**Fixtures:** dados sintéticos `teste=true`; clocks 13/10/2026 16:59/17:00 no fuso local; registros de envio/ligação independentes, chave repetida, resposta confirmada, leitura parcial e políticas de turno sintéticas. Valores sintéticos aprovados só para prova não configuram agendas reais pendentes. Nenhum envio externo faz parte de prova automatizada.

**Caminhos de erro:** parâmetro/escala ausente, telefone inválido, evento repetido, leitura parcial, tentativa incompleta, browser com horário forjado, confirmação concorrente, dois aceites, vencedor sem reserva e configuração ambígua. Evidências em `provas_execucoes` e captura por task. O agente executa uma task por vez e aguarda “testei, pode seguir”.

## Teste humano do cliente

- **Origem:** CL-008
- **Quem testa:** uma CRC de confirmação e Luiz.
- **Passos:** gerar a lista de amanhã, comprovar três envios e uma ligação em dados de teste; tentar liberar com duas mensagens e às16:59, depois às17:00 com eventos completos; testar leitura parcial sem liberação; testar limites de avaliação/turno com política sintética; confirmar a desmarcação e registrar dois aceites para a mesma vaga. Usar apenas telefones fictícios e prévia do XLSX; não carregar robô nem enviar.
- **Resultado esperado:** a vaga não sai sem a regra; só o primeiro aceite fica com ela; a tela mostra quem avisar.
- **Evidência do aceite:** "testei, pode seguir" no card e registro da call de validação.

## Handoff e operação

- **Como demonstrar:** percorrer uma vaga do silêncio do paciente até o novo agendamento.
- **Como operar depois:** CRC de confirmação por turno; gestão ajusta parâmetros quando a clínica aprovar uma mudança de regra; manter versão e histórico, sem alterar retroativamente as provas.
- **Como monitorar:** tamanho da lista de ligação, liberações pendentes de desmarcação e aceites sem reserva (painel da SPEC-1-006).
- **Pendência conhecida:** critério de prioridade do encaixe (CL-PEND-005); envio automático após conexão na fase 4.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| a9f9e30e-5f5b-4212-900b-a679a4ae2290 | Definir as regras de confirmação e liberação de vagas | CA-1-20/21 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| 71531c1d-0e0d-443f-9b6e-3e8dbf3e00b8 | Enviar o modelo da planilha do robô de confirmação | CA-1-18 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| 5bcfa6f1-3634-485d-8740-49c6ce94df0a | Gerar a lista de confirmação do dia para o robô | CA-1-18 | P4-01 e P4-02 | Dados locais e dependências desta SPEC |
| f124df8f-05d8-4233-aced-d5a2e8085509 | Registrar a resposta de cada paciente | CA-1-19 | P4-03 | Dados locais e dependências desta SPEC |
| f79847a5-0ec1-4549-b19c-8c982cef25c6 | Montar a lista de ligação e liberar vagas só pela regra | CA-1-20 e CA-1-22 | P4-04 a P4-06 | Dados locais e dependências desta SPEC |
| 8421e27b-e7d2-4f59-a3df-633cde760d9e | Sinalizar sobreposição na avaliação e conflito no tratamento | CA-1-21 | P4-07 | Dados locais e dependências desta SPEC |
| 1c8eb871-e670-4b77-af97-56b6232e9efe | Validar as regras de liberação e encaixe em call com a equipe | CA-1-18–25 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
| e2369241-9bca-4732-a139-874cdd1d6a5e | Ofertar a vaga liberada a até três pacientes | CA-1-23 | P4-08 | Dados locais e dependências desta SPEC |
| 36cdfc82-9bd2-400e-96d6-101b4240abab | Garantir que a vaga fique com o primeiro que aceitar | CA-1-24 e CA-1-25 | P4-09 | Dados locais e dependências desta SPEC |
| b2cb546c-7900-48db-9211-08e29a45b382 | Testar a reposição de uma vaga do começo ao fim | CA-1-18 a CA-1-25 | P4-01 a P4-21 | Dados locais e dependências desta SPEC |
| 6a8a817e-1b0d-49e0-bea7-e805d3ade439 | Criar o registro das tentativas de confirmação | CA-1-19/20 | P4-03, P4-04, P4-05, P4-10, P4-11, P4-16, P4-17, P4-18, P4-19, P4-20 | Dados locais e dependências desta SPEC |
| 84b8f8d6-e64f-402d-9339-c078493063b4 | Configurar os limites de pacientes por agenda e turno | CA-1-21 | P4-07, P4-13, P4-14, P4-15 | Dados locais e dependências desta SPEC |

## Histórico da revisão de 13/10/2026

Política recebida substitui o cálculo antigo por horas antes da consulta. Limites locais substituem ausência de limite por turno. O dado de cobrança “25 mensagens/dia” pertence somente a boletos; não altera a capacidade do robô de confirmação. A diferença entre limite contratado e volume de3 tentativas por paciente deve aparecer para a gestão; volume faltante nunca autoriza dispensar tentativas. Configurações Leonel, Wesley/Pamela e Erika permanecem bloqueadas na parte ainda não respondida, sem inventar unidade, escopo do grupo ou tipo de agenda.


## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
