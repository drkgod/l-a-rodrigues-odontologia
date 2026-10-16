# AP-2026-10-16-1940 — Provas TDD que criam massa idempotente precisam aceitar dedup por hash

- Status: candidato
- Escopo: projeto do cliente (Lai, Skip 65741)
- Task/SPEC: fdca5fb0 (SPEC-1-002, CA-1-10/11); debug 3 em 06_notas/debug/debug-2026-10-16-p2-05b-massa-p2-0-regras.md
- Sinal: prova que roda mais de uma vez e cria massa por importação falha na 2ª execução quando exige "gravadas === N": o dedup por hash do hook devolve ja_aplicado=true com 0 gravadas (comportamento correto, provado pela prova de idempotência P2-08).
- Evidência: print do dono (P2-05b "massa P2: 0 regras"); hook duracao_importar_tabela.js (dedup por arquivo_hash); fix em provas.ts (aceita ja_aplicado); QA verde v0.0.55.
- Regra reutilizável: prova que prepara massa via importação deve aceitar "já existe" (ja_aplicado) além da criação — o que importa é TER a massa, não gravar de novo; exigir contagem de gravação só na prova que valida a importação em si.
- Quando aplicar: qualquer prova TDD re-executável que cria massa por rota com dedup (tabelas, pendências, lotes).
- Quando não aplicar: prova que valida a importação em si (ali a contagem de gravadas é o objeto da prova).
- Confiança: alta — causa raiz confirmada em 3 rodadas de teste humano e fix provado.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
