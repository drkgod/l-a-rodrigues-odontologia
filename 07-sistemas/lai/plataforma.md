# Lai (central de agendamento da unidade piloto) — plataforma de construção

- plataforma: Skip
- projeto_id: 65741
- url_producao: https://projeto-lai-19327.goskip.app
- url_preview: https://projeto-lai-19327--preview.goskip.app
- versao_aplicada: eb44acb (v0.0.60)
- versao_publicada: eb44acb em 2026-10-17T14:08:50Z
- ultima_task: 35bff70c (ficha do paciente) — publicada, aguardando teste humano
- espelho: `codigo/` guarda a última versão de cada arquivo alterado pelas tasks. É cópia de
  consulta; a fonte executável é o Skip. Nunca edite o espelho para mudar o sistema.

## Histórico de entregas

| Data | Task | Versão publicada | Arquivos alterados |
|---|---|---|---|
| 19/10/2026 | 8421e27b | 6a79d2f (v0.0.79) | Planejar.tsx, duracao_sugerir.js, planejamento.ts |
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
| 13-14/10 | 5b3fe9b6 | e43abd9 (v0.0.37) | src/pages/Horarios.tsx, src/services/horarios.ts, src/App.tsx, src/components/Layout.tsx |
| 14/10 | 8d76cea5 | 3297f6a (v0.0.39) | migrations 0009/0010, hook leads_regras.js, service leads.ts, tela Leads.tsx, Provas.tsx, provas.ts, App.tsx, Layout.tsx |
| 14/10 | 8d76cea5 (debug teste humano) | 414e0e6 (v0.0.40) | src/pages/Leads.tsx (import criarLead) |
| 15/10 | 6d5de2f5 (agrupar/validar sem regra) | e442ea4 (v0.0.41) | migration 0011, service planejamento.ts, tela Planejar.tsx, service provas.ts (P2-05), tela Provas.tsx |
| 16/10 | 6d5de2f5 (debug teste humano — P2-05 imune a resíduo) | d9a5e12 (v0.0.42) | service provas.ts (asserção por ids da própria prova) |
| 16/10 | 55a359b0 (lista pacientes a agendar) | 0ce4ea1 (v0.0.46) | migration 0012, hook pendencias_regras.js, service pendencias.ts, tela PacientesAgendar.tsx, App.tsx, Layout.tsx, provas.ts (P3-04/05/06/11), Provas.tsx |
| 16/10 | 5bcfa6f1 (lista confirmação do dia) | 15579f4 (v0.0.49) | hook confirmacao_regras.js (rota lista-dia), service confirmacao.ts (gerarListaDia/dividirSaidas/exportarXlsx), tela Confirmacoes.tsx, App.tsx, Layout.tsx, provas.ts (P4-01/02), Provas.tsx, package.json (xlsx) |
| 16/10 | fdca5fb0 (desvios de duração) | b6e4f44 (v0.0.52) | migration 0013, hook duracao_sugerir.js (+4 rotas), service planejamento.ts, tela Planejar.tsx, provas.ts (P2-05b/06), Provas.tsx |
| 16/10 | fdca5fb0 (debug 1 — provas via rota) | bc5d3c8 (v0.0.53) | hook duracao_sugerir.js (grava planejado), provas.ts (P2-05b/06 via rota) |
| 16/10 | fdca5fb0 (debug 2 — getBoolean→getInt) | 3b817d9 (v0.0.54) | hooks duracao_sugerir.js e confirmacao_regras.js |
| 16/10 | fdca5fb0 (debug 3 — dedup por hash aceito) | ff39792 (v0.0.55) | provas.ts (criarTabelaTesteP2 aceita ja_aplicado) |
| 16/10 | f124df8f (resposta + cobertura de ligação) | ced239c (v0.0.56) | migration 0014 (config_turno_ligacao), hook confirmacao_regras.js (turno/responsavel na lista-dia), confirmacao.ts (ConfigTurno), Confirmacoes.tsx (ações + cards), provas.ts (P4-03/03b), Provas.tsx |
| 17/10 | f124df8f (debug 1-3: Value must be unique, massa idempotente, getString) | f3996b8 (v0.0.57) / 1595728 (v0.0.58) / f4d3b7b (v0.0.59) | hook confirmacao_regras.js (lista-dia sem filtro teste), confirmacao.ts (massa idempotente), provas.ts (campos diretos) |
| 17/10 | 35bff70c (ficha do paciente) | eb44acb (v0.0.60) | hook ficha_regras.js (evento + próxima ação), service ficha.ts, tela Ficha.tsx, App.tsx (rotas /ficha), Layout.tsx (menu Fichas), provas.ts (P3-09a/b), Provas.tsx |
| 2026-10-17 | f79847a5 | b0ad515 (v0.0.69) | hook liberacoes_conciliar, migration 0015, Confirmacoes, Importar, Provas.tsx, confirmacao.ts, provas.ts |
| 20/10/2026 | eec75533 | 11f8bef (v0.0.82) | migration 0016, leads_regras.js (fase→etapa), leads.ts (xlsx), Leads.tsx (importar .xlsx) |
| 20/10/2026 | d03a15ee + d45e8f8a | 776ca31 (v0.0.87) | hook leads_acompanhamento.js, migration 0017, leads.ts, Leads.tsx, provas.ts (P3-07), Provas.tsx |
| 20/10/2026 | d03a15ee (fix data_entrada + backfill) | 9b843b1 (v0.0.88) | migration 0018, leads_regras.js (data_entrada), leads_acompanhamento.js (relatório usa data_entrada) |

## Regras da plataforma

- Fonte executável: Skip (projeto 65741). O espelho `codigo/` é cópia de consulta — nunca editar o espelho para mudar o sistema.
- Todo commit no GitHub lista a versão Skip publicada correspondente (coluna "Versão publicada").
- Provas executam contra o sistema real e gravam resultado em provas_execucoes; massa de teste sempre teste=true e apagada no fim.
- Nada de segredos/credenciais nos arquivos do repositório.
