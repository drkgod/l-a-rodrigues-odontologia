// Task 1f4de19d — aprova/ativa uma versão da tabela de duração (só uma ativa por vez)
// ESPELHO parcial (conteúdo completo no Skip v0.0.19, ref 9d1e3f1):
// POST /backend/v1/duracao/aprovar-tabela {tabela_id} (requireAuth) — desativa as outras
// versões ativas, ativa a escolhida com aprovada_por/aprovada_em, devolve { ok, versao, ativa, regras_ativas }.
