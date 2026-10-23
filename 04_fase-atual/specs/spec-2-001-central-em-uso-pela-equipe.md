# SPEC-2-001 — Central em uso pela equipe

**Fase:** 2  
**Status:** planejada  
**Dono:** clínica com o Maestro; aceite do Luiz  
**Origem no escopo:** AC-23-01 e AC-23-02 (fase 1 aceita pelos testes de cada SPEC; teste do painel trazido para a fase 2), EV-F2-01, SPEC-1-006, SPEC-1-007 (roteiro por função), CL-008  
**Degrau da solução:** reuso — usa as telas da fase 1 como estão e só corrige o que contraria o aceite delas.

## Contexto e decisões fechadas

- **Estado atual:** a fase 1 está no ar (v0.0.146). O dono testou cada entrega sozinho. O painel da gestão e a linha de base foram entregues em 23/10/2026 com as provas P6-01 a P6-06 no ar. O changelog registra o aceite do Luiz às 10h10, com massa de demonstração (commit f8f7b01). A comparação detalhada e o uso pela equipe previstos nesta SPEC ainda precisam ser executados.
- **Estado desejado:** os números do painel e da linha de base batem com a contagem direta da base; cada função da equipe usou a sua parte da central num dia de agenda real, em paralelo à rotina atual; o que falhou foi corrigido ou levado ao consultor.
- **Decisões já fechadas:**
  - A tela "Demonstração e aceite" da SPEC-1-007 não será construída.
  - O uso é em paralelo: a agenda oficial continua no Clinicorp, e a equipe segue com o robô, o Trello e o APP CRC.
  - A central recebe a agenda do dia por arquivo, pelo fluxo de importação da fase 1. Quem exporta do Clinicorp e importa é a gestão da clínica (checklist da clínica).
  - Nenhuma mensagem sai para paciente e nada é escrito no Clinicorp.
- **Bloqueios:** nenhum para construir. A última task depende do dia de uso, que está no checklist da clínica.

## Resultado observável

A gestão abre a comparação e vê, para cada indicador do painel e da linha de base, o número da tela ao lado da contagem direta na base. A CRC, a recepção, o dentista avaliador e a gestão têm um roteiro curto da sua rotina na central. Depois do dia de uso, cada problema encontrado tem um desfecho registrado: corrigido ou levado ao consultor.

## Limites e dependências

- **Inclui:**
  - Comparação do painel e da linha de base com a contagem direta, na massa de teste e no lote do dia de uso.
  - Roteiro de uso por função, com conferência de que cada função tem usuário.
  - Registro e correção dos problemas do dia de uso que contrariam o aceite da fase 1.
  - Quando o custo de cada dentista chegar (checklist da clínica), refazer a comparação da linha de base com ele.
- **Fora de escopo:** funcionalidade nova; conexão com Clinicorp, robô ou WhatsApp; desligar Trello ou APP CRC; mudar regra já aprovada.
- **Entradas e pré-condições:**
  - Arquivo da agenda do dia exportado e importado pela gestão (checklist da clínica).
  - Usuários por função cadastrados pela gestão no fluxo da fase 1. O Maestro não cria conta real nem senha.
  - O roteiro cobre os papéis da fase 1: CRC de agendamento, CRC de confirmação, CRC comercial (se houver), recepção, dentista e gestão.
- **Saídas/artefatos:** `05_entregas/fase-2/comparacao-do-painel.md` e `05_entregas/fase-2/uso-pela-equipe.md`. Os dois não contêm nome, telefone nem dado clínico de paciente; uma ocorrência cita a tela, o passo e o id interno do registro.
- **Dependências e responsáveis:** a gestão importa e cadastra usuários; a equipe usa a central; o Maestro compara, escreve o roteiro e corrige; o Luiz confere no teste.
- **Atores e permissões mínimas:** os papéis da fase 1, sem ampliar acesso.
- **Superfícies/arquivos/configurações afetadas:** telas da fase 1 (Confirmações, Planejar, Pacientes a agendar, Ficha, Atendimento do dia, Painel, Provas) apenas para correções; a contagem direta é uma consulta de leitura às coleções, sem rota nova no app.
- **Risco e plano B:** se a equipe não conseguir separar um dia inteiro, vale um turno com as quatro funções presentes.
- **Rollback ou reversão:** os registros do dia importado ficam com origem "arquivo" e o lote identificado. Se a fase 1 não tiver reversão de lote, não construir nesta SPEC; registrar como sinal ao consultor.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Arquivo da agenda do dia → central | Clinicorp (arquivo exportado pela clínica) | O mesmo contrato da importação da fase 1 (horário, profissional, cadeira, paciente, status, categoria) | Gestão importa | Reimportar o mesmo arquivo não duplica (upsert da fase 1) | Linha inválida fica em revisão com o motivo |
| Coleções → comparação | Central | Consulta de leitura por indicador, com o mesmo período e denominador do painel | Gestão | Mesma base → mesmos números | Indicador sem entrada da clínica: "dados insuficientes" com o campo que falta |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Problema encontrado no uso | Registrar função, tela, passo, esperado, obtido e id interno | — | CL-008 |
| RN-02 | Problema contraria um critério de aceite da fase 1 | Corrigir na SPEC de origem e reexecutar as provas dela | — | Contrato de mudança (bug dentro do aceite) |
| RN-03 | Problema pede algo além do aceite da fase 1 | Não construir; registrar como sinal ao consultor | — | Contrato de mudança (emenda ou SPEC nova) |
| RN-04 | Uso em paralelo | Nenhum envio a paciente, nenhuma escrita no Clinicorp | — | Escopo, fases 1–3 |
| RN-05 | Uso com pacientes reais | A equipe registra na central só o que de fato fez na rotina atual (resposta, ligação, chegada, chamada, início, fim, falta). Liberação e oferta na central só espelham uma liberação ou oferta feita de verdade; para treinar sem isso, usar a massa de teste | — | Escopo, fases 1–3 |

## Fluxo e regras

1. O Maestro gera a comparação na massa de teste: para cada indicador (agendados, confirmados, sem resposta, ligações, faltas, vagas liberadas e preenchidas, carga por dentista, tempos e desvios, linha de base), o número da tela e a contagem direta, no mesmo período e denominador.
2. O Maestro confere que cada função tem usuário e escreve o roteiro de cada uma em `uso-pela-equipe.md`.
3. No dia de uso, a gestão importa a agenda do dia e cada função faz a rotina na central seguindo o roteiro e a RN-05.
4. Depois do dia de uso, o Maestro refaz a comparação com o lote do dia, registra cada problema e corrige os que estão dentro do aceite da fase 1, reexecutando as provas da SPEC de origem.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Agenda de um dia importada e as quatro funções presentes | Cada função completa o roteiro; problemas registrados com desfecho | — |
| Limite | Só um turno disponível | Roteiro feito no turno, com as quatro funções | Registrar que foi um turno |
| Limite | Custo dos dentistas ainda não enviado | Custo por paciente como "dados insuficientes" com o campo que falta | Refazer quando chegar |
| Falha | Número do painel diferente da contagem direta | Problema aberto na SPEC-1-006 e corrigido | Reexecutar P6-01 a P6-06 |
| Falha | Pedido de funcionalidade nova | Registrado como sinal ao consultor, sem construir | — |

## Instruções de execução para o Maestro

1. **Ler antes de alterar:** esta SPEC, as SPECs da fase 1 em `05_entregas/fase-1/specs/` e o código em `07-sistemas/`.
2. **Alterar somente:** correções de problemas dentro do aceite da fase 1 e os dois arquivos de entrega desta SPEC.
3. **Não alterar:** regras aprovadas, permissões, integrações externas e dados reais fora do lote do dia.
4. **Executar nesta ordem:** comparação; roteiro por função. A correção começa depois do dia de uso; até lá, siga para a SPEC-2-002.
5. **Parar e pedir validação quando:** a correção exigir mudar uma regra aprovada ou uma permissão.
6. **Estado válido ao parar:** a central continua com as provas da fase 1 passando.
7. **Ritmo:** construir as tasks vinculadas em sequência, sem pedir autorização nem teste a cada task. O teste do cliente é o roteiro único de `## Teste humano do cliente`, quando todas as tasks vinculadas estiverem no ar. Ponto de aprovação antes disso: nenhum.

## Checklist de execução

- [ ] Comparação gerada com período e denominador de cada indicador.
- [ ] Usuários por função conferidos e roteiro escrito.
- [ ] Problemas do dia de uso registrados com função, tela, esperado, obtido e id interno, sem dado de paciente.
- [ ] Problemas dentro do aceite corrigidos e provas da SPEC de origem reexecutadas.

## Critérios de aceite

- [ ] **CA-2-01:** na massa de teste da fase 1 e no lote do dia de uso, cada indicador do painel e da linha de base mostra o mesmo número da contagem direta, no mesmo período e denominador. Indicador cuja entrada a clínica ainda não enviou mostra "dados insuficientes" com o campo que falta. O Luiz confirmou.
- [ ] **CA-2-02:** existe um roteiro para cada função da fase 1 presente na clínica, e cada função tem usuário.
- [ ] **CA-2-03:** todo problema do dia de uso tem desfecho: corrigido com a prova da SPEC de origem passando, ou registrado como sinal ao consultor.
- [ ] **CA-2-04:** durante o uso, nenhuma mensagem saiu para paciente, nada foi escrito no Clinicorp, e as provas P1 a P6 da tela Provas continuam passando.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P2.1-01: indicador sem a entrada da clínica | Gerar a comparação com o custo dos dentistas ausente | "dados insuficientes" com o campo que falta, nunca um número | `comparacao-do-painel.md` |
| RED | P2.1-05: lote do dia com uma linha sem profissional | Importar | Linha em revisão com o motivo; as demais aplicadas; lote identificado | Registro do lote |
| RED | P2.1-06: usuário da equipe sem papel ou inativo | Entrar | Sem acesso a dados (P1-01) | Registro da tela Provas |
| GREEN | P2.1-02: comparação completa | Contagem direta × número da tela, por indicador | Todos iguais, ou diferença registrada como problema | `comparacao-do-painel.md` |
| GREEN | P2.1-03: roteiro por função | Conferir usuários e roteiro de cada papel | Um roteiro por função presente; cada uma com usuário | `uso-pela-equipe.md` |
| REFACTOR/REGRESSÃO | P2.1-04: regressão da fase 1 | Rodar P1 a P6 na tela Provas depois das correções | Todas passam | Registro da tela Provas |

**Dados/fixtures:** massa de teste da fase 1; agenda de um dia real importada pela gestão.  
**Caminhos de erro obrigatórios:** indicador divergente; entrada da clínica ausente; linha inválida; usuário sem papel.  
**Evidência exigida:** os dois arquivos de entrega e o registro das provas.

## Teste humano do cliente

- **Origem:** CL-008
- **Quando:** quando todas as tasks de `## Tasks vinculadas` estiverem no ar (a última só depois do dia de uso)
- **Quem testa:** Luiz
- **Passos:** abrir o painel com a comparação ao lado e conferir os números; ler em `uso-pela-equipe.md` o desfecho de cada problema do dia de uso.
- **Resultado esperado:** painel com números conferidos e nenhum problema sem desfecho.
- **Evidência do aceite:** "testei, pode seguir" do Luiz no grupo.

## Handoff e operação

- **Como demonstrar:** painel com a comparação ao lado; roteiro e problemas resolvidos.
- **Como operar depois:** a equipe pode repetir o uso em paralelo quando quiser, com a agenda do dia importada.
- **Como monitorar:** as provas da tela Provas.
- **Pendência conhecida:** o custo por paciente mostra "dados insuficientes" até a clínica informar o custo de cada dentista.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| 22d83348-1372-46f4-88cd-0cf15f55cd06 | Comparar os números do painel com a contagem direta da base | L A Rodrigues | SPEC-2-001 | CA-2-01 | P2.1-01, P2.1-02 | `comparacao-do-painel.md` | Painel v0.0.146 no ar | ☐ |
| bffde635-3aa5-48b1-ab88-a76834e96eb2 | Escrever o roteiro de uso da central para cada função | L A Rodrigues | SPEC-2-001 | CA-2-02 | P2.1-03, P2.1-06 | `uso-pela-equipe.md` com o roteiro | Usuários cadastrados pela gestão | ☐ |
| abb0fefa-2464-47b8-80a4-60ffc453ea8c | Corrigir os problemas encontrados no dia de uso | L A Rodrigues | SPEC-2-001 | CA-2-03, CA-2-04 | P2.1-04, P2.1-05 | `uso-pela-equipe.md` com desfechos | Dia de uso feito (checklist da clínica) | ☐ |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
