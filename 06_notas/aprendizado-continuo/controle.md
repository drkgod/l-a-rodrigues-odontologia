# Aprendizado contínuo — controle

## 13/10/2026 — task 7805f88a (base da unidade piloto)

- **Sinal reutilizável**: `skip_project_apply_changes` recusa mensagem de commit acima de 120 caracteres — escrever a mensagem já no formato curto `task <ID>: <resumo>`. Evidência: erro -32602 "expected string to have <=120 characters" na 1ª tentativa, sucesso na 2ª com mensagem encurtada.
- **Sinal reutilizável**: `skip_project_create` falha com "Unknown error" sem `orgId` explícito; passar `orgId` da organização resolve. Evidência: 2 falhas seguidas e sucesso com orgId 19751.
- Sem outros sinais reutilizáveis nesta task: o fluxo migration → serviços → contexto → telas → rotas seguiu o plano aprovado sem desvio, e o QA passou de primeira.
