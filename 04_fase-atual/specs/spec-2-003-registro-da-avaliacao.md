# SPEC-2-003 — Registro da avaliação com contexto, resumo e combinados

**Fase:** 2  
**Status:** planejada  
**Dono:** clínica com o Maestro; aceite do Luiz  
**Origem no escopo:** fase 2 (ficha de avaliação, combinados e próxima ação, resumo manual revisado), DH-02, DH-04, RQ-008, RQ-009, LRQ-007, EV-F2-02 (guia de conexão e comunicação da CRC), CL-002  
**Degrau da solução:** construção mínima — duas coleções novas ligadas à Ficha e ao Atendimento do dia, usando as funções de tarefa da SPEC-2-002.

## Contexto e decisões fechadas

- **Estado atual:**
  - **Ficha:** tem histórico e próxima ação.
  - **Acesso da fase 1:** o dentista não acessa leads nem a Ficha completa, e vê a própria fila e os planos em que é avaliador atribuído. A recepção lê a Ficha dos pacientes do dia. As CRCs e a gestão leem a Ficha.
  - **Lacuna:** não há registro do que a CRC ouviu do lead nem do que foi combinado na avaliação.
- **Estado desejado:** o dentista entra na avaliação sabendo o que o lead contou à CRC e, ao final, registra o resultado, o resumo e os combinados. Ao aprovar, cada combinado vira tarefa com dono e prazo.
- **Decisões já fechadas:**
  - **Resumo:** escrito pela equipe. Não há IA nem transcrição nesta fase.
  - **Campos da conversa:** seguem o registro recomendado no guia de conexão e comunicação da CRC, inclusive o canal preferido. A "próxima ação e data" do guia vira combinado e tarefa.
  - **Resultado da avaliação:** segue as situações do guia (seguiu com o tratamento, está pensando, não quis seguir). A falta continua no Atendimento do dia, como na fase 1.
  - **Motivo de "não quis seguir":** tem uma categoria, que a CRC vê, e um texto livre opcional, que segue a regra do resumo. Categorias: valor, decisão com outra pessoa, medo, distância ou agenda, convênio, já tem dentista, outro.
  - **Acesso ao resumo:** segue a política da clínica ("dentistas e recepção autorizados"), dentro do acesso da fase 1 (RN-09).
  - **Versões:** cada correção é um registro novo ligado à avaliação raiz, e as versões anteriores seguem as mesmas regras de leitura.
  - **Prontuário:** fica no Clinicorp. A central nunca escreve lá; a equipe pode copiar o resumo à mão e marcar que copiou.
  - **Fase 1:** os eventos manuais de combinado registrados na fase 1 continuam no histórico e não viram tarefas.
- **Bloqueios:** nenhum.

## Resultado observável

- **Na Ficha:** a CRC registra o que o lead contou: dor, impacto, desejo, motivo para buscar agora, objeção, decisor e canal preferido.
- **Depois da avaliação:** o dentista abre o registro pelo Atendimento do dia, vê a conversa da CRC e registra o resultado, o resumo e os combinados.
- **Ao aprovar:** os combinados aparecem como tarefas na lista de cada responsável. A avaliação que fica em rascunho gera uma tarefa para o autor aprovar.
- **Ao corrigir:** a correção de um resumo aprovado cria uma versão nova, cancela as tarefas que deixaram de valer e cria uma tarefa de revisão para quem já tinha feito alguma.

## Limites e dependências

- **Inclui:** contexto do lead; registro da avaliação; aprovação e correção com versões; tarefas dos combinados e de aprovação pendente; marcação de cópia manual no Clinicorp; permissões de leitura por papel.
- **Fora de escopo:** resumo por IA e transcrição (fase 4); semáforo de leads, sequência de contato e mensagens de follow-up (fases 3 e 4); escrita no Clinicorp; prontuário.
- **Entradas e pré-condições:** SPEC-2-002 no ar (funções `tarefaCriar` e `tarefaCancelar`); Ficha e Atendimento do dia da fase 1.
- **Saídas/artefatos:** coleções `contexto_paciente` e `avaliacoes`; rota de leitura por papel; bloco "Conversa com a CRC" e aba "Avaliações" na Ficha; tela `/avaliacao/:atendimento` aberta pelo botão "Registrar avaliação" no Atendimento do dia.
- **Dependências e responsáveis:** Maestro constrói; Luiz testa como dentista avaliador e como gestão (dois usuários, porque o papel é único por usuário).
- **Atores e permissões mínimas:** ver RN-09.
- **Superfícies/arquivos/configurações afetadas:** duas migrations novas com regras de lista e leitura direta fechadas; migration aditiva em `eventos.tipo` (`contexto_atualizado`, `avaliacao_aprovada`, `avaliacao_corrigida`); hook novo de regras da avaliação; Ficha; Atendimento do dia.
- **Risco e plano B:** a equipe escrever informação clínica nos combinados, que a CRC lê. A tela avisa no campo de combinado; para corrigir, a gestão usa o fluxo "Corrigir" (RN-07), com motivo. Não há edição direta de avaliação aprovada.
- **Rollback ou reversão:** coleções e tipos de evento aditivos; versões anteriores preservadas.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Ficha → `contexto_paciente` | Central | `paciente` (único); `dor_principal`; `tempo_com_problema`; `impacto`; `desejo_principal`; `motivo_agora`; `objecao_apresentada`; `objecao_real`; `acompanhante_decisor`; `canal_preferido` (ligacao, whatsapp_texto, whatsapp_audio, nao_informado); `atualizado_por`; `atualizado_em`; `teste` | Rota do servidor; leitura direta fechada | Um registro por paciente (upsert) | Campo vazio fica "não informado" |
| Atendimento/Ficha → `avaliacoes` | Central | `avaliacao_raiz` (a própria, na versão 1); `versao`; `paciente`; `atendimento` (opcional); `avaliador`; `data`; `resultado` (seguiu_tratamento, pensando, nao_seguiu); `motivo_categoria`; `motivo_texto`; `resumo`; `combinados` (lista com `id`, `descricao`, `responsavel`, `prazo`); `estado` (rascunho, aprovado, substituido); `aprovado_por`; `aprovado_em`; `copiado_clinicorp_por`; `copiado_clinicorp_em`; `unidade`; `teste` | Rotas do servidor; leitura direta fechada para todos os papéis; a rota de leitura monta a resposta por papel | Aprovar de novo não duplica tarefas | 400 com o campo; 403 sem permissão |
| `avaliacoes` → `tarefas` | Central | `tarefaCriar` com `tipo` combinado_avaliacao, `origem_tipo` avaliacao, `origem_chave` = `avaliacao_raiz` + `combinado.id` + hash de (descrição, responsável, prazo) | Função de servidor, na mesma transação da aprovação | Idempotente por `origem_chave` | Falha ao criar qualquer tarefa desfaz a aprovação |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Campo da conversa vazio | "não informado"; nunca preencher por suposição | — | Regra global de dado desconhecido |
| RN-02 | Salvar contexto | Evento `contexto_atualizado` na Ficha, com antes e depois | — | LRQ-007 |
| RN-03 | Aprovar | Exige resultado e resumo; cada combinado exige descrição, responsável ativo e prazo; quem aprova é o autor ou a gestão | — | RQ-008, RQ-009 |
| RN-04 | Resultado "pensando" | Exige pelo menos um combinado (a próxima ação, com dono e data) | — | RQ-009; guia da CRC |
| RN-05 | Resultado "não quis seguir" | Exige `motivo_categoria`; "outro" exige `motivo_texto` | — | Guia da CRC |
| RN-06 | Aprovação | Uma tarefa por combinado; a tarefa de aprovação pendente é concluída com "feito" | — | RQ-008 |
| RN-07 | Corrigir avaliação aprovada (autor ou gestão) | Cria a versão N+1 em rascunho; ao aprovar, a versão N vira "substituído". Combinado igual mantém a tarefa. Combinado alterado gera tarefa nova e cancela a aberta antiga. Combinado removido cancela a aberta. Motivo do cancelamento: "combinado corrigido na versão N+1" | — | RQ-008 |
| RN-08 | Correção atinge tarefa já feita | Criar a tarefa "Revisar combinado corrigido" para quem fez, com prazo hoje; se quem fez estiver desativado, para quem aprovou a correção | — | RQ-008 (encaminhar ao humano) |
| RN-09 | Leitura e escrita por papel | **CRCs:** leem e editam o contexto; da avaliação, veem resultado, categoria do motivo, combinados, autor e data. **Recepção:** lê o contexto e a avaliação completa dos pacientes que já lê pela fase 1. **Dentista:** lê o contexto e registra, lê e aprova a avaliação só dos pacientes em que é o profissional do atendimento de avaliação ou o avaliador atribuído, pela tela `/avaliacao/:atendimento`, sem a Ficha completa nem leads. **Gestão:** tudo da unidade | — | Política da clínica; acesso da fase 1 |
| RN-10 | Histórico | O evento da avaliação registra só tipo, resultado, versão, autor e hora; nunca o resumo nem o texto do motivo | — | DH-04 |
| RN-11 | Marcar cópia no Clinicorp | Registrar quem e quando; não chama o Clinicorp | — | Escopo da fase 2 |
| RN-12 | Rascunho salvo | Cria a tarefa "Aprovar a avaliação" para o autor, com prazo no dia seguinte à avaliação e `origem_chave` = raiz + "aprovar" + versão | — | Evitar combinado perdido em rascunho |
| RN-13 | Atendimento de avaliação | É de avaliação quando o `agenda_item` ligado tem categoria com `tipo_agenda = avaliacao`; categoria `nao_mapeada` não mostra o botão | — | Fase 1 |

## Fluxo e regras

1. Na Ficha, a CRC abre "Conversa com a CRC" e preenche o que o lead contou.
2. No Atendimento do dia, num atendimento de avaliação (RN-13), o dentista toca em "Registrar avaliação". A tela mostra a conversa da CRC no topo.
3. O dentista escolhe o resultado, escreve o resumo, escolhe a categoria do motivo quando não seguiu e lista os combinados com responsável e prazo. A tela avisa: "a CRC lê os combinados; não escreva informação clínica aqui". Salvar em rascunho cria a tarefa de aprovação pendente.
4. O dentista ou a gestão aprovam; as tarefas dos combinados são criadas na mesma transação.
5. Para corrigir, o autor ou a gestão abre a avaliação aprovada e escolhe "Corrigir"; edita a versão nova e aprova; a central aplica RN-07 e RN-08.
6. Quem copiar o resumo para o Clinicorp marca "copiado para o Clinicorp".

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Pensando, resumo e dois combinados | Duas tarefas criadas; tarefa de aprovação concluída | — |
| Limite | Seguiu com o tratamento, sem combinados | Aprovada sem tarefas de combinado | — |
| Falha | Pensando sem combinado | Aprovação recusada | Pedir a próxima ação |
| Falha | CRC abre a avaliação | Vê resultado, categoria e combinados; resumo e texto do motivo ausentes | — |
| Falha | Dentista sem vínculo com o paciente | Negado | — |
| Recuperação | Correção remove um combinado já feito | Tarefa "Revisar combinado corrigido" para quem fez | — |

## Instruções de execução para o Maestro

1. **Ler antes de alterar:** esta SPEC, a SPEC-2-002, a Ficha, o Atendimento do dia e as regras de acesso da fase 1 em `07-sistemas/`.
2. **Alterar somente:** as migrations e o hook desta SPEC, a Ficha (bloco e aba novos), a tela `/avaliacao/:atendimento` e o botão no Atendimento do dia.
3. **Não alterar:** regras do Atendimento do dia, da falta e das etapas do plano; acesso da fase 1; coleção `tarefas` além das funções `tarefaCriar` e `tarefaCancelar`.
4. **Executar nesta ordem:** contexto do lead; registro da avaliação com a rota de leitura por papel; aprovação com tarefas; correção com versões.
5. **Parar e pedir validação quando:** nenhuma parada prevista.
6. **Estado válido ao parar:** Ficha e Atendimento do dia funcionando; provas da fase 1 e da SPEC-2-002 passando.
7. **Ritmo:** construir as tasks vinculadas em sequência, sem pedir autorização nem teste a cada task. O teste do cliente é o roteiro único de `## Teste humano do cliente`, quando todas as tasks vinculadas estiverem no ar. Ponto de aprovação antes disso: nenhum.

## Checklist de execução

- [ ] `contexto_paciente` com evento a cada salvamento.
- [ ] `avaliacoes` com raiz, versão, resultado, motivo, resumo e combinados.
- [ ] Leitura direta fechada; rota de leitura por papel conforme RN-09; histórico sem resumo nem texto do motivo.
- [ ] Aprovação cria tarefas na mesma transação, sem duplicar; rascunho cria a tarefa de aprovação.
- [ ] Correção mantém, recria, cancela e encaminha conforme RN-07 e RN-08.
- [ ] Provas P2.3 na tela Provas.

## Critérios de aceite

- [ ] **CA-2-09:** o contexto do lead fica salvo na Ficha, com campo vazio como "não informado" e cada alteração no histórico com autor e hora.
- [ ] **CA-2-10:** aprovar exige resultado e resumo; "pensando" exige combinado; "não quis seguir" exige a categoria do motivo; combinado sem responsável ativo ou prazo é recusado; quem não é o autor nem da gestão não aprova; marcar "copiado para o Clinicorp" registra quem e quando.
- [ ] **CA-2-11:** cada combinado aprovado vira uma tarefa na lista do responsável, e aprovar de novo não duplica; a avaliação em rascunho gera a tarefa "Aprovar a avaliação" para o autor, concluída quando a avaliação é aprovada.
- [ ] **CA-2-12:** corrigir uma avaliação aprovada preserva a versão anterior; o combinado igual mantém a tarefa; o alterado gera tarefa nova e cancela a antiga; o removido cancela a aberta; a tarefa já feita gera "Revisar combinado corrigido"; nada duplica.
- [ ] **CA-2-13:** a CRC não recebe o resumo nem o texto do motivo pela rota, pela coleção direta ou pelo histórico da Ficha; o dentista e a recepção sem vínculo com o paciente recebem negado; a gestão e quem tem vínculo recebem a avaliação completa.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P2.3-01: aprovar sem resumo; P2.3-02: pensando sem combinado; P2.3-03: não seguiu sem categoria | Rotas pela tela Provas | 400 nos três | Registro da tela Provas |
| RED | P2.3-04: CRC lê a avaliação pela rota, pela coleção direta e pelo histórico da Ficha | Rota, leitura direta, eventos | Resumo e texto do motivo ausentes nos três; leitura direta negada | Registro da tela Provas |
| RED | P2.3-09: combinado sem prazo; combinado com responsável desativado | Aprovar | 400 nos dois | Registro da tela Provas |
| RED | P2.3-10: dentista que não é o autor nem da gestão aprova | Rota | 403 | Registro da tela Provas |
| RED | P2.3-11: dentista sem vínculo e recepção com paciente fora do dia leem a avaliação | Rota | Negado nos dois | Registro da tela Provas |
| GREEN | P2.3-05: pensando com dois combinados | Aprovar | Duas tarefas com `origem_chave`; evento sem resumo na Ficha | Registro da tela Provas |
| GREEN | P2.3-06: contexto do lead | Salvar e reabrir | Campos salvos; vazio como "não informado"; evento com antes e depois | Registro da tela Provas |
| GREEN | P2.3-12: marcar cópia no Clinicorp | Rota | Quem e quando registrados; nenhuma chamada externa | Registro da tela Provas |
| GREEN | P2.3-13: salvar rascunho e depois aprovar | Rotas | Tarefa "Aprovar a avaliação" criada e depois concluída | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.3-07: aprovar duas vezes | Rota | Continuam duas tarefas | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.3-08: corrigir mantendo um combinado, mudando o prazo de outro, removendo um terceiro aberto e um quarto já feito | Corrigir e aprovar | Mantida; nova e antiga cancelada; removida cancelada; "Revisar combinado corrigido" para a feita; nenhuma duplicada; versão anterior "substituído" | Registro da tela Provas |

**Dados/fixtures:** paciente e lead de teste; usuários de teste por papel (CRC, recepção, dois dentistas, gestão); atendimento de avaliação de teste; limpeza pela tela Provas.  
**Caminhos de erro obrigatórios:** campo ausente, papel sem leitura, dentista sem vínculo, responsável desativado, correção sobre tarefa feita.  
**Evidência exigida:** registro das provas e captura da tela de registro da avaliação.

## Teste humano do cliente

- **Origem:** CL-008
- **Quando:** quando todas as tasks de `## Tasks vinculadas` estiverem no ar
- **Quem testa:** Luiz (com um usuário de dentista avaliador e outro de gestão) e uma pessoa da CRC
- **Passos:** a CRC preenche a conversa de um paciente de teste; o Luiz, como dentista, registra a avaliação como "pensando" com dois combinados e aprova; a CRC vê as tarefas sem ver o resumo; o Luiz, como gestão, corrige a avaliação removendo um combinado e vê a tarefa cancelada.
- **Resultado esperado:** o combinado não se perde, tem dono e prazo, e o resumo fica só com quem pode ler.
- **Evidência do aceite:** "testei, pode seguir" do Luiz no grupo.

## Handoff e operação

- **Como demonstrar:** a Ficha com a conversa da CRC; a avaliação aprovada; as tarefas na lista de cada responsável.
- **Como operar depois:** a CRC preenche a conversa a cada lead; o dentista registra ao fim de cada avaliação.
- **Como monitorar:** a tarefa "Aprovar a avaliação" vencida aparece para a gestão (SPEC-2-002).
- **Pendência conhecida:** nenhuma.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| 58110848-dd3b-44b1-b206-fbe4319f23dd | Registrar na ficha o que o lead contou à CRC | L A Rodrigues | SPEC-2-003 | CA-2-09 | P2.3-06 | Provas e captura do bloco | Ficha da fase 1 | ☐ |
| e93d9923-12ab-4611-ba19-08370535af4a | Registrar a avaliação com resultado, resumo e combinados | L A Rodrigues | SPEC-2-003 | CA-2-10, CA-2-13 | P2.3-01 a P2.3-04, P2.3-09 a P2.3-12 | Provas | SPEC-2-002 no ar | ☐ |
| 7ee8a4c0-897c-4e71-b2f4-4b69ce3cf72b | Transformar os combinados aprovados em tarefas | L A Rodrigues | SPEC-2-003 | CA-2-11 | P2.3-05, P2.3-07, P2.3-13 | Provas e Minhas tarefas | Registro da avaliação no ar | ☐ |
| c9b7db52-cf3f-4ed7-9b86-ddf5d9fcb6c8 | Corrigir uma avaliação aprovada sem perder o histórico | L A Rodrigues | SPEC-2-003 | CA-2-12 | P2.3-08 | Provas | Tarefas dos combinados no ar | ☐ |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
