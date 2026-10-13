## 13/10/2026 — fundamentação antes de integrações

- AC-13-IT aplicada: fases 1–3 locais; conexões e piloto na 4; segunda unidade/conjunto na 5.
- Sete SPECs/TDD/testes humanos e índice revisados; 49 cards na fase 1 e cinco reservados na 4. Todos os 54 UUIDs/metadados preservados.
- App começa sem credenciais de provedores; importação/fixture com origem, acesso e isolamento. Nenhuma task executada.
- Pasta operacional atualizada; destino GitHub privado `drkgod/l-a-rodrigues-odontologia`, conforme pedido explícito de publicação.

# Histórico operacional

## 13/10/2026

- Preparado pacote local da fase 1 com7 SPECs e54 tasks; conservados49 UUIDs e conciliados5 novos devolvidos pelo portal.
- Incorporadas regras de3mensagens+1ligação/corte17h, avaliação2×30min e limites de agendas locais com configuração pendente explícita.
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
- Pendência: 4º teste humano para evidência verdadeira do critério CA-1-01 completo.

## 13/10/2026 — debug 4 da task 7805f88a (prova P1-01)

- 4º teste: "passou", mas o obtido mostrou bug de código na checagem do usuário sem função: o resultado do login era usado como cliente ((intermediate value).collection is not a function) e o catch continuava contando falha como sucesso. Critério agora PROVADO no servidor: login do sem-função OK (200) e leitura dele = 0 registros (curl com token próprio).
- Correção: checagem separa login da leitura; qualquer falha na checagem agora marca a prova como FALHA (não passa por acidente). Publicado v0.0.9 (ref 77dd470), QA 100% verde.
- Pendência: 5º teste humano para a evidência honesta de fechamento.

## 13/10/2026 — task 7805f88a CONCLUÍDA

- 5º teste humano aprovado pelo champion (print com as 3 checagens verdadeiras: sem login 0, sem função 0, gestão 1+, massa apagada). Versão testada = publicada (77dd470).
- Verificação independente completa: versão no ar conferida, migrations 0001/0002 applied, critério provado também por API no servidor (login 200 + leitura 0 registros), QA 100% verde, zero API externa, sem segredo novo.
- Task e subtask marcadas [x] em 04_fase-atual/fase.md. 2/49 cards da fase 1 concluídos.
