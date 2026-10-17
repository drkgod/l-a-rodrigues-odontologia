# Análise — 35bff70c · Montar a ficha do paciente com histórico e próxima ação

- **Task**: 35bff70c-73f2-40e5-96cf-c17bd68d1499
- **Data**: 17/10/2026 10h54 (análise) · 14h08 (entrega)
- **SPEC**: 04_fase-atual/specs/spec-1-003-leads-pacientes-e-ficha.md (CA-1-16 · CA-SEQ-01 · P3-09)

## Objetivo e resultado observável

Uma tela **Ficha do paciente** onde qualquer pessoa autorizada da equipe abre o paciente e vê:
1. **Histórico em ordem** (eventos: contatos, resultados de contato, mudanças de etapa, notas, combinados da avaliação) — append-only, autor e hora;
2. **Responsável e próxima ação com prazo** — editável pela CRC/gestão;
3. **Prazo vencido destacado** (vermelho/âmbar);
4. Acesso por função: `dentista` NÃO vê a ficha; `recepcao` lê; CRCs editam; gestão edita (matriz já gravada nas regras das coleções).

## Estado atual (baseline v0.0.59 f4d3b7b, QA verde)

- **Coleções já existem** (0009/0010): `pacientes` (nome, telefone, paciente_clinicorp_id, lead↔relação, responsavel, proxima_acao, proxima_acao_prazo, proxima_acao_responsavel, teste), `eventos` (paciente, lead, tipo select 10 valores, descricao, autor, criado_em, teste) — regras de acesso JÁ corretas (leituraSemDentista; eventos createRule=null append-only).
- **Tela Leads** existe (criar lead, duplicado, etapas, desqualificar, importar APP CRC, campanhas) — mas NÃO tem visão de ficha nem eventos.
- **Nenhuma tela de ficha**; nenhum serviço de eventos; sem rota `/ficha`.
- A emenda CA-SEQ-01 (avaliador_habilitado/plano) é task SEPARADA; a ficha desta task consome a etapa do plano quando existir — sem implementar o plano aqui.

## Plano implementado (código)

- **Hook `pocketbase/hooks/ficha_regras.js`** (novo): `POST /backend/v1/ficha/evento` (grava evento com autor da SESSÃO; valida tipo ∈ select; paciente/lead existente; papel gestão/CRC) e `POST /backend/v1/ficha/proxima-acao` (grava proxima_acao/prazo/responsável no paciente + evento 'nota' do histórico; autor = sessão). Append-only garantido pelas regras da coleção (createRule null).
- **Serviço `src/services/ficha.ts`** (novo): listarPacientes(busca), buscarPaciente, listarEventos, registrarEvento, salvarProximaAcao, prazoVencido (comparação por DIA CIVIL, não UTC), podeGravarFicha, ROTULO_EVENTO.
- **Tela `src/pages/Ficha.tsx`** (novo): rota `/ficha` (busca) + `/ficha/:id` (detalhe); cabeçalho com nome/telefone/origem/responsável; card Próxima ação (vencido em Badge destructive); card Histórico (lista DESC com tipo/autor/data; diálogo Registrar evento com Select de tipo + Textarea); card Etapas do tratamento (status mínimo "aguarda sequência/liberação do avaliador"); botões de gravação só para gestão/CRC (regra real no servidor).
- **App.tsx**: rotas /ficha e /ficha/:id (Protegido via Layout — recepção e CRC entram; dentista vê 0 registros pela regra da coleção).
- **Layout.tsx**: item de menu "Fichas" (visível para todos os papéis autenticados).
- **Provas P3-09a/P3-09b** (provas.ts + Provas.tsx): P3-09a — evento gravado pela rota com autor da sessão, update direto FALHA (append-only), próxima ação com prazo 2026-01-01 → prazoVencido=true; P3-09b — usuário dentista criado em memória lê 0 fichas e a rota de evento recusa o papel.

## Matriz critério → prova

| Critério | Prova |
|---|---|
| Histórico em ordem (CA-1-16) | P3-09a: evento gravado → listarEventos DESC com autor/data |
| Responsável + próxima ação com prazo (CA-1-16) | P3-09a: salvarProximaAcao → buscarPaciente devolve a ação |
| Prazo vencido destacado (CA-1-16) | P3-09a: prazo 2026-01-01 → prazoVencido true (tela: Badge destructive) |
| Dentista não acessa (CA-SEQ-01/P3-09) | P3-09b: leitura 0 registros + rota recusa |
| Evento append-only | P3-09a: update direto falha |
| Teste humano | Dono abre ficha, registra evento, define próxima ação com prazo, vê destaque |

## Riscos / casos de erro / segurança

- **LGPD**: ficha mostra dados pessoais (telefone) — acesso já restrito por papel (leituraSemDentista); sem exportação nesta task.
- Prazo vencido: comparação de DATA (sem hora) — dia civil local, não UTC (lição AP 13/10).
- Evento sem paciente E sem lead → rejeitado no hook.
- Sem migration → zero risco na fila de migrations.

## Decisão mínima registrada

Próxima ação vencida = só destaque na ficha (a SPEC não pede integração com a lista de pacientes a agendar; se o dono quiser, vira incremento).

## Entrega

- QA verde na 1ª tentativa; publicado v0.0.60 (eb44acb) em 2026-10-17T14:08:50Z; lastPublishedRef = eb44acb (provado).
- GitHub: acb07079 (provas.ts), ff341fa (hook + serviço), 7591a9a (tela + rotas + menu + registros).

## Roteiro de teste humano (dono)

1. Abrir https://projeto-lai-19327.goskip.app e entrar com seu login (gestão).
2. Menu **Fichas** → buscar o paciente/lead de teste → **Abrir**.
3. **Registrar evento** (tipo Contato, descrição qualquer) → aparece no Histórico com seu nome e hora.
4. **Definir próxima ação** com prazo de hoje → aparece; depois editar o prazo para uma data passada → fica **destacado como VENCIDO**.
5. **Provas** → **P3-09a** e **P3-09b** → banner verde.
6. (Opcional) Entrar com um usuário dentista → o menu Fichas aparece, mas a lista vem vazia (a regra do servidor nega).