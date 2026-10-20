[file: d03a15ee-acompanhar-lead-comparecimento.md | total: 1687 bytes | read: bytes 0-1686]
[END OF FILE - no further content.]

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
