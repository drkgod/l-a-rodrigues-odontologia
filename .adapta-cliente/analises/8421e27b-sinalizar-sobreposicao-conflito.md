# Análise — 8421e27b: Sinalizar sobreposição na avaliação e conflito no tratamento

**SPEC:** SPEC-1-004 (Confirmações, liberação e encaixe) · **Critério:** CA-1-21 · **Prova:** P4-07
**Card:** "Sinalizar sobreposição na avaliação e conflito no tratamento" (subtask de f79847a5)

## Objetivo e resultado observável

A CRC, ao planejar um agendamento, vê um sinal claro do regime e do conflito ANTES de gravar:
- **Avaliação**: até 2 pacientes por horário (30 min) — o 3º é bloqueado com mensagem.
- **Tratamento (horário marcado)**: sem sobreposição — horário que colide com consulta existente do mesmo dentista é bloqueado com mensagem.
- **Política pendente**: nunca vira ilimitada — mostra "regra da agenda não validada" e não permite oferta.

## Estado atual (inspecionado 19/10)

- **Gate completo no servidor**: rota `POST /backend/v1/capacidade/verificar` (hook confirmacao_regras.js L249-420) já implementa CA-1-21 inteira: avaliação (limite 2/30min de config ou política ativa), ordem_chegada (política ativa obrigatória, `regra_nao_validada` sem ela), horario_marcado (RN-09 sem sobreposição). Prova P4-07 (provas.ts L940) valida os três cenários e está verde no ar.
- **LACUNA**: `verificarCapacidade` (confirmacao.ts L150) existe no serviço mas **nenhuma tela chama** — o sinal não aparece para quem usa. O Planejar sugere duração e lista vagas, mas não consulta capacidade do horário escolhido.
- Planejar.tsx (756 linhas): consulta tempo sugerido → resultado com vagas compatíveis (buracos da agenda do dia) → botão "Ligar reserva" por vaga (reserva de demonstração, task fdca5fb0). O "Ligar reserva" grava `planejamentos.agenda_item` via rota `/backend/v1/duracao/ligar-reserva` (hook duracao_sugerir.js L246), que valida: item não cancelado, APPOINTMENT, mesmo profissional, item não ligado a outro planejamento. **Não valida capacidade/sobreposição.**
- Regime (avaliação × tratamento): o planejamento não tem campo de regime. O tipo vem do **profissional** (`profissionais.tipo_agenda`: avaliacao/tratamento/ambos) e da política de agenda. O item da agenda reservado tem `item_tipo=APPOINTMENT` — o regime do planejamento novo é derivável do `tipo_agenda` do profissional escolhido (fonte única no formulário).

## Recorte (menor recorte completo)

Sinalizar no Planejar.tsx no momento da escolha do horário, sem mudar fluxos existentes:

1. **Serviço**: nada novo — `verificarCapacidade` já existe (confirmacao.ts L150).
2. **Planejar.tsx**:
   - ao clicar "Ligar reserva" numa vaga, chamar `verificarCapacidade(data, v.inicio, profissional, regime)` ANTES de ligar;
   - regime derivado de `profissionais.tipo_agenda` do profissional selecionado: `avaliacao` → tipo `avaliacao`; `tratamento` → `horario_marcado`; `ambos` → `horario_marcado` (política geral RN-09; avaliação exige escolha explícita que o formulário não tem hoje — manter tratamento);
   - `bloqueado` → toast de erro com o motivo do servidor e NÃO liga a reserva;
   - `regra_nao_validada` → toast de aviso ("regra da agenda não validada") e NÃO liga;
   - `permitido` → segue o fluxo atual (ligar reserva + desvio se houver);
   - sinal visível também no resultado da consulta: badge "Avaliação (2 por horário)" ou "Tratamento (sem sobreposição)" conforme o regime, para a CRC ver o regime antes de escolher.
3. **Prova P4-07** já cobre o gate; acrescento na análise a verificação de mesa do fluxo da tela. Sem migration, sem hook novo.

## Plano em código

- **Arquivo único**: `src/pages/Planejar.tsx` (edição cirúrgica, 3 pontos):
  1. import `verificarCapacidade` de `@/services/confirmacao` (checar import circular: confirmacao.ts não importa Planejar — seguro);
  2. helper `regimeDoProfissional(tipoAgenda: string): 'avaliacao' | 'horario_marcado'` — avaliacao→avaliacao, tratamento/ambos→horario_marcado, vazio→horario_marcado;
  3. em `ligar(item)`: antes de `ligarReserva`, `const cap = await verificarCapacidade(data, v.inicio, profissional, regimeDoProfissional(...))`; se `!cap.permitido` → `toast.error(cap.mensagem || 'Horário não permitido pelas regras da agenda.')` e return; senão segue.
  4. badge do regime no card de resultado (linha do resultado, junto do tempo sugerido).
- **Estado novo**: nenhum obrigatório; `ligando` já existe para desabilitar botão durante a verificação.
- **Regras de acesso**: nenhuma coleção nova; rota existente `requireAuth` (todas as funções autenticadas podem consultar capacidade — leitura).
- **Teste de mesa** (regra da tela):
  | Entrada | Estado do servidor | Saída esperada |
  |---|---|---|
  | Avaliação, horário com 2 consultas | bloqueado (limite 2) | toast "Limite de 2 avaliações por horário já atingido." e não liga |
  | Avaliação, horário com 1 | permitido | liga reserva normalmente |
  | Tratamento, 10:30 com consulta 10:00–11:00 | bloqueado (sobreposição) | toast "Já existe consulta em horário sobreposto deste profissional." e não liga |
  | Tratamento, horário livre | permitido | liga reserva |
  | ordem_chegada sem política ativa | regra_nao_validada | toast "Regra da agenda não validada…" e não liga |
  | erro de rede na verificação | exceção | toast de erro genérico PT-BR e não liga (falha segura) |

## Riscos

- `tipo_agenda` vazio no profissional → default `horario_marcado` (regra geral RN-09, mais restritiva que ilimitado — falha segura).
- Verificação falha (rede/500) → NÃO liga (falha segura; a CRC vê o erro e tenta de novo).
- Sem migration: zero risco de dados.

## Ficha de Tela — Planejar agendamento (`/planejar`) — alteração

- Quem usa e onde: CRC/gestão; computador e celular.
- Tarefa principal: planejar agendamento e reservar horário respeitando as regras da agenda.
- Ação primária: "Ligar reserva" (já existe) — agora com gate visível.
- Padrão: formulário de consulta + painel de resultado (existente).
- Dados: regime → `profissionais.tipo_agenda`; capacidade → rota `capacidade/verificar`.
- Ações e permissões: ligar reserva — CRC/gestão (regras existentes do hook, requireAuth).
- Estados: sucesso (liga), bloqueado (toast com motivo + botão permanece), regra_nao_validada (toast), erro (toast).
- Acessibilidade: toasts com texto (não só cor); botão desabilitado com rótulo "Verificando…".
- Textos: mensagens do servidor exibidas como estão (já em PT-BR).

## Matriz critério → prova

| Critério (CA-1-21) | Prova |
|---|---|
| Avaliação 2 por horário, 3º bloqueado | P4-07 (no ar, verde) + teste de mesa da tela |
| Tratamento sem sobreposição | P4-07 (no ar, verde) + teste de mesa da tela |
| Política pendente não vira ilimitada | P4-07 (`regra_nao_validada`) + teste de mesa da tela |
| Sinal visível para quem usa | roteiro de teste humano (passo 3-4) |

## Perguntas reais

Nenhuma — o regime é derivável do profissional (fonte única no formulário) e a SPEC define os três comportamentos. Detalhe de apresentação (badge do regime) decidido pelo catálogo UI: Badge secundária junto ao tempo sugerido.

## Teste humano

Não é caso crítico (nada muda no que a equipe já usa — o gate já trava no servidor; a tela só mostra o que o servidor responde) e não é a última task da SPEC-1-004. Task entra em `aguardando_teste` e o roteiro da SPEC cobre.
