# Aprendizado contínuo — controle

## 13/10/2026 — task 7805f88a (base da unidade piloto)

- **Sinal reutilizável**: `skip_project_apply_changes` recusa mensagem de commit acima de 120 caracteres — escrever a mensagem já no formato curto `task <ID>: <resumo>`. Evidência: erro -32602 "expected string to have <=120 characters" na 1ª tentativa, sucesso na 2ª com mensagem encurtada.
- **Sinal reutilizável**: `skip_project_create` falha com "Unknown error" sem `orgId` explícito; passar `orgId` da organização resolve. Evidência: 2 falhas seguidas e sucesso com orgId 19751.
- Sem outros sinais reutilizáveis nesta task: o fluxo migration → serviços → contexto → telas → rotas seguiu o plano aprovado sem desvio, e o QA passou de primeira.

## 13/10/2026 — debug da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (PocketBase/Skip)**: regra de acesso que NEGA uma listagem devolve HTTP 200 com lista vazia — nunca 401/403. Provas de acesso devem medir "0 registros lidos" (e conferir contagem com massa de teste), não esperar erro. Evidência: curl anônimo em /api/collections/profissionais/records = 200 {"items":[],"totalItems":0}; prova original esperava exceção e falhava sempre.

## 13/10/2026 — debug 2 da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (PocketBase SDK browser)**: `new PocketBase(url)` SEM store explícito herda a sessão do navegador (LocalAuthStore compartilhado por origem) — um cliente "anônimo" criado num site onde o usuário está logado lê COMO o usuário logado. Provas/verificações de acesso no navegador devem usar `new PocketBase(url, new BaseAuthStore())` (store em memória). Evidência: 2º teste humano "sem login leu 1 registro(s)" com admin logado na aba.
- **Sinal reutilizável (SDK 0.26.x)**: `PocketBase` é export DEFAULT — `import { PocketBase }` quebra o build (MISSING_EXPORT); usar `import PocketBase from 'pocketbase'`. Evidência: QA do Skip v0.0.6 falhou no build e pegou o erro antes de publicar.

## 13/10/2026 — debug 3 da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (migrations)**: patch em migration JÁ APLICADA não cria o seed (applied é imutável) — toda mudança de efeito de banco precisa de migration NOVA (ordinal seguinte), mesmo sendo "só um seed". Evidência: semfuncao@lai.local inexistente (400) após debug 2; criado com migration 0002 e login 200.
- **Sinal reutilizável (provas)**: "login falhou" NÃO equivale a "não leu registros" — prova de acesso com usuário de teste deve exigir login OK antes de medir a leitura; senão o teste passa pelo motivo errado (falso positivo). Evidência: 3º teste passou com "Failed to authenticate" na checagem 2.
- **Sinal reutilizável (Skip)**: POST no domínio público goskip.app dá 405 (nginx bloqueia) — testar auth/API sempre no backend interno (*.shrd00.internal.goskip.dev).
