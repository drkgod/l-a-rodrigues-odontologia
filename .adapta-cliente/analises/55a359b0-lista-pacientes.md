# Análise — task 55a359b0 (lista de pacientes a agendar, SPEC-1-003 · CA-1-14/15 · CA-SEQ-03)

## Escopo (card + subtask 90ad21b0)
- **Subtask 90ad21b0**: trazer procedimentos aprovados e não executados POR ARQUIVO autorizado (zero API externa — fixture separada/arquivo/cadastro manual).
- **Card 55a359b0**: lista única que junta (1) pendências de tratamento, (2) leads aguardando horário, (3) faltas a reagendar — cada item com profissional indicado, disponibilidade (1ª/2ª opção) e prontidão; item não-pronto vai pra "para revisão" com motivo e fora dos elegíveis de encaixe; paciente com agendamento futuro VERIFICADO sai da lista.
- **Emenda CA-SEQ-03**: item de tratamento SEM plano → "aguarda sequência/liberação do avaliador" em "para revisão" (não ofertar automaticamente). O sistema de plano/etapas ainda não existe (incrementos internos pendentes) — a lista mostra esse estado por padrão; a parte plena da P3-11 (dependências A→B) fica provável quando o editor/conclusão entrarem.

## O que já existe (reaproveitar)
- Coleções: leads (etapas novo→compareceu/faltou), agenda_itens (agendamentos com teste=true), profissionais, campanhas.
- Hook leads_regras.js (rotas server-side), tela Leads.tsx, padrão de provas P3-01..03.
- config_unidade (registro único) — ganha campo pendencias_desde (período das pendências).

## Plano de implementação
1. **Migration 0012**: coleção `pendencias` (paciente_nome, telefone, procedimento, profissional, situacao_execucao [a_agendar|executada|aguardando_condicao], agendamento_futuro_verificado [bool], disponibilidade_1, disponibilidade_2, prontidao [pronto|aguardando_condicao], origem [arquivo|manual|fixture], origem_arquivo, teste) + campo `pendencias_desde` (date) em config_unidade. Regras: leitura autenticada com função; escrita só gestão; create também pela rota do hook.
2. **Hook pendencias_regras.js**: rotas (a) `POST /pendencias/importar` — CSV linha a linha (paciente;telefone;procedimento;profissional;situacao), rejeita linha inválida com motivo, dedup por paciente+procedimento+profissional; (b) `POST /pendencias/estado` — marcar executada/aguardando_condicao com motivo (gestão); (c) `POST /pendencias/verificar-agendamento` — cruza com agenda_itens (mesmo profissional, data futura, não cancelado) e marca agendamento_futuro_verificado.
3. **Serviço pendencias.ts** + **tela PacientesAgendar.tsx** (rota /pacientes-a-agendar, SomenteGestao como Leads): três seções — A agendar / Agendado (verificado) / Para revisão (com motivo); botão importar CSV com prévia; registrar disponibilidade/prontidão; marcar executada. Item de tratamento sempre com selo "aguarda sequência/liberação do avaliador" enquanto não houver plano aprovado.
4. **Provas na tela Provas (SPEC-1-003)**: P3-04 (pendência → a_agendar; executada → sai), P3-05 (agendamento futuro verificado → agendado/sai dos pendentes), P3-06 (aguardando_condicao → para revisão, fora dos elegíveis), P3-11-parcial (sem plano/liberação → em revisão; a parte A→B completa fica pro editor de etapas).
5. **Regressão**: P3-01..03 e P2-01..05 continuam passando.

## Premissas de negócio (ajustáveis antes de implementar)
1. **"Leads aguardando horário"** = leads com etapa `em_atendimento` ou `aguardando_retorno` (ainda sem horário marcado). `faltou` entra na seção de faltas a reagendar. `agendado/confirmado` não entram.
2. **Formato do arquivo de pendências** (CSV): paciente;telefone;procedimento;profissional;situacao — linha sem paciente/procedimento é rejeitada com motivo (padrão do import de leads).
3. **pendencias_desde** nas Configurações, vazio por padrão: sem ele, a lista mostra tudo que foi importado/cadastrado (modo manual/fixture, como a SPEC permite).

## Fontes
- SPEC-1-003 (fluxo, CA-1-14/15, emenda CA-SEQ-03, TDD P3-04/05/06/11, instruções de execução).
- fase.md cards 55a359b0 + 90ad21b0; leads_regras.js; leads.ts; migration 0001 (config_unidade); padrão Provas/Leads.