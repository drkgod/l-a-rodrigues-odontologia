# Aprendizado contínuo — controle

## 13/10/2026 — task 7805f88a (base da unidade piloto)

- **Sinal reutilizável**: `skip_project_apply_changes` recusa mensagem de commit acima de 120 caracteres — escrever a mensagem já no formato curto `task <ID>: <resumo>`. Evidência: erro -32602 "expected string to have <=120 characters" na 1ª tentativa, sucesso na 2ª com mensagem encurtada.
- **Sinal reutilizável**: `skip_project_create` falha com "Unknown error" sem `orgId` explícito; passar `orgId` da organização resolve. Evidência: 2 falhas seguidas e sucesso com orgId 19751.

## 13/10/2026 — debug da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (PocketBase/Skip)**: regra de acesso que NEGA uma listagem devolve HTTP 200 com lista vazia — nunca 401/403. Provas de acesso devem medir "0 registros lidos" (e conferir contagem com massa de teste), não esperar erro. Evidência: curl anônimo em /api/collections/profissionais/records = 200 {"items":[],"totalItems":0}; prova original esperava exceção e falhava sempre.

## 13/10/2026 — debug 2 da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (PocketBase SDK browser)**: `new PocketBase(url)` SEM store explícito herda a sessão do navegador (LocalAuthStore compartilhado por origem) — um cliente "anônimo" criado num site onde o usuário está logado lê COMO o usuário logado. Provas/verificações de acesso no navegador devem usar `new PocketBase(url, new BaseAuthStore())` (store em memória). Evidência: 2º teste humano "sem login leu 1 registro(s)" com admin logado na aba.
- **Sinal reutilizável (SDK 0.26.x)**: `PocketBase` é export DEFAULT — `import { PocketBase }` quebra o build (MISSING_EXPORT); usar `import PocketBase from 'pocketbase'`. Evidência: QA do Skip v0.0.6 falhou no build e pegou o erro antes de publicar.

## 13/10/2026 — debug 3 da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (migrations)**: patch em migration JÁ APLICADA não cria o seed (applied é imutável) — toda mudança de efeito de banco precisa de migration NOVA (ordinal seguinte), mesmo sendo "só um seed". Evidência: semfuncao@lai.local inexistente (400) após debug 2; criado com migration 0002 e login 200.
- **Sinal reutilizável (provas)**: "login falhou" NÃO equivale a "não leu registros" — prova de acesso com usuário de teste deve exigir login OK antes de medir a leitura; senão o teste passa pelo motivo errado (falso positivo). Evidência: 3º teste passou com "Failed to authenticate" na checagem 2.
- **Sinal reutilizável (Skip)**: POST no domínio público goskip.app dá 405 (nginx bloqueia) — testar auth/API sempre no backend interno (*.shrd00.internal.goskip.dev).

## 13/10/2026 — debug 4 da prova P1-01 (task 7805f88a)

- **Sinal reutilizável (SDK PocketBase)**: `authWithPassword` devolve AuthResponse, NÃO o cliente — encadear `.collection()` no resultado quebra ((intermediate value).collection is not a function); guardar o cliente numa variável e usar duas vezes. Evidência: bug na checagem do sem-função na v0.0.8.
- **Sinal reutilizável (provas)**: catch que trata "qualquer erro" como resultado esperado fabrica falso positivo — em prova de acesso, login falho e leitura falha são estados DIFERENTES: falha de checagem deve marcar a prova como FALHA, nunca contar como "0 registros".

## 13/10/2026 — task c7194c3e (agenda/importação)

- **Sinal reutilizável (JSVM/Skip CRÍTICO)**: `$app.runInTransaction((tx) => {...})` dentro de rota routerAdd TRAVA o pod (timeout sem resposta, sem log de request) — o callback da transação no JSVM não enxerga o escopo do handler (nem `e`, nem variáveis externas). Upsert idempotente por namespace + índice único no banco substitui a transação com segurança. Evidência: 3 timeouts seguidos na v0.0.10; rota viva de primeira na v0.0.11 sem a transação.
- **Sinal reutilizável**: filtro do findRecordsByFilter com aspas duplas DENTRO do valor funciona (ex.: 'origem = "fixture"') — usado nos hooks com concatenação de string.
- **Sinal reutilizável**: validação de lote linha a linha no servidor (validar-lote sem gravar + aplicar-lote revalidando) manteve o padrão "a tela não manda em regra" — rejeição com motivo testada em produção.

- **Sinal reutilizável**: botão que chama a rotina de prova DIRETO executa mas não registra nem mostra — toda prova deve passar pelo fluxo executar→registrar→recarregar tabela (o dono vê o resultado; sem isso parece que "não acontece nada").
- **Sinal reutilizável**: PATCH que insere funções por âncora pode mudar a ORDEM das declarações e duplicar identificadores — o QA (lint/build) pega "already been declared" ANTES de publicar; e remover função referenciada no JSX derruba a tela em branco SEM erro no build (caso limpar). Sempre re-ler o arquivo inteiro após 2+ patches na mesma região.
- **Sinal reutilizável**: contrato entre rotas — validar-lote devolve linhas com RELAÇÃO RESOLVIDA (ID), aplicar-lote revalidava por NOME: mapa de resolução deve aceitar ID ou nome nos dois lados (caso P1-02 = 0 itens).

## 13/10/2026 — fechamento c7194c3e

- **Sinal reutilizável (UI)**: seletor renderizado sem estado/onChange (defaultValue) é campo decorativo — o checklist de UI da verificação final deve conferir que TODO filtro altera a lista (achado no fecho; corrigido na v0.0.16).
- **Sinal reutilizável (processo)**: snapshot do navegador não vê o DOM do app (SPA em root) — para depurar telas, usar eval com contagens de botões/inner-text e performance entries; root vazio + bundle novo = crash de runtime na tela (caso limpar).

## 13/10/2026 — task 1f4de19d (tabela de duração)

- **Sinal reutilizável (PocketBase)**: string VAZIA em campo number dá "The submitted number is not properly formatted" no create via SDK — o cliente deve omitir a chave (delete) quando vazia; o hook aceita ausente e converte para 0/sem-regra.
- **Sinal reutilizável (validação)**: `Number(x) <= 0` deixa NaN passar (NaN <= 0 = false) — usar `!Number.isFinite(Number(x)) || Number(x) <= 0` em validação de número que veio de texto (CSV). Caso: "PRC074" virou duração e passou na 1ª versão do hook.
- **Sinal reutilizável (debug)**: interceptar window.fetch no navegador mostrou o payload REAL da prova — achou CSV desalinhado (10 colunas vs 11 do cabeçalho) que a leitura do código não pegou; payload capturado > hipótese.
- **Sinal reutilizável (fontes)**: planilha do Drive era base estruturada (abas db_) — consultar o conteúdo ANTES de pedir documento (AGENTS.md) evitou pedido desnecessário; inventário registrado em fontes-do-projeto.md com estado lido/localizado.

## 13/10/2026 — fechamento 1f4de19d (tabela de duração)

- **Sinal reutilizável (provas x dado real)**: rotina de limpeza de prova que apaga "todas as tabelas" destrói dado REAL do usuário (caso: importação das 22 regras sumiu após o teste do champion). Limpeza de prova deve filtrar por marcador (teste=true) ou apagar só o que criou (ids conhecidos) — nunca "apagar tudo da coleção".
- **Sinal reutilizável (regra de ouro)**: dado real criado pelo usuário durante o teste humano faz parte do estado aprovado — restaurá-lo (reimportar + ativar) antes de concluir, e o teste da prova seguinte deve provar que o dado real sobrevive.

## 13/10/2026 — task f4982b80 (tabela por dentista)

- **Sinal reutilizável (whitelist viva)**: toda variável nova que o formato real do cliente traz (ex.: `sempre` = regra incondicional por dentista) precisa entrar na whitelist do importador ANTES da importação de produção — a 1ª rodada rejeitou 2 regras válidas por whitelist fechada. Evidência: rejeitadas: 2 na 1ª importação; 27/27 após fix.
- **Sinal reutilizável (dimensão opcional)**: campo opcional "profissional" (vazio = vale para todos) adicionado com TextField em coleção existente (col.fields.add) — padrão do guia; regras por dentista EXIGEM duração (validação nova no hook).
- **Sinal reutilizável (ativação)**: aprovar tabela de teste da prova DESATIVA a tabela real (só 1 ativa) — após provas com dado real presente, REATIVAR a versão real (feito: v2 ativa de novo).

## 13/10/2026 — debug f4982b80 (P1-08 no teste humano)

- **Sinal reutilizável (provas)**: prova que cria registro em OUTRA origem (manual) deve apagar ele no fim — limpeza que varre só uma origem (fixture) deixa sobra de teste no banco (caso P1-08). Limpeza por marcador (teste=true) cobre todas as origens.
- **Sinal reutilizável (diagnóstico)**: "Failed to create record." com índice único composto correto + não-reproduzível depois = suspeitar de pod velho do LB ANTES de reescrever código; provar o comportamento no banco (2 registros coexistindo) fecha a cadeia causal.

- 13/10/2026 · 097ff6ce · Padrões reutilizáveis: (1) JSVM do Skip: função top-level referenciada dentro de callback de routerAdd dá 500 "Something went wrong" em produção (QA passa) — lógica inline no callback; (2) PocketBase devolve campo JSON PARSEADO (array) no SDK — tipar como array|string e renderizar com guarda, senão o React derruba a tela (tela branca); (3) filtro do SDK: usar pb.filter (com aspas) — interpolação crua com aspas duplas quebra a query; (4) entidade de teste marcada com flag "teste" precisa do campo em TODAS as coleções da massa (migration aditiva), senão limpeza e seleção falham em silêncio; (5) dropdown de grupos da tabela: unir os "aplica_a" distintos do grupo no rótulo (regra de grupo e por dentista têm nomes diferentes).
