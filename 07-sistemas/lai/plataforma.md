# Lai (central de agendamento da unidade piloto) — plataforma de construção

- plataforma: Skip
- projeto_id: 65741
- url_producao: https://projeto-lai-19327.goskip.app
- url_preview: https://projeto-lai-19327--preview.goskip.app
- versao_aplicada: 45af710 (v0.0.26)
- versao_publicada: 45af710 em 2026-10-14T00:10:45Z
- ultima_task: a9f9e30e (em teste humano — provas P4-04/05/07)
- espelho: `codigo/` guarda a última versão de cada arquivo alterado pelas tasks. É cópia de
  consulta; a fonte executável é o Skip. Nunca edite o espelho para mudar o sistema.

## Histórico de entregas

| Data | Task | Versão publicada | Arquivos alterados |
|---|---|---|---|
| 13/10/2026 | a9f9e30e (regras confirmação/liberação — gates CA-1-20/21) | 45af710 | migration 0006, hook confirmacao_regras.js, service confirmacao.ts, provas P4-04/05/07 |
| 13/10/2026 | 1f4de19d (tabela de duração — importar/aprovar) | 9d1e3f1 | migration 0004, hooks duracao_importar/aprovar, service duracao, tela TabelaDuracao, provas P2-07/08 |
| 13/10/2026 | c7194c3e (concluída — filtro de cadeira) | 3dd018e | src/pages/Agenda.tsx |
| 13/10/2026 | c7194c3e (debug 4 rodadas — provas/tela/ID-nome) | 8fd29a2 | Provas.tsx, agenda_aplicar_lote.js |
| 13/10/2026 | c7194c3e (agenda + importação) | 84f34d2 | migration 0003, hooks validar/aplicar-lote, services agenda, telas Importar/Agenda, provas P1-02..08 |
| 13/10/2026 | 7805f88a (debug 4 — checagem honesta) | 77dd470 | src/services/provas.ts |
| 13/10/2026 | 7805f88a (debug 3 — seed semfuncao) | d90570c | migration 0002 |
| 13/10/2026 | 7805f88a (debug 2 prova P1-01) | ee697cf | src/services/provas.ts, migration 0001 (seed semfuncao) |
| 13/10/2026 | 7805f88a (debug prova P1-01) | 5379b64 | src/services/provas.ts |
| 13/10/2026 | 7805f88a (base + acesso por função) | e13e688 | migration 0001, App.tsx, Layout.tsx, AuthContext.tsx, pages (Index/Login/SemAcesso/Provas), services (auth/config/provas) |
