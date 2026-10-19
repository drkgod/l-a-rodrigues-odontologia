## Debug Summary
**Task e problema:** f79847a5 — "Mover não respondentes" não levava ninguém pra lista de ligação quando a resposta registrada era "Sem resposta" (teste humano do dono, 19/10 00h07, massa do dia 20/10).
**Reprodução:** massa de teste (3 contatos com "Sem resposta" + 1 pendente) → clicar "Mover não respondentes" → movidos=0, lista de ligação vazia.
**Causa raiz:** hook confirmacao_regras.js, rota mover-nao-respondentes, filtro `estado = "mensagem_enviada"` — o estado `sem_resposta` (resposta registrada pelo botão "Sem resposta") ficava de fora.
**Correção:** filtro agora é `estado = "mensagem_enviada" || estado = "sem_resposta"` (CA-1-19/RN-04: quem não respondeu vai pra lista de ligação). QA verde, publicado v0.0.70 (2a073cf) e reproduzido no navegador: os 3 contatos apareceram na lista com responsável "a definir" (cobertura não cadastrada — alerta correto).
**Verificação automática:** QA verde (setup/static/build/integrations); reprodução no ar ok.
**Situação:** aguardando teste humano
