# Análise — Task 097ff6ce "Mostrar o tempo sugerido ao planejar um agendamento" (+ subtask 6d5de2f5)

- SPEC: 04_fase-atual/specs/spec-1-002-duracao-sugerida.md · Critérios: CA-1-08 e CA-1-09 · Provas P2-01..P2-04
- Recorte mínimo: rota de sugestão + tela de planejamento (consulta) + lista "Casos sem regra" + provas P2-01..04.
- FORA deste recorte (ficam para a task fdca5fb0): desvios com motivo (P2-05/06), vínculo reserva↔planejamento, coleção desvios_duracao.

## Estado real (inspeção v0.0.30, 13/10)
- Tabela real ATIVA: tabela_duracao v2 (27 regras, hash da artifacts/tabela-duracao-v2.csv, aprovada 13/10). regras_duracao: grupo_regra, aplica_a, variavel_1/min/max, variavel_2/min/max, duracao_min, procedimentos, observacao, profissional, origem, teste.
- config_unidade: arredondamento_min = 5 (UNIDADE-DEMO).
- Módulo de consulta da SPEC-1-004 já existe: POST /backend/v1/capacidade/verificar (hook confirmacao_regras.js) — a SPEC-1-002 manda CONSULTAR, não copiar.
- agenda_itens vazio (0); profissionais: 24 resíduos de teste ("Profissional Teste P4/P4B/P4C/P4D") das provas P4 — a coleção profissionais NÃO tem campo `teste`, a limpeza por marcador não os achou (achado; serão apagados por nome LIKE "Profissional Teste%" na implementação — 100% massa de teste, nenhum profissional real cadastrado).
- Serviços/telas existentes: provas.ts (padrão de prova + banner), agenda.ts (dia/profissional), duracao.ts (importar/aprovar/listar).

## Plano em código (ordem migration → hook → serviço → página → rota/menu)
1. **Migration 0006** — coleção `planejamentos`: profissional (text), itens (json), minutos_sugeridos (number, 0 p/ sem_regra), minutos_brutos (number, 0), situacao (select: sugerido|sem_regra), regra_aplicada (json), crc (text), teste (bool). Regras: list/view autenticado; create fechado (hook grava via $app.save); update/delete gestão. Migration só aditiva — sem risco de dados.
2. **Hook `pocketbase/hooks/duracao_sugerir.js`** — rota POST /backend/v1/duracao/sugerir (requireAuth):
   - entrada: { itens: [{ grupo_regra, quantidade }], profissional, teste? }
   - tabela: teste=true → última tabela_duracao teste=true; senão → a ATIVA. Sem tabela → sem_regra.
   - 1 item → casa regras do grupo (específica do profissional prevalece — decisão do dono 13/10 18h16; regra "sempre" = incondicional; faixas min/max com vazio = infinito). Nenhum casamento → sem_regra.
   - >1 item → sem_regra (combinação sem regra aprovada — nunca somar; regra do dono e CA-1-09).
   - arredonda para CIMA no múltiplo arredondamento_min (5). Grava registro em planejamentos (com teste do contexto). Devolve { situacao, minutos, minutos_brutos, arredondamento, regra_aplicada, origem_tabela, capacidade_validada } — capacidade_validada = existe política ATIVA do tipo tratamento (consulta server-side ao módulo da SPEC-1-004; pendente → tela mostra "referência").
3. **Service `src/services/planejamento.ts`** (novo): sugerirDuracao(itens, profissional, teste?) → rota; listarGruposDisponiveis() (regras da tabela ativa, grupos distintos) p/ o dropdown; listarPlanejamentos() p/ a lista de casos sem regra.
4. **Página `src/pages/Planejar.tsx`** (rota /planejar, menu "Planejar agendamento"): formulário Profissional + Procedimento + Quantidade (+ "adicionar item" para combinação) + Data; card resultado "40 min (regra: coroas 3–4, Dra. X)" ou "Sem regra — validar com a direção"; vagas do dia do profissional onde o tempo cabe (dados existentes da agenda) com nota "Capacidade: política de agenda pendente — vagas como referência" quando capacidade_validada=false; aba gestão-only "Casos sem regra" (planejamentos situacao=sem_regra).
5. **Provas P2-01..P2-04** em src/services/provas.ts (bloco SPEC-1-002, com tabela de teste do TDD: A 1–2=30/3–4=40; B 1–2=25/3–4=35; arred 5) + botões em Provas.tsx com o banner de resultado já existente. Provas usam tabela teste=true SEM aprovar (a real v2 nunca é desativada). Limpeza: apaga tabela/regras/planejamentos/profissionais teste=true + resíduos "Profissional Teste%".
6. **Menu/rota**: App.tsx (/planejar) + Layout.tsx (grupo Agenda, item "Planejar agendamento", todos os papéis com função).

## Tipos (planejamento.ts)
interface ItemSugestao { grupo_regra: string; quantidade: number }
interface ResultadoSugestao { situacao: 'ok'|'sem_regra'; minutos: number; minutos_brutos: number; arredondamento: number; regra_aplicada: {grupo_regra, aplica_a, faixa_1, faixa_2, profissional, observacao}|null; origem_tabela: string; capacidade_validada: boolean; planejamento_id: string }
interface Planejamento { id, profissional, itens, minutos_sugeridos, situacao, regra_aplicada, crc, teste, created }

## Teste de mesa (regra de negócio — rota sugerir)
| Entrada | Tabela | Saída esperada |
|---|---|---|
| 2 coroas, Prof A | teste (1–2=30 A; grupo 1–2=30) | ok · 30 min · regra A (específica) |
| 4 coroas, Prof A | teste | ok · 40 min (3–4=40) |
| 2 coroas, Prof B | teste | ok · 25 min (específica prevalece sobre o grupo) |
| 4 coroas, Prof B | teste | ok · 35 min |
| 4 coroas, sem profissional | teste | ok · 40 min (regra do grupo) |
| 10 facetas + 1 implante (2 itens) | qualquer | sem_regra (combinação) + caso listado |
| regra 27 min, arred 5 | teste | ok · 30 min (arred para cima) |
| sem tabela ativa | — | sem_regra ("validar com a direção") |

## Matriz critério → prova
- CA-1-08 → P2-01 (30), P2-02 (40), P2-03 (25/35, não linear e específica prevalece) + arredondamento no teste de mesa e exibido na tela quando difere.
- CA-1-09 → P2-04 (sem_regra, sem tempo, caso entra em "Casos sem regra").
- Regressão → P1-01..P1-08 e P2-07/08 re-rodáveis pelos botões existentes; tabela real v2 intocada (provas não aprovam tabela de teste).

## Ficha de Tela — Planejar agendamento (/planejar)
- Quem usa e onde: CRC de agendamento (e gestão); computador e celular.
- Tarefa principal: consultar o tempo sugerido pela tabela da clínica e ver as vagas compatíveis do dia.
- Ação primária: botão "Consultar tempo".
- Padrão: formulário de consulta + resultado em card (padrão formulário; consistente com Importar/Agenda).
- Dados: Profissional (select → profissionais.nome) · Procedimento/grupo (select → grupos da tabela ativa) · Quantidade (number ≥1) · Data (date) → resultado: minutos + regra + vagas.
- Ações e permissões: consultar = qualquer logado com função (requireAuth na rota); "Casos sem regra" = gestão (SomenteGestao).
- Estados: carregando · vazio de primeiro uso (sem versão ativa → aviso claro) · erro com saída (mensagem PT-BR + tentar novamente) · sucesso (card com tempo e regra) · sem permissão (SomenteGestao → /sem-acesso).
- Celular: formulário empilha em coluna única; resultado full-width.
- Acessibilidade: labels em todos os campos; resultado anunciado (role=status); contraste dos badges.
- Textos: "Tempo sugerido" · "Sem regra — validar com a direção" · "Vagas compatíveis (referência)" · "Capacidade: política de agenda pendente".

## Riscos
- Provas desativarem a tabela real se usarem aprovar-tabela → MITIGADO (teste=true sem aprovação; limpeza própria).
- Resíduos P4 no dropdown → limpeza incluída (nome LIKE "Profissional Teste%").
- Pods velhos atrás do LB após publish (padrão Skip) → re-testar antes de reescrever.
- Linha vermelha: nenhuma (sem dado pessoal novo; planejamento grava só profissional/itens/minutos).

## Decisões
- Nenhuma bloqueante: arredondamento 5 já em config; específica prevalece (decisão 18h16); tabela v2 ativa.
- Recorte assumido: "vagas compatíveis" = agenda do dia do profissional com os horários em que o tempo cabe, exibidas como REFERÊNCIA enquanto a política de agenda (SPEC-1-004) estiver pendente — conforme a própria SPEC (cálculo como referência; oferta/conclusão só com política ativada).

## Verificação automática e teste humano
- Automática: E2E das provas P2-01..P2-04 via API (servidor), P1 re-rodada, QA 100% verde, versão publicada = testada.
- Humano (SPEC): planejar 2 e 4 coroas com dois dentistas conferindo os tempos; planejar combinação fora da tabela; conferir "Casos sem regra". Evidência: "testei, pode seguir" no card.
