# Análise — d03a15ee: Acompanhar o lead até o comparecimento (+ d45e8f8a relatório)

**SPEC:** SPEC-1-003 · **CA:** CA-1-17 · **Prova:** P3-07

## Escopo
- Lead ligado a um agendamento percorre `agendado` → `confirmado` → `compareceu`/`faltou`.
- Relatório de origem por campanha e período: leads, agendados, compareceram — sem dados pessoais.

## Decisões
- **Vínculo automático por TELEFONE** (migration 0017: `agenda_itens.lead`): consulta criada/atualizada com telefone de lead existente → vincula e move pra `agendado`. Sem passo manual pra CRC.
- **Guarda de massa**: item de teste só vincula lead de teste (e vice-versa).
- **Confirmação**: contato `confirmou` → `confirmado`; `cancelou` (ou cancelamento na agenda) → `aguardando_retorno`.
- **Chegada manual**: rota `/leads/registrar-chegada` com guarda (só agendado/confirmado) — botões "Chegou (compareceu)"/"Faltou" na tela Leads.
- **Relatório**: agrupa por campanha (nome) ou origem_texto_original; filtro por entrada_em; sem nome/telefone na resposta.

## Entrega (v0.0.87 776ca31)
- migration 0017 (agenda_itens.lead) + hook leads_acompanhamento.js (rev.6: lógica inline por causa do scoping do JSVM — função top-level não é visível em callback, QA integrations pegou na rev.2; roteamento por campos porque e.collection não veio no evento).
- Tela Leads: botões de chegada + card Relatório de origem (de/até + tabela).
- Prova P3-07 na tela Provas (massa própria, apagada no fim).

## Verificação
- E2E no ar: vínculo→agendado ✓, guarda 400 ✓, agendado→compareceu ✓; rota do relatório responde ✓.
- Pendência de teste humano: P3-07 + gerar relatório na tela.

## FIX pós-teste (v0.0.88 9b843b1, 20/10 ~03h30)
- Teste do dono provou a chegada (compareceu) e a guarda (2º registro recusado com mensagem clara).
- Descoberto no relatório: `entrada_em` é autodate — a data real do APP CRC não ficou gravada (todos os 4.117 caíram no dia da importação).
- Correção: migration 0018 (`leads.data_entrada`), hook grava data_entrada na importação, relatório usa data_entrada com fallback pra entrada_em.
- Backfill executado das planilhas: 4.117/4.117 com data real (9 recuperados após rate limit 429).
- Relatório validado por dia real: 19/10 → 4 leads (ICOMBOT), 05/10 → 7 leads (ICOMBOT + Clinicorp-Importação).
