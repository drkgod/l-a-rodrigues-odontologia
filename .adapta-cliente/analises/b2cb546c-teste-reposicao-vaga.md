# Análise — b2cb546c: Testar a reposição de uma vaga do começo ao fim

**SPEC:** SPEC-1-004/005 · **Card:** "Teste humano da reposição de vaga de ponta a ponta"

## O fluxo de reposição que JÁ existe (construído nas tasks anteriores)
1. **Confirmação**: lista do dia (3 mensagens + 1 ligação, corte 17h) → paciente não responde → "Mover não respondentes" → lista de ligação.
2. **Liberação (CA-1-20/22)**: CRC decide liberar a vaga (cancelamento/remarcação/ligação sem sucesso) — o gate recusa sem 3 mensagens + ligação; a vaga SÓ fica livre quando a desmarcação é COMPROVADA (cancelado/excluído na leitura) via "Conciliar agora"; leitura parcial nunca libera (P4-12).
3. **Falta (SPEC-1-005)**: chegada "Faltou" (task d03a15ee) marca o lead.

## O que AINDA NÃO existe (tasks e2369241 + 36cdfc82, abertas)
- **Oferta da vaga a até 3 elegíveis** (CA-1-23) — depende da emenda (guard da etapa aprovada, CA-SEQ-06).
- **Aceite com operação protegida** (CA-1-24/25) — primeiro aceite vence, reserva ligada.

## Decisão do escopo desta task
O card pede o TESTE do começo ao fim do que existe hoje: confirmação → não resposta → lista de ligação → decisão de liberação → conciliação com desmarcação comprovada → vaga livre. As etapas de OFERTA/ACEITE são tasks próprias (e2369241/36cdfc82) e dependem da emenda CA-SEQ-06 — não fazem parte deste teste.

## Roteiro do teste humano (massa de teste, sem dado real)
Preparado por mim (massa marcada teste=true, apagada depois):
- Consulta de teste HOJE 08:00 do "Profissional Teste P4" com contato pendente.
1. Registrar 3 mensagens enviadas + ligação sem sucesso (na tela Confirmações).
2. Decidir liberação (motivo: ligação sem sucesso) → vaga continua ocupada com pendência "Desmarcar a consulta no Clinicorp e conciliar".
3. Cancelar a consulta de teste (leitura) → "Conciliar agora" → vaga LIBERADA com evidência.
4. (Extra, já provado em P4-12) item ausente na leitura NÃO libera.

Alternativa: rodar as provas P4-06 e P4-12 na tela Provas (mesmo fluxo, automatizado).

## Verificação automática
P4-06 e P4-12 já verdes no ar (v0.0.88). O teste humano valida a MESMA jornada com as mãos.

## Resultado do teste humano (20/10 ~10h22 — APROVADO, "testei passou")
- Dono provou com as mãos: 3 mensagens (botão novo), mover não respondentes, ligação sem sucesso.
- Gate recusou 2x com a regra certa (ligação fora da véspera; corte 17h) — comportamento correto provado.
- Liberação decidida (fixture de relógio), cancelamento comprovado via API (simulando leitura), conciliação → LIBERADA com evidência.
- Gaps corrigidos no caminho: botão "Mensagem 1/3" (v0.0.89), import faltando (v0.0.90), contador 3/3 (v0.0.91), botões de ligação dentro da Lista de ligação (v0.0.92).
- Massa de teste apagada (9 registros: mensagens, ligação, liberação, contato, consulta, profissional).
