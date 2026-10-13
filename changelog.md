## 13/10/2026 — fontes compartilhadas e pedidos de documentos

- Registrada a pasta Drive indicada pela clínica, sem afirmar listagem/leitura não realizadas.
- AGENTS/README exigem procurar e reaproveitar materiais antes de pedir reenvio; pedido explica documento, campos, finalidade, fontes consultadas e lacuna.
- CL-001 deve ser procurado nos arquivos existentes antes de ser considerado ausente. Demonstração continua permitida com dados sintéticos separados.

## 13/10/2026 — fundamentação antes de integrações

- AC-13-IT aplicada: fases 1–3 locais; conexões e piloto na 4; segunda unidade/conjunto na 5.
- Sete SPECs/TDD/testes humanos e índice revisados; 49 cards na fase 1 e cinco reservados na 4. Todos os 54 UUIDs/metadados preservados.
- App começa sem credenciais de provedores; importação/fixture com origem, acesso e isolamento. Nenhuma task executada.
- Pasta operacional atualizada; destino GitHub privado `drkgod/l-a-rodrigues-odontologia`, conforme pedido explícito de publicação.

# Histórico operacional

## 13/10/2026

- Preparado pacote local da fase 1 com 7 SPECs e 54 tasks; conservados 49 UUIDs e conciliados 5 novos devolvidos pelo portal.
- Incorporadas regras de 3 mensagens + 1 ligação/corte 17h, avaliação 2×30min e limites de agendas locais com configuração pendente explícita.
- Incluídos roteiros de teste para leitura parcial, tentativas/concorrência, capacidade, baseline e contingência.
- Restauradas descrições suprimidas pelo retorno do portal, conservando títulos, UUIDs, status, responsáveis, prazos, hierarquia e visibilidade.
- Materializadas apenas tasks/SPECs atuais e instruções operacionais; nenhuma fase futura ou análise interna copiada.

## 13/10/2026 — task 7805f88a

- Implementada e publicada a base da unidade piloto com acesso por função (SPEC-1-001, CA-1-01): migration 0001 (profissionais, cadeiras, config_unidade, provas_execucoes, users+papel/ativo/profissional), regras de acesso por função no servidor, telas Login/Sem acesso/Provas/Início, menu por função.
- Versão Skip v0.0.4 (ref e13e688) publicada em https://projeto-lai-19327.goskip.app com QA 100% verde. Subtask 556859ba (tela de provas) entregue junto. Aguardando teste humano.

## 13/10/2026 — debug da task 7805f88a (prova P1-01)

- Teste humano do champion achou a prova P1-01 sempre falhando. Diagnóstico: o PocketBase, ao negar uma listagem pela regra de acesso, devolve 200 com lista VAZIA (nunca erro) — a prova esperava um erro que nunca viria. O servidor estava protegendo certo; quem media errado era a prova.
- Corrigido: a prova agora cria um registro de teste como gestão, confere que o anônimo vê 0 registros e a gestão vê o registro, e apaga o massa no fim. Publicado como v0.0.5 (ref 5379b64), QA 100% verde.

## 13/10/2026 — debug 2 da task 7805f88a (prova P1-01)

- Segundo teste humano: "sem login leu 1 registro(s)". Causa raiz real: clientes PocketBase criados no mesmo site HERDAM a sessão do navegador (authStore persistido) — o "anônimo" da prova lia como admin. Servidor sempre esteve certo (curl sem sessão = 0 registros).
- Correção: clientes de prova usam store EM MEMÓRIA (BaseAuthStore) — nunca herdam nem tocam a sessão do usuário; prova ganhou a checagem de usuário criado SEM função (semfuncao@lai.local, seed na migration 0001) que também deve ver 0 registros.
- QA pegou missing export (PocketBase não é named export na 0.26.9) — corrigido para import default. Publicado v0.0.7 (ref ee697cf), QA 100% verde.

## 13/10/2026 — debug 3 da task 7805f88a (prova P1-01)

- 3º teste humano: PASSOU — mas a análise do "obtido" mostrou que a checagem do usuário sem função passou pelo motivo errado: o cadastro de teste nunca foi criado (o seed estava dentro da migration 0001, já aplicada — migration aplicada não roda de novo; "Failed to authenticate" estava sendo contado como sucesso).
- Correção honesta: migration NOVA (0002) cria o usuário sem função de fato — verificado no servidor (login 200). A prova agora exige login OK + 0 registros dele. Publicado v0.0.8 (ref d90570c), QA 100% verde.
- Pendência: 4º teste humano para a evidência verdadeira do critério CA-1-01 completo.

## 13/10/2026 — debug 4 da task 7805f88a (prova P1-01)

- 4º teste: "passou", mas o obtido mostrou bug de código na checagem do usuário sem função: o resultado do login era usado como cliente ((intermediate value).collection is not a function) e o catch continuava contando falha como sucesso. Critério agora PROVADO no servidor: login do sem-função OK (200) e leitura dele = 0 registros (curl com token próprio).
- Correção: checagem separa login da leitura; qualquer falha na checagem agora marca a prova como FALHA (não passa por acidente). Publicado v0.0.9 (ref 77dd470), QA 100% verde.
- Pendência: 5º teste humano para a evidência honesta de fechamento.

## 13/10/2026 — task 7805f88a CONCLUÍDA

- 5º teste humano aprovado pelo champion (print com as 3 checagens verdadeiras: sem login 0, sem função 0, gestão 1+, massa apagada). Versão testada = publicada (77dd470).
- Verificação independente completa: versão no ar conferida, migrations 0001/0002 applied, critério provado também por API no servidor (login 200 + leitura 0 registros), QA 100% verde, zero API externa, sem segredo novo.
- Task e subtask marcadas [x] em 04_fase-atual/fase.md. 2/49 cards da fase 1 concluídos.

## 13/10 — análise documental definida nas SPECs

O executor não precisa inventar como analisar a entrada. Cada SPEC vigente descreve documentos/campos, extração, validações, saída e pergunta somente para lacuna não resolvida. Consultar a pasta compartilhada e materiais existentes antes de perguntar; não transformar acesso pendente em ausência nem solicitar formato novo sem necessidade. As análises são parte das tasks existentes. Não copiar dados identificáveis para Git. Nas fases futuras, repetir este contrato na SPEC gerada para cada entrega; não antecipar áudio/financeiro/conexões na fase 1.

## 13/10/2026 — task 1f4de19d: cadastrar a tabela de duração na central (entregue, aguardando teste)

- Fonte consultada ANTES de pedir (AGENTS.md): planilha "Tabela Procedimentos x Tempos.xlsx" no Drive da clínica — base estruturada com abas db_ (22 regras multi-variável em 7 grupos, 91 procedimentos, 22 profissionais, horários ALC/ITA, escala). CSV preparado em artifacts/tabela-duracao-v1.csv.
- DECISÃO DO CLIENTE (13/10 16:53): importar o formato REAL com 2 variáveis (preserva regras como implante 2 + 2 exodontias = 40 min); lentes 8+ = turno de 4 horas (240 min) — valor informado pelo dono, não inventado pelo sistema.
- Entrega: migration 0004 (tabela_duracao + regras_duracao, regras de acesso padrão), rotas /backend/v1/duracao/importar-tabela (valida linha a linha, cria versão RASCUNHO, reimport por hash idempotente) e /duracao/aprovar-tabela (ativa UMA versão, desativa as outras, grava aprovada_por/em), service duracao.ts (parser CSV ; ou ,), tela /tabela-duracao (importar → prévia com rejeitadas → versões com badge Ativa/Rascunho → Ativar → conferência das regras da versão ativa), provas P2-07/P2-08 na tela Provas.
- Debug: PocketBase rejeita string vazia em campo number (v0.0.18: vazio → omitir no cliente) e CSV de teste desalinhado ocultava NaN como duração (v0.0.19: validação Number.isFinite no hook — duração e faixas não numéricas são rejeitadas com motivo).
- E2E servidor: 22 regras reais (0 rejeitadas), reimport ja_aplicado, aprovação ativa 22 regras (coroas 3-4=40, lentes 8+=240 conferidas), 401 sem auth, dados de teste apagados (0 restantes).
- Provas na tela em produção: P2-07 ✓ e P2-08 ✓ (17:12, admin@lai.local). Publicado v0.0.19 (ref 9d1e3f1). Aguardando teste humano.

## 13/10/2026 · Luiz (assistente ETHOS) · Task 1f4de19d CONCLUÍDA

- Teste humano aprovado pelo champion (17:46, admin@lai.local): importou a tabela real (22 regras, nada duplicado), ativou a versão e rodou P2-07 ✓ e P2-08 ✓ na tela em produção.
- Verificação independente: versão no ar = testada (9d1e3f1 na hora do teste; ec815d4 depois), migrations 0001-0004 applied, E2E servidor com as 22 regras reais, 401 sem auth, banco limpo de massa de teste.
- Correção de fecho (v0.0.20, ref ec815d4): a limpeza das provas P2-07/P2-08 apagava TODAS as tabelas, inclusive a importação real do usuário — agora só apaga massa de teste (regras teste=true ou tabela sem regras); prova: tabela real 22 regras sobreviveu às provas na tela.
- Estado final restaurado: tabela real v1 ATIVA com 22 regras (lentes 8+ = 240 min pela decisão do dono).
- 6/49 cards da fase 1 concluídos.

## 13/10/2026 — task f4982b80: tabela de tempo por procedimento e por dentista (entregue, aguardando teste)

- Fonte: mesma planilha do Drive (abas db_regras_duracao + db_procedimento_profissional). Das 395 linhas de procedimento×profissional, só 5 têm duração específica — as 388 restantes são preferências de agenda (não importadas como tempo; alimentam SPEC-1-001).
- DECISÃO DO CLIENTE (13/10 18h16): "a regra vale dependendo de qual agenda ele vai entrar, pois cada profissional leva um determinado tempo, na dúvida deixa 40 min" — regra por dentista prevalece sobre a do grupo; COMBO 4 SISOS sem dentista definido = 40 min (não os 60 da planilha).
- Entrega: migration 0005 (regras_duracao +profissional, text opcional; vazio = vale para todos), hook importar aceita profissional + valida "regra por profissional exige duração" + variável `sempre` na whitelist (regra incondicional por dentista), service lê/escreve a coluna, tela mostra coluna Profissional ("todos" quando vazio).
- CSV v2 (artifacts/tabela-duracao-v2.csv): 27 regras — 22 de grupo (SISOS_COMBO 40 com nota da decisão; lentes 8+ = 240) + 5 por dentista (SISOS: Luiz Sergio 40, Leonel 30, Ana Clara 60; Alice: exodontia decíduo 20 e mantenedor de espaço 20, grupos próprios EXODONTIA_DECIDUO/MANTENEDOR_ESPACO).
- Debug: 1ª importação rejeitou as 2 regras da Alice (variável `sempre` fora da whitelist) — corrigido v0.0.22 (ref 11a9012); reimport completo: 27 gravadas, 0 rejeitadas, v2 ATIVA.
- E2E servidor: reimport idempotente, ativação única, P2-07 ✓ e P2-08 ✓ na tela em produção (com a v2 real presente; sobreviveu às provas pela guarda da v0.0.20).
- Publicado v0.0.21 (190c454) → v0.0.22 (11a9012). Aguardando teste humano.

- 13/10/2026 · [executor] · DEBUG task f4982b80: P1-08 "Failed to create record." no teste humano → causa raiz: servidor correto (índice composto confirmado; coexistência fixture+manual provada no banco e na tela); falha do teste = pod velho atrás do LB; achado real: limpeza da P1-08 deixava sobra do registro manual de teste → corrigido (v0.0.23, ref b6e6890): sobras de teste incluem origem manual (filtro teste=true). Aguardando novo teste.
