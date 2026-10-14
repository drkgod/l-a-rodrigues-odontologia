# Análise — Task 5b3fe9b6 "Montar a tela de agenda e vagas da unidade" (+ 81d10fc4 e b1b67130)

- SPEC: 04_fase-atual/specs/spec-1-001-agenda-da-unidade.md · Critério: CA-1-05 · Prova P1-05 (já existe e PASSED no histórico)
- Subtasks no card: 81d10fc4 (cadastrar horários de cada dentista) e b1b67130 (teste humano com a equipe).

## Achado central da inspeção (v0.0.36)
A TELA JÁ EXISTE: src/pages/Agenda.tsx (task c7194c3e) tem agenda do dia por data/profissional/cadeira, ocupados (APPOINTMENT/ASSIGN/EVENT), agrupamento de visita dividida com alerta, "horário não cadastrado", vagas calculadas por buracos na jornada, badge "Dados importados — sem sincronização". A prova P1-05 (bloqueio nunca vira vaga) já existe em provas.ts e passou no histórico da task c7194c3e.

O QUE FALTA pro critério CA-1-05 fechar COM DADO REAL:
- horarios_profissional: 0 registros — a tela sempre mostra "horário não cadastrado" e 0 vagas pra qualquer dentista real;
- cadeiras: 0 registros — filtro de cadeira vazio;
- 81d10fc4 (cadastrar horários) é a peça que falta: cadastrar os horários REAIS da escala da clínica (CL-001, aba db_horarios_profissionais da planilha do Drive).

## Recorte mínimo (menor recorte completo)
1. **Cadastro de horários (81d10fc4)**: nova tela gestão-only "Horários dos dentistas" (/horarios) — por dentista: lista de blocos dia_semana/inicio/fim com adicionar/remover, salvando em horarios_profissional (create/update/delete já gestão-only). Fonte da digitação: escala CL-001 (aba db_horarios_profissionais, 67 linhas). Também: importação por CSV (dia_semana,inicio,fim,profissional) com prévia/rejeitadas — mesmo padrão da tabela de duração.
2. **Cadeiras reais**: cadastrar as cadeiras da unidade (tela Horários, seção cadeiras; tipo avaliacao/tratamento) — o filtro da Agenda usa.
3. **Agenda (5b3fe9b6)**: ajustes pontuais — nada estrutural: (a) quando o dentista tem horário no dia, mostrar as vagas como hoje; (b) conferir que bloqueio/compromisso/incerto nunca aparecem como vaga (P1-05 já prova); (c) badge de origem/lote visível.
4. **Prova P1-05**: re-executável (botão já existe); sem código novo de prova.
5. **Teste humano (b1b67130)**: roteiro da SPEC — conferir horários reais, trocar visão por cadeira, desmarcação de teste libera horário, usuário sem função não vê nada.

## Plano em código
- src/pages/Horarios.tsx (nova, SomenteGestao, rota /horarios, menu "Horários" gestão-only): select dentista → lista de blocos (dia_semana select 0-6, inicio/fim time) → salvar (create/delete direto na coleção, padrão das outras telas) + importação CSV (mesmo parser do padrão duracao.ts) + seção cadeiras (nome/tipo, create/delete).
- src/services/horarios.ts (novo): listarHorariosTodos(), salvarHorario(), apagarHorario(), importarHorarios(linhas), listarCadeiras (reusa agenda.ts).
- App.tsx: rota /horarios (SomenteGestao). Layout.tsx: menu "Horários" (visivel: eGestao).
- Agenda.tsx: sem mudança estrutural (já atende CA-1-05); só conferência final.
- Nenhuma migration nova: coleções horarios_profissional e cadeiras já existem (migration 0001/0003) com regras corretas (leitura autenticada, escrita gestão).

## Teste de mesa (cadastro de horários)
| Entrada | Saída esperada |
|---|---|
| Wesley: SEG 09-17 e bloco almoço 13-14 | 2 blocos gravados; Agenda mostra vagas 09-13 e 14-17 na segunda |
| Bloco com fim <= inicio | rejeitado com motivo |
| CSV com profissional inexistente | rejeitado com motivo (relação inválida) |
| Dentista sem horário no dia | "horário não cadastrado" (já implementado) |

## Matriz critério → prova
- CA-1-05 → P1-05 (botão existente re-executado na entrega) + teste humano com horários reais (b1b67130).
- Regressão → P1-01..08 re-rodáveis; agenda e Planejar intactos.

## Ficha de Tela — Horários dos dentistas (/horarios)
- Quem usa: gestão (SomenteGestao); computador e celular.
- Tarefa: cadastrar os horários de atendimento por dentista e as cadeiras da unidade.
- Ação primária: "Adicionar horário" / "Importar CSV".
- Padrão: configurações (lista editável por dentista) — consistente com TabelaDuracao.
- Dados: dentista (select) → blocos {dia_semana, inicio, fim}; cadeiras {nome, tipo}.
- Estados: carregando · vazio (sem horário → aviso claro) · erro com saída · sucesso (toast/banner próprio — toasts do template não renderizam) · sem permissão.
- Acessibilidade: labels, aria-label nos selects de dia/hora; contraste.
- Textos PT-BR: "Horários dos dentistas" · "Nenhum horário cadastrado" · "Cadeiras da unidade".

## Riscos
- Digitação de horário errada → conferência na tela (lista mostra os blocos gravados) + CSV validado linha a linha.
- Nenhum risco de dados (só create/delete em coleção de cadastro; nada apaga agenda).

## Decisões
- Nenhuma bloqueante: escala real já lida da planilha (db_horarios_profissionais); posso cadastrar os horários reais direto na entrega (como fiz com profissionais) e a gestão ajusta na tela se mudar.
- Assumo: cadastro inicial dos horários reais (Wesley/Pamella/Leonel/Erika) feito por mim na entrega, com os dados da planilha — dono confere na tela.

## Verificação automática e teste humano
- Automática: E2E das rotas de cadastro por API; P1-05 re-executada; QA verde; publicada = testada.
- Humano (SPEC-1-001, CL-008): conferir horários, visão por cadeira, desmarcação libera horário, usuário sem função. "testei, pode seguir" no card.

## Resultado da implementação (14/10, v0.0.37 e43abd9)
- Tela /horarios entregue conforme plano; QA verde 1ª tentativa; publicada e provada.
- Seed real: 67 horários (38 blocos; "Dra. Erika" casada por sufixo; Leonel ITA QUA 16:00 fim aberto assumido 18:00 — conferir) + 11 cadeiras (ALC 1–6, ITA 1–5).
- Checagens por API: anônimo 0 registros, sem-função 0 registros, 0 sobras teste=true.
