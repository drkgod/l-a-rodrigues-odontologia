# Lai (central de agendamento da unidade piloto) — plataforma de construção

- plataforma: Skip
- projeto_id: 65741
- url_producao: https://projeto-lai-19327.goskip.app
- url_preview: https://projeto-lai-19327--preview.goskip.app
- versao_aplicada: c9473ad (v0.0.114)
- versao_publicada: 70507a0 em 2026-10-21T15:40:56Z
- ultima_task: CA-SEQ-06 motor (elegibilidade) — publicada, aguardando teste humano
- espelho: `codigo/` guarda a última versão de cada arquivo alterado pelas tasks. É cópia de
  consulta; a fonte executável é o Skip. Nunca edite o espelho para mudar o sistema.

## Histórico de entregas

| Data | Task | Versão publicada | Arquivos alterados |
|---|---|---|---|
| 21/10/2026 | CA-SEQ-06 (motor elegibilidade) | c9473ad (v0.0.114) | Planejar.tsx (card Elegibilidade), plano.ts |
| 21/10/2026 | CA-SEQ-04 (conclusão/reabertura etapas) | ebd458a (v0.0.113) | plano_regras.js, plano.ts, Ficha.tsx, provas.ts (P3-12) |
| 21/10/2026 | CA-SEQ-03 (editor de etapas) | 7b5c8e9 (v0.0.111) | migration 0021, plano_regras.js, plano.ts, Ficha.tsx, provas.ts (P3-11b) |
| 20/10/2026 | CA-SEQ-02 (modelos de sequência) | 4bd1332 (v0.0.96) | migration 0020, modelos_regras.js, modelos.ts, Modelos.tsx, auth.ts, provas.ts (P3-10) |
| 20/10/2026 | CA-SEQ-01 (avaliador habilitado) | 491e424 (v0.0.94) | migration 0019, tratamento_regras.js, tratamento.ts, Avaliadores.tsx, provas.ts (P3-09c) |
| 20/10/2026 | d03a15ee (fix data_entrada + backfill) | 9b843b1 (v0.0.88) | migration 0018, leads_regras.js, leads_acompanhamento.js |
| 20/10/2026 | d03a15ee + d45e8f8a (lead→comparecimento) | 776ca31 (v0.0.87) | leads_acompanhamento.js, migration 0017, leads.ts, Leads.tsx, provas.ts (P3-07) |
| 20/10/2026 | eec75533 (import leads APP CRC) | 11f8bef (v0.0.82) | migration 0016, leads_regras.js, leads.ts, Leads.tsx |
| 17/10/2026 | f79847a5 (lista de ligação) | b0ad515 (v0.0.69) | liberacoes_conciliar.js, migration 0015, Confirmacoes.tsx, Importar.tsx, confirmacao.ts, provas.ts |
| 17/10/2026 | 35bff70c (ficha do paciente) | eb44acb (v0.0.60) | ficha_regras.js, ficha.ts, Ficha.tsx, App.tsx, Layout.tsx, provas.ts (P3-09a/b) |
| 16/10/2026 | f124df8f (resposta + cobertura) | ced239c (v0.0.56) | migration 0014, confirmacao_regras.js, confirmacao.ts, Confirmacoes.tsx, provas.ts (P4-03/03b) |
| 16/10/2026 | fdca5fb0 (desvios de duração) | b6e4f44 (v0.0.52) | migration 0013, duracao_sugerir.js, planejamento.ts, Planejar.tsx, provas.ts (P2-05b/06) |
| 16/10/2026 | 5bcfa6f1 (lista confirmação do dia) | 15579f4 (v0.0.49) | confirmacao_regras.js, confirmacao.ts, Confirmacoes.tsx, provas.ts (P4-01/02), package.json |
| 16/10/2026 | 55a359b0 (pacientes a agendar) | 0ce4ea1 (v0.0.46) | migration 0012, pendencias_regras.js, pendencias.ts, PacientesAgendar.tsx, provas.ts (P3-04/05/06/11) |
| 15/10/2026 | 6d5de2f5 (agrupar/validar sem regra) | e442ea4 (v0.0.41) | migration 0011, planejamento.ts, Planejar.tsx, provas.ts (P2-05), Provas.tsx |
| 14/10/2026 | 8d76cea5 (leads com origem) | 3297f6a (v0.0.39) | migrations 0009/0010, leads_regras.js, leads.ts, Leads.tsx, provas.ts |
| 13-14/10/2026 | 5b3fe9b6 (horários) | e43abd9 (v0.0.37) | Horarios.tsx, horarios.ts, App.tsx, Layout.tsx |
| 13/10/2026 | 7805f88a (base + acesso por função) | e13e688 | migration 0001, App.tsx, Layout.tsx, AuthContext.tsx, pages, services |

## Regras da plataforma

- Fonte executável: Skip (projeto 65741). O espelho `codigo/` é cópia de consulta — nunca editar o espelho para mudar o sistema.
- Todo commit no GitHub lista a versão Skip publicada correspondente (coluna "Versão publicada").
- Provas executam contra o sistema real e gravam resultado em provas_execucoes; massa de teste sempre teste=true e apagada no fim.
- Nada de segredos/credenciais nos arquivos do repositório.
