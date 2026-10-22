// Emenda CA-SEQ-04 — conclusão e reabertura de etapas do plano (SPEC-1-003).
// SÓ o avaliador ATRIBUÍDO registra conclusão (com fonte) ou reabre (com motivo).
// Agendada não é concluída e financeiro não libera: NADA além destas rotas muda
// estado_etapa (integração com agendamento fica no CA-SEQ-06). Conclusão não muda
// versão/estado do plano — é execução, não edição do plano. Eventos append-only.
// Lógica INLINE no callback (lição JSVM: função top-level não carrega no pod).