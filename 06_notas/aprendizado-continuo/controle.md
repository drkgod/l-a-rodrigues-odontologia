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
- 2026-10-16T19:40:00-03:00 · task fdca5fb0 · capturado · 06_notas/aprendizado-continuo/AP-2026-10-16-1940-prova-massa-dedup-hash.md (prova re-executável aceita ja_aplicado do dedup por hash)
- 17/10 (f124df8f): record do SDK JS do PocketBase é objeto plano — no navegador leia campo direto (contato.estado), nunca .getString()/.getBool() (API do servidor); QA/TS não pega (objeto any) — teste humano pegou.
- 17/10 (c9b95987): housekeeping de fase/estado só existe depois do commit — correção gravada só no disco se perde no reset do clone; toda alteração de registro sai no próximo commit do fluxo.
## 2026-10-19 — task 8421e27b + debug f79847a5 rev.3-6
- **Padrão 1 (JSVM, evidência: rev.5 provado no ar)**: `findFirstRecordByFilter(colecao, filtro)` aceita só 2 argumentos nesta versão — um 3º argumento (mesmo vazio) lança erro silencioso capturado por `catch` e o código cai no fallback ("a definir"). Ao usar try/catch em busca de configuração, registrar o erro real no catch durante o desenvolvimento (`console.log(_)`) e provar via API antes de publicar.
- **Padrão 2 (pod do Skip, evidência: rev.4)**: hook existente pode não recarregar após apply+publish (mesmo sintoma do caso P4-06). Solução definitiva quando o comportamento não muda: mover a rota para ARQUIVO NOVO (pod fresco garantido) e apontar o serviço para a rota nova; manter a rota antiga corrigida para navegadores com bundle em cache.
- **Padrão 3 (prova de bundle, evidência: 8421e27b)**: para provar que o bundle publicado é o novo sem depender de cache do navegador, buscar as strings novas no JS servido (`/assets/index-*.js`) via fetch no navegador — 2 strings novas presentes = bundle no ar.
## 2026-10-19 — task 8421e27b (fechamento)
- **Padrão 4 (matcher de regras, evidência: rev.2 provada via API)**: matcher com casamento "inverso" (espelhar q1↔q2 entre variáveis) casa regra errada quando as duas variáveis são da mesma natureza numérica (implantes × extrações). Regra da casa: casamento só direto (v1×q1, v2×q2); combinação sem regra → "sem_regra" e lista pra direção validar — nunca espelhar valores.
- **Padrão 5 (config zerada, evidência: config_unidade duracao_avaliacao_minutos=0)**: campos de config com default 0 no schema precisam de seed explícito; o código já trata 0 como "usar default da regra" (30/2), mas gravar o valor real da CL-004 na config evita divergência entre telas. Gravado 30/2 via PATCH em 19/10.
- **Padrão 6 (regime de agendamento, evidência: rev.3 aprovada)**: regime (avaliação × tratamento) é escolha do formulário com default pela agenda do profissional — não deduzir só do cadastro; avaliação é consulta fixa (sem procedimento/tabela).
## 2026-10-19 — task 84b8f8d6
- **Padrão 7 (política por turno, evidência: prova P4-14 pegou o bug)**: várias políticas do mesmo dia/profissional/tipo (manhã × tarde) — o gate deve escolher a que COBRE a hora (turno_inicio <= hora < turno_fim), não a primeira; fallback = primeira candidata.
- **Padrão 8 (vínculo por nome, evidência: Erika FALHOU → PASSOU)**: política com profissional_nome divergente do cadastro ("Erika" vs "Dra. Erika") nunca casa — normalizar o vínculo por nome exato ao ativar políticas; preferir vínculo por id.
- **Padrão 9 (unidade de origem, evidência: gate nunca casava ITA/ALC)**: unidade da política é metadado de origem; central piloto única aceita políticas de qualquer origem (pendentes continuam fora pelo filtro situacao=ativa).
