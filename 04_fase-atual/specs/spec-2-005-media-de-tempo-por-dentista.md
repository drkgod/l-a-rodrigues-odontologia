# SPEC-2-005 — Média de tempo por dentista

**Fase:** 2  
**Status:** planejada  
**Dono:** clínica com o Maestro; aceite do Luiz  
**Origem no escopo:** fase 2 (médias determinísticas de duração por profissional, com amostra e versão), NI-01, AC-L03, AC-05-07, AC-L02, AC-001, regras globais "tempo incompleto" e "tabela de duração versionada"  
**Degrau da solução:** reuso — usa os tempos do Atendimento do dia, o planejamento ligado a cada agenda e o fluxo de validação clínica e versão da tabela de duração da fase 1 (SPEC-1-002).

## Contexto e decisões fechadas

- **Estado atual:**
  - **Tabela de duração:** a duração sugerida vem da tabela da clínica, com regra por dentista quando existe, arredondada para cima no múltiplo de `config_unidade.arredondamento_min`.
  - **Versões:** a tabela é versionada como um todo, com uma versão ativa. Pela emenda da SPEC-1-002, tempo novo exige validação clínica de um avaliador habilitado (`validada_clinicamente_por/em`), e a gestão sem habilitação clínica não substitui essa validação.
  - **Tempos reais:** o Atendimento do dia registra início e fim pelo botão; a correção exige motivo.
  - **Procedimento:** fica no planejamento ligado à agenda (`planejamentos.agenda_item`, único), não no atendimento.
- **Estado desejado:** a central calcula a média real de cada dentista em cada regra da tabela e propõe o ajuste. Um avaliador habilitado valida, e a gestão publica uma versão nova da tabela que muda só aquela regra.
- **Decisões já fechadas:**
  - **Chave do atendimento:** `atendimento.agenda_item` → `planejamentos` → `procedimento`, `quantidade`, `combinacao` e `regra_aplicada`. O agrupamento é por profissional e pela regra vigente que se aplica (procedimento, faixa de quantidade e combinação), não pela quantidade exata.
  - **Amostra válida:** atendimento com início e fim registrados, fim depois do início, com planejamento e regra aplicada. Fica fora da massa de teste, do profissional fictício CANCELAMENTO e das avaliações (duração fixa). Atendimento corrigido com motivo entra com o valor corrigido.
  - **Cálculo:** média aritmética da duração (fim − início), arredondada para cima no múltiplo da unidade, como na SPEC-1-002. A tela mostra também a mediana, o mínimo, o máximo e o número de atendimentos.
  - **Parâmetros:** janela e amostra mínima ficam na configuração da gestão, com padrão de 90 dias e 5 atendimentos, e cada mudança é versionada. A clínica confirma os padrões pelo checklist.
  - **Aplicação:** nada muda na tabela sem a validação clínica e a publicação.
  - **Fontes excluídas:** as baixas do Clinicorp (relatório Botão × Clinicorp da fase 1) e os eventos do Clinicorp não alimentam a média; os eventos só depois da prova da fase 4.
- **Bloqueios:** nenhum.

## Resultado observável

Na tela Médias, a gestão vê, por dentista e regra, quantos atendimentos válidos existem, a média, a mediana, o mínimo, o máximo, a regra atual e quantos ficaram fora e por quê. Quando a média arredondada difere da regra e a amostra é suficiente, aparece uma proposta. Depois que um avaliador habilitado valida e a gestão publica, o Planejar sugere o tempo novo para aquele dentista. Rejeitar mantém a regra e guarda o motivo, e reverter devolve só aquela regra ao valor anterior.

## Limites e dependências

- **Inclui:** cálculo sob demanda pelo botão "Calcular médias"; propostas; validação clínica, publicação, rejeição e reversão; configuração de janela e amostra mínima; modo demonstração.
- **Fora de escopo:** aplicação automática; tempos históricos importados sem validação; baixas e eventos do Clinicorp; remoção automática de valores fora da curva.
- **Entradas e pré-condições:** atendimentos com tempos válidos e planejamento (o uso da equipe na SPEC-2-001 gera os primeiros); tabela de duração aprovada.
- **Saídas/artefatos:** coleções `propostas_media` e `media_config`; tela `/medias`; versão nova da tabela de duração pelo fluxo da SPEC-1-002.
- **Dependências e responsáveis:** Maestro constrói; Luiz testa.
- **Atores e permissões mínimas:** só a gestão vê `/medias`, calcula, rejeita, publica e altera a configuração; a validação clínica é de um avaliador habilitado, como na SPEC-1-002.
- **Superfícies/arquivos/configurações afetadas:** migrations novas; hook novo de cálculo; fluxo de validação e versão da tabela de duração; Planejar (só lê a versão vigente).
- **Risco e plano B:** com poucos atendimentos válidos, a tela mostra "amostra insuficiente" e não propõe nada.
- **Rollback ou reversão:** reverter cria outra versão nova que devolve só aquela regra ao valor anterior; a proposta fica "revertida".

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| `atendimentos` + `planejamentos` → cálculo | Central (botão iniciar/finalizar e planejamento) | Profissional, início, fim, correção com motivo, `teste`; do planejamento: `procedimento`, `quantidade`, `combinacao`, `regra_aplicada` | Servidor | Mesma entrada → mesmo resultado | Fora da amostra com o motivo: sem início ou fim, fim antes do início, sem planejamento, sem regra, avaliação, teste, CANCELAMENTO |
| Cálculo → `propostas_media` | Central | `profissional`; `regra` (id da regra vigente aplicada); `n`; `media_min`; `mediana_min`; `minimo_min`; `maximo_min`; `proposto_min`; `regra_atual_min`; `janela_inicio`; `janela_fim`; `amostra_hash`; `estado` (aberta, validada, publicada, rejeitada, revertida, substituida); `validada_clinicamente_por`; `validada_clinicamente_em`; `publicada_por`; `publicada_em`; `motivo`; `teste` | Só gestão; validação por avaliador habilitado | Mesma `amostra_hash` não cria proposta nova; uma aberta por profissional e regra | — |
| Publicação → tabela de duração | Central | Versão nova que copia a vigente e troca só a regra daquele profissional, com autor, data e "média de n atendimentos de dd/mm a dd/mm" | Fluxo da SPEC-1-002 | — | Falha mantém a versão vigente |
| Gestão → `media_config` | Central | `janela_dias` (padrão 90); `amostra_minima` (padrão 5); `versao`; `alterado_por`; `alterado_em` | Só gestão | — | Valor menor que 1 recusado |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Atendimento fora da amostra válida | Fora do cálculo, com o motivo contado na tela | No modo demonstração, só a massa de teste entra | Regra global "tempo incompleto"; fase 1 |
| RN-02 | n < amostra mínima | "Amostra insuficiente"; sem proposta | — | Risco "média contaminada" |
| RN-03 | Média arredondada = regra atual | Sem proposta | — | — |
| RN-04 | Média arredondada ≠ regra atual e n ≥ amostra mínima | Proposta aberta | — | AC-05-07 |
| RN-05 | Mesma amostra calculada de novo | Não cria outra proposta | — | Determinismo |
| RN-06 | Nova amostra para profissional e regra com proposta aberta | A anterior vira "substituída"; fica uma aberta | — | — |
| RN-07 | Validar | Só avaliador habilitado; registra quem e quando | — | SPEC-1-002 (emenda) |
| RN-08 | Publicar | Só gestão e só proposta validada; versão nova que muda só aquela regra | — | Tabela versionada |
| RN-09 | Rejeitar | Exige motivo; não muda a tabela | — | — |
| RN-10 | Reverter | Versão nova que devolve só aquela regra ao valor anterior | — | — |
| RN-11 | Modo demonstração | Proposta marcada `teste`; publicar cria só uma versão de teste do profissional de teste, usada pelo Planejar só no modo demonstração e apagada pela limpeza da tela Provas | — | Fase 1 (modo demonstração) |

## Fluxo e regras

1. A gestão abre `/medias` e toca em "Calcular médias".
2. A central lê os atendimentos da janela, separa os válidos (RN-01), agrupa por dentista e regra e calcula.
3. A tela lista os grupos com n, média, mediana, mínimo, máximo, regra atual, excluídos por motivo e a proposta, quando houver.
4. Um avaliador habilitado valida ou rejeita a proposta; a gestão publica a validada.
5. O Planejar passa a sugerir o tempo da versão nova para aquele dentista.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | 5 atendimentos válidos de 40, 42, 45, 38 e 50 min; regra atual 40; múltiplo 5 | Média 43; mediana 42; proposta 45 | — |
| Limite | 4 atendimentos válidos | "Amostra insuficiente" | — |
| Limite | Média 41, múltiplo 5 | Proposta 45 (arredondamento para cima) | — |
| Falha | Atendimento sem fim ou sem planejamento | Fora da amostra, com o motivo | — |
| Recuperação | Proposta publicada por engano | Reverter; só aquela regra volta | — |

## Instruções de execução para o Maestro

1. **Ler antes de alterar:** esta SPEC, a SPEC-1-002 (validação clínica e versões da tabela) em `05_entregas/fase-1/specs/`, o hook de aprovação da tabela de duração e o Atendimento do dia em `07-sistemas/`.
2. **Alterar somente:** migrations, hook e tela desta SPEC; chamada ao fluxo de validação e versão existente.
3. **Não alterar:** a sugestão do Planejar além de ler a versão vigente; as regras do Atendimento do dia; o relatório Botão × Clinicorp.
4. **Executar nesta ordem:** cálculo, tela e configuração; propostas com validação, publicação, rejeição e reversão.
5. **Parar e pedir validação quando:** o fluxo de versão da fase 1 não permitir trocar só uma regra; nesse caso, relatar antes de publicar qualquer versão.
6. **Estado válido ao parar:** a tabela de duração vigente continua sendo a sugerida.
7. **Ritmo:** construir as tasks vinculadas em sequência, sem pedir autorização nem teste a cada task. O teste do cliente é o roteiro único de `## Teste humano do cliente`, quando todas as tasks vinculadas estiverem no ar. Ponto de aprovação antes disso: nenhum.

## Checklist de execução

- [ ] Chave pelo planejamento e amostra válida conforme RN-01, com contagem dos excluídos por motivo.
- [ ] Cálculo determinístico; uma proposta aberta por profissional e regra.
- [ ] Validação clínica, publicação de versão que muda só uma regra, rejeição com motivo e reversão seletiva.
- [ ] Configuração versionada, só pela gestão.
- [ ] Modo demonstração isolado da tabela real.
- [ ] Provas P2.5 na tela Provas.

## Critérios de aceite

- [ ] **CA-2-19:** a média usa só atendimentos válidos, ligados ao planejamento, e os excluídos aparecem contados por motivo.
- [ ] **CA-2-20:** com amostra suficiente e média arredondada para cima diferente da regra, aparece uma proposta com n, média, mediana, mínimo, máximo e janela; calcular de novo com os mesmos dados não cria outra, e há uma só aberta por profissional e regra.
- [ ] **CA-2-21:** a proposta só é publicada depois da validação de um avaliador habilitado; publicar cria versão nova que muda só aquela regra, e o Planejar sugere o tempo novo para aquele dentista; rejeitar exige motivo e não muda nada; reverter devolve só aquela regra.
- [ ] **CA-2-22:** só a gestão abre `/medias` e altera a configuração; janela ou amostra menor que 1 é recusada; cada mudança cria versão; proposta do modo demonstração nunca altera a tabela real.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P2.5-01: na massa, um atendimento sem fim, um sem planejamento e um do CANCELAMENTO | Calcular | Os três fora da amostra, cada um com o motivo | Registro da tela Provas |
| RED | P2.5-02: 4 atendimentos válidos | Calcular | "Amostra insuficiente"; sem proposta | Registro da tela Provas |
| RED | P2.5-08: usuário que não é da gestão abre `/medias` ou publica; `amostra_minima` = 0 | Tela e rotas | 403; recusado | Registro da tela Provas |
| GREEN | P2.5-03: 40, 42, 45, 38, 50 min; regra 40; múltiplo 5 | Calcular | Média 43; mediana 42; proposta 45 | Registro da tela Provas |
| GREEN | P2.5-04: validar pelo avaliador habilitado de teste e publicar pela gestão | Rotas | Versão de teste nova; Planejar no modo demonstração sugere 45 para o dentista de teste; tabela real intacta | Registro da tela Provas |
| GREEN | P2.5-09: mudar `janela_dias` para 60 | Configuração | Versão nova da configuração com autor e data | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.5-05: calcular de novo; depois incluir um atendimento novo e calcular | Calcular | Nenhuma proposta nova na primeira; a anterior "substituída" e uma aberta na segunda | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.5-06: publicar sem validação; rejeitar sem motivo; média 41 com múltiplo 5 | Rotas e cálculo | Recusado; recusado; proposta 45 | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.5-07: publicar A, publicar B, reverter A | Rotas | A volta ao valor anterior; B continua | Registro da tela Provas |

**Dados/fixtures:** atendimentos e planejamentos de teste de um dentista de teste; avaliador habilitado de teste; limpeza pela tela Provas.  
**Caminhos de erro obrigatórios:** tempo incompleto, sem planejamento, amostra pequena, acesso negado, publicação sem validação, rejeição sem motivo, reversão.  
**Evidência exigida:** registro das provas e captura da tela Médias.

## Teste humano do cliente

- **Origem:** CL-008
- **Quando:** quando todas as tasks de `## Tasks vinculadas` estiverem no ar
- **Quem testa:** Luiz (como avaliador habilitado e como gestão)
- **Passos:** ligar o modo demonstração; calcular as médias com a massa de teste; conferir uma proposta e os excluídos; validar e publicar; abrir o Planejar no modo demonstração e ver o tempo novo para o dentista de teste; reverter.
- **Resultado esperado:** a média só usa tempos válidos, mostra de onde veio e só muda a agenda com validação e publicação.
- **Evidência do aceite:** "testei, pode seguir" do Luiz no grupo.

## Handoff e operação

- **Como demonstrar:** tela Médias com uma proposta e o Planejar com o tempo novo.
- **Como operar depois:** a gestão calcula as médias quando quiser revisar os tempos, por exemplo uma vez por mês.
- **Como monitorar:** a contagem de excluídos por motivo mostra se a equipe está registrando início, fim e planejamento.
- **Pendência conhecida:** a clínica confirma se a janela de 90 dias e a amostra mínima de 5 servem; os valores podem ser ajustados na configuração.

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| 0a04a3a8-7c96-4788-a663-6a4c4af35021 | Calcular a média de tempo de cada dentista | L A Rodrigues | SPEC-2-005 | CA-2-19, CA-2-20, CA-2-22 | P2.5-01 a P2.5-03, P2.5-05, P2.5-08, P2.5-09 | Provas e captura da tela Médias | Atendimento do dia e planejamento da fase 1 | ☐ |
| 197073b8-9623-4d46-b248-31b1188bca9a | Atualizar a tabela de duração com a média validada | L A Rodrigues | SPEC-2-005 | CA-2-21 | P2.5-04, P2.5-06, P2.5-07 | Provas e Planejar com o tempo novo | Cálculo no ar | ☐ |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
