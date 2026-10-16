# Controle de aprendizado contínuo

Padrões e lições capturados durante a execução das tasks. Um padrão = uma linha, com a task de origem.

## Skip / JSVM / PocketBase

- 13/10 (7805f88a): PocketBase ao NEGAR listagem devolve 200 com lista VAZIA (nunca 401/403 na listagem) — prova de acesso certa é "anônimo vê 0 registros", não "esperar erro".
- 13/10 (7805f88a): cliente PocketBase no browser HERDA a sessão do navegador (LocalAuthStore) — "anônimo" lia como admin. Cliente de prova SEMPRE com BaseAuthStore em memória.
- 13/10 (7805f88a): seed dentro de migration JÁ APLICADA não roda de novo — seed novo = migration NOVA; e "Failed to authenticate" no catch não é sucesso: checagem tem que provar login 200 + leitura 0.
- 13/10 (a9f9e30e): função top-level no callback de hook dá 500 no JSVM — toda lógica INLINE no callback.
- 13/10 (a9f9e30e): toasts do template Skip não renderizam — feedback de prova/banner fixo na página (React puro).
- 13/10 (a9f9e30e): "agora" em UTC quebra gate por dia civil do Brasil (ligação 14/10 UTC lida como 13/10) — passar feita_em explícito em prova com data.
- 13/10 (097ff6ce): JSON.parse de campo de texto quebrado derruba o React (tela branca) — parse defensivo (try/catch) em qualquer campo JSON da coleção.
- 13/10 (097ff6ce): dropdown de grupo precisa unir os NOMES dos procedimentos do grupo (COMBO 4 SISOS) — o usuário não conhece o código interno do grupo.
- 13/10 (1f4de19d): PocketBase rejeita string vazia em campo number — omitir o campo no cliente quando vazio.
- 13/10 (1f4de19d): validação numérica no SERVIDOR (Number.isFinite) — CSV desalinhado não pode gravar NaN como duração.
- 13/10 (f4982b80): variável nova no parser do hook exige whitelist (sempre) — regra por dentista com variável fora da whitelist é rejeitada com motivo (não falha silenciosa).
- 14/10 (5b3fe9b6): fim aberto em horário ("16h") não pode virar vaga infinita — assumir fim padrão e registrar a suposição pro dono conferir (Leonel: 16h→18:00).
- 14/10 (8d76cea5): migration com relation para coleção criada NA MESMA migration falha ("The relation collection doesn't exist") — coleções primeiro, relações cruzadas em migration seguinte (0009/0010).
- 14/10 (8d76cea5): função importada mas NÃO listada no import da tela = build passa e quebra SÓ no clique (criarLead is not defined). Ao criar tela nova, conferir que TODO símbolo usado está no import — TS não pega uso dentro de closure. Fluxo real no navegador depois de publicar é a prova mínima (5 cliques: criar, duplicado, cancelar, etapa).
- 14/10 (8d76cea5): teste E2E por API deve criar massa com teste=true e limpar por telefone/nome (não só teste=true) — lead criado por rota sem teste=true fica "real" no banco e contamina a próxima prova.
- 16/10 (6d5de2f5): prova que lê coleção INTEIRA quebra com resíduo de execuções anteriores ("agrupamento inesperado: 3 grupos" com 50 execuções registradas) — a prova deve agrupar EXATAMENTE os ids que ela mesma criou (a rota devolve o id) e limpar resíduo antes de montar a massa. Teste humano pegou o que o QA não viu.
- 16/10 (6d5de2f5): create_or_update_file no GitHub pode gravar arquivo TRUNCADO sem erro na resposta (22KB de 48KB) — conferir size/blob SHA pós-push e reparar com push_files.
