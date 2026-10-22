# Análise — e2369241: Ofertar a vaga liberada a até três pacientes

**SPEC:** SPEC-1-004 · **Critério:** CA-1-23 · **Prova:** P4-08 (parcial — oferta com revalidação; aceite no 36cdfc82)

## Objetivo e resultado observável
Vaga LIBERADA (fluxo b2cb546c) pode ser OFERTADA a até 3 pacientes elegíveis (rota elegibilidade da CA-SEQ-06 com revalidação). Ordem provisória por entrada entre elegíveis (não define ordem clínica). Oferta registra evento na ficha de cada paciente ofertado.

## Base existente
- liberacoes (migration 0015): vaga liberada com evidência; conciliação pós-cancelamento.
- elegibilidade (v0.0.114): rota server-side com motivo.
- Planejar liga reserva a planejamento; a oferta opera na VAGA (agenda_itens liberada).

## Plano em código
1. **migration 0024_ofertas_vaga.js** (aditiva): coleção ofertas_vaga — vaga (rel agenda_itens), paciente (rel), estado (ofertada/aceita/recusada/expirada/cancelada), ofertada_por/em, teste. Regras: equipe lê; create/update null (só hook); delete gestão.
2. **hook ofertas_vaga.js** (novo; inline):
   - POST /backend/v1/ofertas/criar {agenda_item_id, pacientes_ids[≤3]}: gestão/CRC; vaga existe e está LIBERADA (cancelada + conciliada — reusar regra do fluxo de reposição); cada paciente: elegibilidade=true (rota interna); cria oferta por paciente (estado ofertada) + evento na ficha; revalida que a vaga continua livre.
   - POST /backend/v1/ofertas/limpar-teste (gestão).
3. **service ofertas.ts**: criarOferta, listarOfertasVaga, limparMassa.
4. **provas.ts**: P4-08 parcial (oferta a 3 elegíveis; 4ª recusada; não elegível recusado com motivo; vaga não liberada recusada; evento na ficha) + Provas.tsx botão.
5. UI mínima: botão "Ofertar vaga" nas liberações (Planejar/Confirmações) fica pro aceite (36cdfc82) — motor primeiro, como a SPEC permite (prova parcial).

## Teste de mesa
| Entrada | Saída |
|---|---|
| Vaga liberada + 3 elegíveis | 3 ofertas criadas + eventos |
| 4º paciente | 400 "até três pacientes" |
| Paciente sem plano | oferta NÃO criada + motivo |
| Vaga não liberada | 400 |
