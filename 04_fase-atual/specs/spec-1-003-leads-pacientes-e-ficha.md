# SPEC-1-003 — Leads, pacientes a agendar e ficha do paciente

**Fase:** 1  
**Status:** planejada  
**Dono:** L A Rodrigues (execução com o Maestro) · aceite: Rodrigo Santos (consultor)  
**Origem no escopo:** Fase 1, funções (3) Pacientes a agendar e (7) Ficha do paciente, e "Leads com origem (substitui o APP CRC)"; RQ-001, RQ-004, RQ-009 (registro manual), RQ-011, RQ-016, RQ-018; LRQ-003, LRQ-007; decisões DH-02, DH-05, AC-05-05  
**Degrau da solução:** construção mínima no projeto Skip da SPEC-1-001, importando orçamentos de arquivo autorizado ou fixture; importação de arquivo para os leads em aberto do APP CRC.

## Modo obrigatório da fase — AC-13-IT

Esta SPEC executa apenas no app e banco nativos. Dados vêm da SPEC-1-001 por fixture separada, arquivo validado ou cadastro auditado; não há API externa, segredo de fornecedor, webhook, polling ou chamada de IA. Referência a Clinicorp significa dados exportados/manual identificados, nunca leitura automática. Toda tela exibe origem/lote/data e “sem sincronização”. Provas e teste humano usam a mesma massa local. Teste de saída deve registrar zero chamadas a Clinicorp/Meta/IA/transcrição; recursos nativos do Skip são permitidos. Envio/reserva real e retirada de controles anteriores ficam para a fase 4. Não usar fixture para afirmar resultado operacional.

## Contexto e decisões fechadas

- **Estado atual:** o lead chega por anúncio click-to-WhatsApp; a CRC qualifica no WhatsApp, procura o lead no APP CRC, agenda pelo atalho "Agendar via Clinicorp" e digita o agendamento num grupo interno de métricas com número, nome e campanha. Pendências de tratamento são procuradas no relatório "procedimentos não executados" do Clinicorp, geralmente em outro dia. O que foi combinado com o paciente fica na memória de quem atendeu.
- **Estado desejado:** a central guarda cada lead e paciente numa ficha única com origem, etapa, histórico, responsável e próxima ação; monta a lista de quem precisa agendar (pendências do Clinicorp, leads aguardando horário e faltas); e gera o relatório de origem que hoje sai do APP CRC e do grupo interno.
- **Decisões já fechadas:**
  - O APP CRC e o grupo interno de registro deixam de ser usados apenas depois da virada conectada na fase 4.
  - Origem possível: **campanha** (pelo código da campanha — UTM `utm_campaign`, com `utm_content` opcional para o criativo), **manual** (lista configurável; começa com "indicação" e "outra — descrever") ou **desconhecida**. A origem nunca é preenchida por suposição.
  - Mesmo telefone não funde fichas automaticamente: a central mostra o possível duplicado e a CRC decide.
  - O agendamento continua sendo feito no Clinicorp; a central liga o lead ao agendamento lido (vínculo assistido).
  - Os combinados e a próxima ação da avaliação são registrados à mão na ficha (sem gravação nesta fase).
  - O prontuário não é lido; dos orçamentos aprovados só se usam paciente, procedimento, profissional e situação de execução.
- **Bloqueios:** a importação dos leads do APP CRC depende de exportação (CL-PEND-001); o período das pendências depende de `pendencias_desde` (CL-PEND-004); os códigos de campanha dependem da agência (CL-PEND-002). Sem esses itens a SPEC funciona com cadastro manual e origem "desconhecida".

## Resultado observável

A CRC cadastra um lead com a campanha de origem, acompanha a etapa até o comparecimento e vê numa só lista quem precisa de horário, com o procedimento pendente, o dentista indicado, a disponibilidade e se o paciente está pronto. Ao abrir a ficha, qualquer pessoa da equipe vê o que já aconteceu e qual é a próxima ação. A gestão exporta o relatório de origem para a agência.

## Limites e dependências

- **Inclui:** campanhas; leads com origem e etapas; importação de leads do APP CRC; fichas de paciente; eventos (histórico); leitura de orçamentos aprovados com procedimentos não executados; lista de pacientes a agendar com disponibilidade e prontidão; próxima ação com prazo; relatório de origem.
- **Fora de escopo:** envio de mensagens; gravação da avaliação; cadência de follow-up (fases 2 e 4); vínculo com valores e fechamento (fase 3); CRM de marketing completo.
- **Entradas e pré-condições:** SPEC-1-001 aceita; CL-PEND-001, CL-PEND-002 e CL-PEND-004 quando confirmados; a SPEC-1-005 alimenta as faltas e a SPEC-1-004 alimenta o estado "confirmado".
- **Saídas/artefatos:** coleções `campanhas`, `origens_manuais`, `leads`, `pacientes`, `eventos`, `pendencias_procedimento`, `pacientes_a_agendar`; serviço local `pendencias_importar`; telas "Leads", "Pacientes a agendar", "Ficha" e "Relatório de origem".
- **Dependências e responsáveis:** campanhas e relatório — gestão com a agência; construção — clínica com o Maestro.
- **Atores e permissões mínimas:** `crc_agendamento`, `crc_confirmacao` e `crc_comercial` criam e editam leads, fichas, eventos e próxima ação; `gestao` gerencia campanhas, origens manuais e exporta o relatório; `recepcao` lê a ficha dos pacientes do dia; `dentista` não acessa leads nem a ficha completa; avaliador habilitado atribuído acessa só o planejamento mínimo conforme a emenda.
- **Superfícies/arquivos/configurações afetadas:** migrations das coleções; hooks locais `pendencias_importar` e `leads_importar` (rota); telas e serviços em `src/`; `config_unidade.pendencias_desde`.
- **Risco e plano B:** arquivo de orçamentos indisponível → a CRC cadastra a pendência à mão com `origem = manual`; APP CRC sem exportação → cadastro manual dos leads em aberto antes da virada.
- **Rollback ou reversão:** pausar a importação de pendências; leads e fichas continuam consultáveis; nenhum dado do Clinicorp é alterado.

## Análise dos documentos e perguntas permitidas

**Fonte:** https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9, materiais já recebidos e dados internos citados nesta SPEC. O conteúdo da pasta ainda não foi verificado neste preparo; não presumir que falta documento. Consultar pasta/subpastas com acesso de leitura, registrar arquivos e conteúdo efetivamente lidos em `.adapta-cliente/fontes-do-projeto.md` e seguir `AGENTS.md`. A consulta pelo assistente não é integração do app.

**Método antes de perguntar:** identificar a task e a análise abaixo; procurar os campos nos materiais existentes, mesmo distribuídos entre arquivos; relacionar campo de origem ao campo interno; validar qualidade e conflitos; reaproveitar os dados válidos; registrar apenas a lacuna específica. Preservar unidade/versão/ID de origem, não converter campo vazio em zero nem inferir regra de produção. Arquivo de nome diferente também pode atender. Falha de acesso pede somente acesso, não reenvio. Converter o formato no ambiente autorizado quando viável, sem pedir à clínica trabalho que o assistente pode fazer.

| Material e campos a localizar | Análise que o executor deve fazer | Saída que alimenta o app |
|---|---|---|
| Leads/exportação APP CRC, campanhas/UTM e contatos: IDs, nome, telefone, origem, etapa, responsável | Mapear etapas/códigos, preservar IDs/telefones como texto e normalizar contato; correspondência exata para campanha; duplicado pede escolha sem fusão automática | Mapeamento para leads/pacientes/campanhas e rejeições; origem desconhecida permanece desconhecida |
| Procedimentos/orçamentos aprovados: unidade/paciente/procedimento/profissional, aprovado, Executed e data, cancelamento; agenda futura do lote | Cruzar identidade e cobertura; não afirmar ausência de consulta fora do período; CANCELAMENTO não é produção e etapa cirúrgica R$0 não prova prótese concluída | Pendências a_agendar/agendado/verificar/cancelado com fonte e justificativa, sem prontuário integral |
| Relatório de campanhas reconstruído e base intacta da outra unidade | Distinguir unidade/período/nível/fonte; recalcular CPL apenas com denominador equivalente; junho recebido: 9914,61/714 ≈ 13,89 versus 12,35 informado, manter divergência; não somar anúncio/campanha sobrepostos | Referência agregada identificada para relatório; nunca gerar pessoas a partir de totais nem atribuir criativo sem vínculo |

**Perguntar somente se necessário:** confirmar a unidade de um relatório não identificado, correspondência de código ou identidade ambígua. Explicar se afeta origem, lista de pacientes ou cálculo; aproveitar os meses/colunas já lidos. Não pedir relatório novamente, criativo apagado ou nova planilha só porque o PDF foi reconstruído. Arquivo financeiro não autoriza cobrança nesta fase.

**Registro e limite:** antes de pedir complemento, produzir em `06_notas/analises-documentais/SPEC-1-003.md` a task/critério, arquivos efetivamente consultados (link/ID, aba/seção/página, versão/data), mapa campo de origem → campo interno, dados aproveitados, validações/rejeições, conflitos, lacuna e seu efeito. Pode atualizar uma análise existente; não exigir arquivo separado por cada tarefa. Relatório não contém nomes, telefones, valores individuais, senhas, tokens ou prontuário; registrar metadados e exemplos anonimizados. Não copiar planilhas de pacientes para o Git. Dados normalizados vão ao banco/armazenamento autorizado conforme permissões desta SPEC, com revisão/aprovação já exigidas antes de uso real.

**Pedido permitido:** “Consultei [arquivos/abas]. Já aproveitei [campos]. Para [task e funcionalidade], falta somente [campo/regra/decisão], porque [efeito concreto]. Isso [bloqueia só o uso real afetado / permite continuar a demonstração]. Podem [complementar ou esclarecer esse ponto]?” Perguntar apenas após leitura suficiente e busca nas fontes autorizadas. Falha de acesso deve ser declarada como acesso pendente, nunca como documento ausente; informar conta/permissão só se identificadas. Nenhum pedido ou mensagem à clínica é enviado automaticamente pela análise.

**Conferência da análise (quando a task consumir documentos):** arquivo encontrado suficiente → aproveitar sem pedido; arquivo parcial → pedir só campo ausente; acesso negado → pedir acesso, não upload; fontes conflitantes → apresentar valores/regras para decisão, sem escolher por suposição. Conferir três exemplos anonimizados (válido, incompleto e conflito) contra o contrato e guardar esperado/obtido. Os cenários não exigem novas tasks nem reabrem entregas concluídas; nenhuma leitura ou teste é declarado executado por esta atualização das SPECs.

## Emenda — etapas e sequência por paciente (14/10)

**Resultado:** na Ficha, aba “Etapas do tratamento”, o avaliador designado monta ou adapta um plano operacional para aquele paciente. A CRC vê o que está liberado, o que aguarda etapa anterior e o motivo, sem decidir clínica. O plano clínico oficial continua no Clinicorp; esta aba guarda apenas etapas/procedimentos/dependências/liberação necessários à agenda, inseridos ou conferidos pelo avaliador. Não lê nem duplica prontuário completo. Sem API externa nesta fase.

**Modelos e exceções:** pode haver modelo padrão aprovado pela clínica, nunca obrigatório para todos. Aplicar modelo copia uma versão para o paciente; não deixa vínculo mutável com o catálogo. Modelo sem aprovação é só rascunho. Ordem visual organiza a tela; dependências explícitas dizem o que precisa estar concluído. Permitir etapas independentes/paralelas, sem criar cadeia linear artificial. Nenhuma sequência clínica universal é definida nesta SPEC, pela IA ou por inferência de duração. Caso individual não atualiza modelo ou outros pacientes. Mudança no modelo só vale para novas cópias; revisão dos planos existentes é humana e versionada.

### Dados, permissões e operações internas

- `modelos_sequencia`: nome, versão, estado rascunho/aprovado/arquivado, etapas com chaves locais/dependências, autor, aprovado_por/em. Avaliador habilitado aprova o conteúdo clínico; gestão organiza disponibilidade sem modificar aprovação.
- `planos_tratamento`: paciente, avaliador (user/profissional habilitado), versão atual aprovada, modelo/versão de origem opcionais, estado rascunho/aprovado/em_revisao/encerrado, criado/aprovado/revisado_por/em e motivo. Só uma versão aprovada vigente por plano. Dados reais e fixture separados.
- `etapas_tratamento`: plano/versão, ID estável, procedimento/quantidade, profissional indicado, pendências de origem vinculadas quando comprovadas, ordem_visual, lista `depende_de`, estado pendente/concluida/cancelada, liberacao_clinica pendente/liberada/bloqueada, motivo, validada_por/em e conclusao_por/em/fonte. Ausência de dependência não dispensa aprovação do avaliador. Etapa única pode ser aprovada explicitamente; não exigir modelo completo.
- `pacientes_a_agendar.etapa_plano` e `planejamentos.etapas_plano` ligam atendimento/proposta ao plano; identidade paciente/unidade/procedimento/quantidade deve conferir. Uma visita com combinação referencia todas as etapas e só é elegível quando todas estiverem liberadas. Vínculo ausente/ambíguo vai para revisão; não escolher etapa apenas pelo nome.
- Rotas internas `POST /backend/v1/tratamento/modelo-salvar`, `/plano-salvar`, `/plano-aprovar`, `/etapa-atualizar`: payload apenas IDs/versão/campos acima; servidor exige auth, vínculo/papel e versão esperada. Proibir ciclos, autorreferência, dependência externa ao plano e escrita em paciente não atribuído. Stale version/conflict = rejeitar e recarregar. Fonte clínica de alteração e eventos antes/depois ficam auditados; nenhum prontuário/paciente real é registrado no Git.

**Matriz específica:** avaliador = dentista ativo, flag avaliador_habilitado e atribuído ao plano, vê/edita/aprova etapas mínimas dos pacientes sob sua responsabilidade; outro dentista não recebe ficha alheia por isso. Gestão designa avaliador e lê situação operacional, não aprova clínica sem habilitação. CRCs e recepção leem apenas a sequência/procedimentos liberados necessários à agenda dos pacientes autorizados, sem modificar dependências, conclusão ou liberação. Cadastro/associação de paciente continua no fluxo já existente, não acesso a leads por avaliador. Demais regras da ficha continuam válidas. Gestão altera a designação com auditoria e não concede acesso entre unidades.

### Fluxo e regra de liberação

1. Cadastrar/localizar a ficha e designar avaliador habilitado. Antes disso, nenhuma etapa de tratamento é liberada por padrão; demonstração pode continuar com fixture.
2. Avaliador cria etapas ou copia modelo aprovado; ajusta somente aquele paciente, registra motivo da exceção e dependências. Validar grafo sem ciclos e vínculos ao salvar.
3. Avaliador aprova a versão e libera as etapas iniciais conforme seu plano. `disponivel_para_agendar` exige versão aprovada vigente, etapa pendente e liberação clínica liberada, todas as dependências concluídas com evidência válida, prontidão operacional e dados do procedimento coerentes. Encaixe acrescenta tempo/profissional/capacidade/disponibilidade; o plano não substitui essas regras.
4. Registrar conclusão/revisão pelo avaliador habilitado após conferência. Execução importada é evidência a conferir, não transição clínica automática; CANCELAMENTO/baixa financeira e data sem vínculo não concluem etapa. Etapa agendada não é etapa concluída. Uma dependência concluída apenas remove esse impedimento; a sucessora continua dependente da liberação clínica explícita.
5. Alterar dependências ou ordem clínica de versão aprovada cria rascunho de nova versão; plano fica em_revisao e não aceita novos agendamentos/ofertas de tratamento até nova aprovação. Reservas existentes não são canceladas; gerar alerta para revisão pela CRC/avaliador. Ao publicar, etapas concluídas/canceladas e seus eventos são preservados por ID e evidência; mudar procedimento/quantidade/identidade cria nova etapa, sem transportar conclusão clínica automaticamente; não apagar histórico.
6. Cancelar etapa nunca satisfaz dependência. Para mudar a necessidade de uma etapa anterior, avaliador revisa o plano com motivo e nova aprovação. Correção de conclusão/liberação invalida a disponibilidade dependente e deixa ofertas abertas em revisão; não dispara cancelamento remoto nem mexe na regra global.

**Sem plano:** pendência de tratamento permanece visível como “aguarda sequência/liberação do avaliador”; não ofertar automaticamente. Avaliação de novos leads/reavaliação sem execução de tratamento segue seu fluxo, sem exigir plano antes de avaliar. A regra não bloqueia cadastro de leads, cálculo de duração, importação ou telas de demonstração.

### Aceite e provas desta emenda

- **CA-SEQ-01 / P3-09:** permissão por avaliador/paciente/unidade; CRC, gestão não habilitada e dentista alheio não aprovam nem alteram clínica.
- **CA-SEQ-02 / P3-10:** modelo A→B copiado para dois pacientes; exceção aprovada em um não altera o outro/modelo; rejeitar ciclo/cross-plano e aceitar duas etapas paralelas sem dependências artificiais.
- **CA-SEQ-03 / P3-11:** A liberada, B depende de A; A agendada não libera B; conclusão conferida de A + liberação clínica explícita de B permite agendar B. Falta de aprovação/liberação/vínculo mantém em revisão.
- **CA-SEQ-04 / P3-12:** cancelar A ou registrar Executed/CANCELAMENTO não conclui A; dado importado isolado não libera B. Revisão preserva versões/evidências e bloqueia novas ofertas sem cancelar reservas existentes.
- **CA-SEQ-05 / P3-13:** duas edições concorrentes com mesma versão: uma commit, outra conflito; CRC não contorna endpoint alterando campos diretamente. Sem plano de tratamento, lead ainda pode agendar avaliação.
- **RED/GREEN/REGRESSÃO:** executar cenários sintéticos antes/depois do comportamento; esperado/obtido em provas_execucoes, zero API externa, regressão P3-01–08 e P2-07/08. Nenhum cenário declara conduta médica ou usa paciente real no Git.
- **CL-008:** avaliador e CRC testam plano com duas etapas, exceção individual, paralelas, bloqueio/liberação e revisão. Confirmar “testei, pode seguir” por task; aprovação clínica do plano não substitui teste humano de software. Não implementar várias tasks em uma rodada.

### Execução, migração e contingência

Ordem: habilitação/vínculos → modelos versionados → editor e aprovação por paciente → conclusão/revisão → uso pela SPEC-1-004. As primeiras partes entregam tela/rascunho independente de oferta. Criar migrations novas para coleções/campos; não reexecutar nem alterar efeitos de migrations já aplicadas. Pacientes/importações existentes não ganham plano fictício nem etapas concluídas por default. Contingência mantém atendimento e agenda oficial com a clínica; app exibe revisão e preserva reservas/eventos, sem “liberar tudo” ao desativar o módulo. Recuperação exige conciliar versão e aprovação clínica antes de retomar novas ofertas.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| CSV/XLSX de orçamentos aprovados ou fixture → pendências | Arquivo autorizado/massa sintética | ID de procedimento/tratamento/paciente/unidade, profissional, descrição, aprovado, Executed/ExecutedDate/Deleted/NotApproved quando realmente presentes | Gestão valida prévia; reimportação por origem + ID | Hash/lote/versão; sem excluir omitidos | Campo/vínculo ausente → verificar; não concluir por suposição |
| Agenda/paciente local → vínculo | SPEC-1-001/arquivo cadastrado | Identidade paciente/unidade/profissional e itens futuros | CRC escolhe entre matches válidos; nunca funde automaticamente | Sem chamadas por telefone ao fornecedor | Ambíguo/não verificado → revisão |
| Arquivo exportado do APP CRC → `leads` | APP CRC | colunas esperadas: `Id Lead/Paciente`, `Nome`, `Telefone`, `Status do lead`, `Origem`, `Telefone de entrada` | upload só por `gestao` | reimportar não duplica (chave: telefone normalizado + `Id Lead`) | Linha sem telefone rejeitada com motivo; origem que não casa com campanha vira `desconhecida` com o texto original guardado |

**Coleções:**

- `campanhas`: `codigo` (único, igual ao `utm_campaign`), `nome`, `criativo` (`utm_content`, opcional), `ativa`.
- `origens_manuais`: `nome`, `ativa` (começa com "indicação" e "outra — descrever").
- `leads`: `nome`, `telefone` (E.164, ex.: +5521999999999), `origem_tipo` (`campanha`, `manual`, `desconhecida`), `campanha`, `origem_manual`, `origem_texto_original`, `etapa` (`novo`, `em_atendimento`, `aguardando_retorno`, `agendado`, `confirmado`, `compareceu`, `faltou`, `desqualificado`), `motivo_desqualificacao` (`distância`, `SUS`, `convênio`, `outro`), `responsavel`, `paciente` (relação), `agenda_item` (relação), `entrada_em`, `importado_app_crc` (bool), `teste`.
- Significado das etapas: `novo` = cadastrado e ainda sem conversa; `em_atendimento` = CRC conversando; `aguardando_retorno` = CRC espera resposta do lead; `agendado`, `confirmado`, `compareceu` e `faltou` seguem o agendamento ligado; `desqualificado` = encerrado com motivo.
- `pacientes` (ficha): `nome`, `telefone`, `paciente_clinicorp_id` (único quando conhecido), `lead` (relação), `responsavel`, `proxima_acao`, `proxima_acao_prazo`, `proxima_acao_responsavel`, `teste`.
- `eventos`: `paciente`, `lead`, `tipo` (`contato`, `resultado_contato`, `mudanca_etapa`, `nota`, `combinado_avaliacao`, `falta`, `chegada`, `liberacao`, `oferta`), `descricao`, `autor`, `criado_em`. Somente inclusão: evento não é editado nem apagado; correção é um novo evento.
- `pendencias_procedimento`: `clinicorp_procedimento_id` (ID de origem; único junto com `origem_leitura`; IDs de fixture separados), `tratamento_id`, `paciente_clinicorp_id`, `paciente_nome`, `paciente_telefone`, `procedimento`, `procedimento_cadastro_id`, `profissional` (relação), `executado_fonte` (valor original sem inferência), `executado_data_fonte` (se realmente retornado), `executado_hora_disponivel` (bool), `profissional_execucao_id`, `tipo_procedimento_fonte`, `valor_etapa_fonte`, `etapa_clinica_validada`, `origem_leitura`, `lido_em`, `situacao` (`a_agendar`, `agendado`, `executado`, `cancelado`, `verificar`), `agendamento_futuro_verificado_em`, `teste`.
- `pacientes_a_agendar`: `paciente` (relação), `motivo` (`pendencia_clinicorp`, `lead`, `falta`, `remarcacao`, `contato_manual`), `pendencia` (relação), `lead` (relação), `procedimento`, `quantidade`, `profissional_indicado`, `disponibilidade_1` (data e período), `disponibilidade_2`, `prontidao` (`nao_verificado`, `pronto`, `aguardando_condicao`), `prontidao_motivo`, `responsavel`, `situacao` (`aberto`, `agendado`, `encerrado`), `teste`.

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Lead criado sem campanha nem origem manual | `origem_tipo = desconhecida` | — | Dados desconhecidos não são inferidos |
| RN-02 | Código digitado/colado corresponde a `campanhas.codigo` ativo | `origem_tipo = campanha` | Código inexistente → aviso e origem continua desconhecida | DH-05 (UTM) |
| RN-03 | Telefone já existe em lead ou ficha | Mostra "possível duplicado" e a CRC escolhe ligar à ficha existente ou criar outra | Nunca funde sozinho | RQ-001 |
| RN-04 | Procedimento aprovado e pendente | Atualiza apenas a situação documental de pendencias_procedimento segundo fonte validada; Executed não altera etapas_tratamento nem sua liberação. Conclusão clínica exige conferência do avaliador | Profissional CANCELAMENTO => cancelado, fora de produção; implante/protocolo com lançamento cirúrgicoR$0/etapa incerta => verificar, sem assumir prótese concluída; preservar sinais originais | CB-06/07 e RQ-004 |
| RN-05 | Paciente da pendência tem agendamento futuro não desmarcado com o profissional da pendência | Pendência `agendado` e sai da lista | Não verificado ainda → "agendamento futuro não verificado" | — |
| RN-06 | Lead em `novo`, `em_atendimento` ou `aguardando_retorno` | Entra na lista de pacientes a agendar com motivo `lead` | — | — |
| RN-07 | Falta registrada (SPEC-1-005) | Entra na lista com motivo `falta`; responsável = CRC de confirmação do turno da consulta, conforme a cobertura por turno definida pela clínica (CL-004, SPEC-1-004) | Sem cobertura cadastrada, responsável fica "a definir" e o item aparece para a gestão | RQ-018 |
| RN-08 | `prontidao ≠ pronto` | Item fica fora dos elegíveis para encaixe e aparece em "para revisão" com motivo | — | RQ-004 |
| RN-09 | CRC liga o lead a um agendamento lido | `etapa = agendado`, evento registrado | Agendamento desmarcado depois → volta para `aguardando_retorno` com evento | — |
| RN-10 | Confirmação (SPEC-1-004) ou chegada/falta (SPEC-1-005) do agendamento ligado | Etapa vai para `confirmado`, `compareceu` ou `faltou` | — | — |
| RN-11 | Próxima ação com prazo vencido | Destacada na ficha e na lista do responsável | — | LRQ-007 |
| RN-12 | Relatório de origem | Por campanha e período: leads, agendados, compareceram, desqualificados, com denominador; sem nomes ou telefones de pacientes | Período sem leads → "dados insuficientes" | DH-05; agência sem dados clínicos |

**Qualidade de origem recebida em13/10:** relatório reconstruído de junho–agosto não é base de leads individuais. Não cadastrar os714/821/943 registros como pessoas, ligar nomes de criativo ao paciente ou tratar ID3270 como ad_id Meta. `campanhas` pode guardar referência textual recebida como não verificada; só código/ID exato validado associa origem ao lead. Confirmar vínculo da unidade antes de importar. Dados ausentes permanecem desconhecidos. Exportação da outra conta, que conserva histórico, não preenche a lacuna de Alcântara. A agência (acesso a conceder por Luiz ou CRC Natália/Nathalia) recebe apenas agregado permitido; não recebe ficha clínica ou áudio.

**Pendências de implantes/cancelamentos:** registros de profissional fictício CANCELAMENTO não são execução clínica e saem da fila de tratamento com motivo de cancelamento. Lançamento cirúrgico de implante com valorR$0 não prova prótese concluída; caso ambíguo fica em revisão da equipe, sem concluir tratamento nem inventar pendência financeira. Conferência do prontuário permanece humana; não extrair seu texto para a fase1.


**Contrato de comparação de fim:** campos Executed/ExecutedDate e ID do profissional são preservados apenas quando o arquivo/fixture os fornece (prova API na fase 4). `executado_data_fonte` mantém data/hora no formato original e normalização validada; se for só data, `executado_hora_disponivel=false`. A SPEC-1-005 compara apenas horário comprovado; ausência é “sem baixa” ou “baixa sem horário”, nunca horário0 ou hora inventada. O vínculo exige mesma unidade/paciente/procedimento e atendimento; ambiguidade vai para revisão. Nenhum dado de prontuário integral é importado por esta regra.


## Fluxo e regras

1. A gestão cadastra as campanhas com o código combinado com a agência e as origens manuais.
2. A gestão importa o arquivo do APP CRC (leads em aberto) ou a CRC cadastra os leads em aberto à mão antes da virada.
3. Quando chega um lead, a CRC cria o lead com nome, telefone e origem; atualiza a etapa enquanto conversa.
4. A serviço local `pendencias_importar` traz os procedimentos aprovados e não executados e verifica agendamento futuro.
5. A lista "Pacientes a agendar" junta pendências, leads aguardando horário, faltas e contatos manuais; a CRC registra disponibilidade, prontidão e próxima ação.
6. A CRC liga um agendamento da massa/arquivo ao lead ou item da lista, com duração planejada e origem visível. Não agendar no sistema oficial como requisito do teste.
7. A gestão exporta o relatório de origem para a agência.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Lead com código de campanha válido | Origem campanha; etapas até compareceu; aparece no relatório | — |
| Limite | Lead sem código e sem origem manual | Origem desconhecida, contada à parte no relatório | — |
| Limite | Telefone já existente | Aviso de duplicado; CRC decide | — |
| Limite | Paciente com pendência e agendamento futuro | Sai da lista | Não verificado → aviso |
| Falha | Leitura de orçamentos falha | Pendências anteriores mantidas; "falha na última leitura" | Cadastro manual de pendência |
| Falha | Arquivo do APP CRC com linha sem telefone | Linha rejeitada com motivo | Cadastro manual |

## Instruções de execução para o Ethos

1. **Ler antes de alterar:** esta SPEC, a SPEC-1-001 (coleções, importação e provas) e a SPEC-1-002 (planejamento).
2. **Alterar somente:** coleções, rotinas e telas desta SPEC e `config_unidade.pendencias_desde`.
3. **Não alterar:** o Clinicorp; dados de prontuário (não ler); fichas existentes por fusão automática.
4. **Executar nesta ordem:** (a) campanhas e origens; (b) leads com etapas e duplicados; (c) importação do APP CRC; (d) fichas e eventos; (e) pendências do Clinicorp; (f) lista de pacientes a agendar; (g) vínculo lead → agendamento; (h) relatório de origem; (i) provas.
5. **Parar e pedir validação quando:** o arquivo do APP CRC tiver colunas diferentes; o arquivo de orçamentos não trouxer identificação/estado de procedimentos; `pendencias_desde` não estiver definido; houver dúvida sobre prontidão de um tipo de procedimento.
6. **Estado válido ao parar:** leads e fichas salvos continuam íntegros; a lista mostra o que já foi lido.

## Checklist de execução

- [ ] Campanhas e origens manuais cadastradas.
- [ ] Leads com origem, etapas, duplicado e desqualificação funcionando.
- [ ] Leads em aberto do APP CRC importados ou cadastrados.
- [ ] Ficha com histórico, responsável e próxima ação.
- [ ] Pendências do arquivo/fixture importadas e verificadas no período coberto.
- [ ] Lista de pacientes a agendar com disponibilidade e prontidão.
- [ ] Relatório de origem exportado sem dados pessoais.
- [ ] Provas e teste humano registrados.

## Critérios de aceite

- [ ] **CA-1-12:** todo lead tem origem `campanha`, `manual` ou `desconhecida`; código inexistente não vira campanha; a origem nunca é preenchida sem ação da CRC ou importação com correspondência exata.
- [ ] **CA-1-13:** cadastrar um telefone já existente mostra o possível duplicado e não funde as fichas sem escolha da CRC.
- [ ] **CA-1-14:** a lista de pacientes a agendar traz pendências aprovadas e não executadas de arquivo/fixture com origem, leads aguardando horário e faltas, com profissional indicado; paciente com agendamento futuro verificado sai da lista.
- [ ] **CA-1-15:** cada item tem disponibilidade (1ª e 2ª opção) e prontidão; item que não está `pronto` aparece em "para revisão" com motivo e não entra nos elegíveis de encaixe.
- [ ] **CA-1-16:** a ficha mostra o histórico em ordem (contatos, resultados, mudanças de etapa, notas e combinados da avaliação), o responsável e a próxima ação com prazo; prazo vencido aparece destacado.
- [ ] **CA-1-17:** um lead ligado a um agendamento percorre `agendado` → `confirmado` → `compareceu` ou `faltou`; o relatório de origem por campanha e período mostra leads, agendados e compareceram com denominador e sem dados pessoais.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | Cenários P3-01 a P3-07 antes das coleções e telas | Tela "Provas" → "Rodar provas da SPEC-1-003" | Falham | `provas_execucoes` com `passou = false` |
| GREEN | P3-01: lead de teste com código `TESTE-CAMP` (campanha de teste) → `campanha`. P3-02: lead sem código → `desconhecida`; com código `NAO-EXISTE` → aviso e `desconhecida`. P3-03: segundo lead com o mesmo telefone → aviso de duplicado e nenhuma fusão. P3-04: pendência de teste (procedimento não executado) → `a_agendar` na lista; marcar como executada → sai. P3-05: pendência de teste com agendamento futuro de teste do mesmo profissional → `agendado`. P3-06: item com `aguardando_condicao` → fora dos elegíveis e em "para revisão". P3-07: lead de teste ligado a item de agenda de teste → `agendado`; evento de chegada de teste → `compareceu`; relatório do período conta 1 lead, 1 agendado, 1 compareceu e não mostra nome nem telefone | mesma tela | Todos passam | `provas_execucoes` com `passou = true`; CSV do relatório de teste |
| REFACTOR/REGRESSÃO | Rodar P1, P2 e P3; conferir com a equipe 10 pendências da massa/arquivo contra o relatório "procedimentos não executados" do Clinicorp | Tela "Provas" e conferência na tela | Provas passam; 10/10 pendências conferem | Conferência anexada à task |

**Dados/fixtures:** campanha `TESTE-CAMP`; leads, pacientes, pendências e itens de agenda com `teste = true`; arquivo de exemplo do APP CRC com duas linhas válidas e uma sem telefone.  
**Caminhos de erro obrigatórios:** código inexistente, telefone duplicado, linha de importação inválida, falha na leitura de orçamentos, paciente não verificado, desmarcação de agendamento ligado.  
**Evidência exigida:** registros de prova, CSV do relatório sem dados pessoais, conferência das pendências reais.

**Regressão P3-08 (CA-1-12/14/17):** tentar importar linha agregada “714 leads” como pessoa => recusada; código de criativo sem correspondência exata => origem desconhecida; paciente individual de fonte validada segue normalmente. CANCELAMENTO não vira produção/pendência clínica concluída; implante R$0 sem etapa comprovada fica para revisão. Comparar com lead sintético identificado e preservar dados originais em falha.


## Teste humano do cliente

- **Origem:** CL-008
- **Quem testa:** uma CRC de agendamento e Victor.
- **Passos:** (1) cadastrar um lead sintético ou de arquivo autorizado com campanha e outro sem; (2) cadastrar de novo um telefone que já existe; (3) abrir "Pacientes a agendar" e conferir três pendências com a massa/arquivo; (4) registrar disponibilidade, prontidão e próxima ação de um paciente; (5) abrir a ficha como outra pessoa da equipe; (6) exportar o relatório de origem da semana.
- **Resultado esperado:** origens corretas, duplicado sinalizado, pendências iguais às do Clinicorp e ficha compreensível por quem não atendeu.
- **Evidência do aceite:** "testei, pode seguir" no card.

## Handoff e operação

- **Como demonstrar:** seguir um lead da criação até o comparecimento e mostrar o relatório.
- **Como operar depois:** a gestão mantém campanhas com a agência; as CRCs mantêm etapas e próximas ações.
- **Como monitorar:** leads sem etapa atualizada, próximas ações vencidas e pendências "não verificadas".
- **Pendência conhecida:** origem automática do anúncio só com a API oficial do WhatsApp (fase 4).

### Contrato complementar das rotas clínicas

`POST /backend/v1/tratamento/atribuir-avaliador` recebe paciente_id, avaliador_id e versao_esperada; somente gestão atribui dentista ativo/habilitado da unidade e cria rascunho mínimo quando necessário. Não aprova nem libera etapas. `GET /backend/v1/tratamento/plano?paciente_id=...` retorna projeção mínima de identificação/etapas/status: avaliador apenas planos atribuídos, gestão/CRC/recepção somente pacientes autorizados da unidade. Não abre a ficha clínica completa nem leads ao dentista.

Nas rotas de salvar/aprovar/atualizar, servidor deriva autor, horário, papel e unidade da sessão/contexto, nunca de valores fornecidos pelo cliente. plano-salvar usa plano_id/paciente_id/versao_esperada e etapas com IDs/procedimentos/quantidades/dependências; criar rascunho não aprova. plano-aprovar recebe plano_id/versao_esperada, sem substituição silenciosa dos dados aprovados. etapa-atualizar recebe etapa_id/versao_esperada/ação (concluir, cancelar, liberar, bloquear, corrigir), fonte/motivo quando exigidos, e permite somente o avaliador responsável. modelo-salvar usa nome/versão/etapas e ação salvar/aprovar/arquivar com permissão clínica na aprovação. Campos calculados, aprovação, autoria e disponibilidade não aceitam escrita direta por CRC nem pelos CRUD genéricos das coleções; aplicar regras/hooks equivalentes no servidor.

P3-09 inclui atribuição somente por gestão, tentativa de forjar avaliador/autor no payload e leitura de paciente de outra unidade. P3-10 pode ser verificado no catálogo com snapshots em fixture antes do editor: cópias independentes e grafo válido; percurso de adaptação/aprovação na tela do paciente é aceito no card do editor, após sua implementação. Isso não bloqueia o aceite do catálogo por falta da tela seguinte.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| 8d76cea5-87db-4604-9180-148613b0a5d1 | Cadastrar leads com a origem da campanha | CA-1-12 e CA-1-13 | P3-01 a P3-03 | Dados locais e dependências desta SPEC |
| ac46ef6d-a26b-4ff4-bfdc-35f9be83bbca | Cadastrar as campanhas com o código combinado com a agência | CA-1-12 e CA-1-13 | P3-01 a P3-03 | Dados locais e dependências desta SPEC |
| eec75533-0163-4b64-a7d3-cb2bc6e91a31 | Importar os leads em aberto do APP CRC | CA-1-12 e CA-1-13 | P3-01 a P3-03 | Dados locais e dependências desta SPEC |
| 55a359b0-bb52-4a85-8648-77d323dc1620 | Montar a lista de pacientes a agendar | CA-1-14 e CA-1-15; CA-SEQ-03 | P3-04 a P3-06; P3-11 | Dados locais e dependências desta SPEC |
| 90ad21b0-1692-4994-bdcf-13767f603968 | Trazer do Clinicorp os procedimentos aprovados e não executados | CA-1-14/15 | P3-04/05/06 | Dados locais e dependências desta SPEC |
| 35bff70c-73f2-40e5-96cf-c17bd68d1499 | Montar a ficha do paciente com histórico e próxima ação | CA-1-16; CA-SEQ-01 | Evidência/entrada definida no card; teste humano quando exigido; P3-09 | Dados locais e dependências desta SPEC |
| d03a15ee-3488-48f2-8bc3-64014ad412f7 | Acompanhar o lead até o comparecimento | CA-1-17 | P3-07 | Dados locais e dependências desta SPEC |
| d45e8f8a-c3a7-4096-8d45-206a635bf804 | Gerar o relatório de origem para a agência | CA-1-17 | P3-07 | Dados locais e dependências desta SPEC |
| 1ccd1bb9-ad1c-4d16-8327-462ae08621ac | Conferir o histórico de campanhas com a agência | CA-1-12/17 | P3-08 | Dados locais e dependências desta SPEC |
| id pendente | Configurar quem pode validar o planejamento clínico | CA-SEQ-01 | P3-09 | Primeiro incremento da emenda: flag avaliador_habilitado e atribuição por plano/paciente/unidade; backend permite decisão clínica só ao dentista habilitado atribuído. Gestão designa, CRC lê status operacional; não dá acesso a todos os leads/prontuários. Provar acesso direto e paciente alheio. Depende da base de papéis existente. |
| id pendente | Cadastrar modelos de sequência de tratamento | CA-SEQ-02 | P3-10 | Criar catálogo opcional de modelos, versões e aprovação clínica. Ordem visual separada de dependências; validar ciclos/cross-plano e etapas paralelas. Modelo não é regra universal; copiar para paciente gera snapshot próprio. Depende da habilitação clínica. A clínica fornece/valida o conteúdo, sem ordem médica inventada. |
| id pendente | Definir e aprovar as etapas de cada paciente | CA-SEQ-02/03/05 | P3-10/11/13 | Editor de etapas e aprovação pelo avaliador atribuído: criar manualmente ou copiar modelo aprovado, adaptar o caso com motivo, ligar procedimentos e liberar etapas explicitamente. Rascunho/versão, etapa única e paralelo; exceção de A não altera B/modelo. Depende de habilitação/modelos; sem API. Teste humano com avaliador e CRC. |
| id pendente | Registrar conclusão e revisão das etapas do paciente | CA-SEQ-03/04/05 | P3-11/12/13 | Avaliador confere e registra conclusão/fonte ou revisão, preservando versões e eventos. Agendada não é concluída; cancelamento/Executed financeiro não libera próxima etapa. Revisão de plano aprovado bloqueia novos agendamentos até nova aprovação e sinaliza reservas existentes sem cancelá-las. Depende do editor/aprovação; concorrência por versão. |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
