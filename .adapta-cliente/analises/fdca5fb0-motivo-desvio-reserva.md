# Análise — Task fdca5fb0: Pedir o motivo quando a reserva fugir do tempo sugerido

**SPEC**: spec-1-002-duracao-sugerida.md · **Critérios**: CA-1-10 e CA-1-11 · **Provas**: P2-05 e P2-06
**Data da análise**: 16/10/2026 · Executor: Luiz (assistente ETHOS)

## Objetivo e resultado observável

A CRC, na tela "Planejar agendamento", liga a reserva (item da agenda de teste/arquivo, mesmo profissional) ao planejamento. Se os minutos reservados diferem dos sugeridos, o sistema cria o desvio SEM motivo e abre o campo de motivo — sem motivo, o desvio fica pendente; com motivo, vai para "Desvios" para a gestão revisar. Reservas sem planejamento aparecem em "Reservas sem planejamento"; planejamento sem reserva até o fim do dia vira "reserva não encontrada".

## Estado atual (baseline verificado 16/10)

- Coleção `planejamentos` existe mas SEM os campos da SPEC (paciente_nome, agenda_item, minutos_reservados, situacao planejado/reservado/reserva_nao_encontrada/cancelado) — hoje só consulta de tempo + casos sem regra.
- Coleção `desvios_duracao` NÃO existe. Tela Planejar não tem "Ligar reserva". Nenhuma das 3 listas existe.
- P2-05 atual = prova da task 6d5de2f5 (agrupar/validar sem regra) — nome repetido na SPEC, mas o TDD da SPEC-1-002 define P2-05 = desvio sem motivo → justificado e P2-06 = reserva sem planejamento / reserva_nao_encontrada. As provas novas terão nomes distintos na tela (P2-05 desvio, P2-06 conciliação).
- Emenda 14/10: P2-05/06 quando envolver vínculo/finalização de TRATAMENTO exigem plano/etapas sintéticos — porém o vínculo desta task é de DURAÇÃO (rascunho), não de oferta/reserva real de tratamento; avaliação não exige plano. Tratamento sem plano = cenário negativo previsto (fica pendente do guard, que é outra task). Nesta task a reserva é SIMULADA (item fixture), sem prometer reserva real — dentro do modo demonstrativo.

## Arquivos afetados

1. Migration 0013_desvios_duracao.js (aditiva): coleção `desvios_duracao` (planejamento rel, minutos_sugeridos, minutos_reservados, diferenca, motivo_tipo select [grade do profissional|outro], motivo, situacao select [sem_motivo|justificado|revisado], crc, revisado_por, revisado_em, teste) + campos em `planejamentos`: paciente_nome, paciente_telefone, agenda_item (rel único), minutos_reservados, criado_por, situacao + valores [planejado, reservado, reserva_nao_encontrada, cancelado].
2. Hook duracao_sugerir.js — novas rotas: POST /backend/v1/duracao/ligar-reserva (planejamento + agenda_item: valida mesmo profissional, grava minutos_reservados do item, situacao reservado; se diferença ≠ 0 cria desvio sem_motivo), POST /backend/v1/duracao/motivo-desvio (desvio + motivo_tipo + motivo: situacao justificado), POST /backend/v1/duracao/revisar-desvio (gestão: revisado), POST /backend/v1/duracao/conciliar (RN-05/RN-06: itens de agenda APPOINTMENT sem planejamento → lista reservas_sem_planejamento; planejamentos planejado criados até ontem sem reserva → reserva_nao_encontrada), GET /backend/v1/duracao/desvios (lista com filtros).
3. Serviço planejamento.ts — ligarReserva, registrarMotivoDesvio, revisarDesvio, conciliarReservas, listarDesvios + tipos.
4. Tela Planejar.tsx — botão "Ligar reserva" no resultado da consulta (escolhe item da agenda do dia, mesmo profissional); campo de motivo quando desvio criado; card "Desvios" (CRC: pendentes com motivo a registrar; gestão: revisar); card "Reservas sem planejamento"; planejamentos antigos sem reserva viram reserva_nao_encontrada na conciliação.
5. Provas.tsx/provas.ts — P2-05 (desvio: 40 min ligado a item de 60 → sem_motivo; registrar motivo → justificado) e P2-06 (item sem planejamento → reservas_sem_planejamento; planejamento de ontem sem reserva → reserva_nao_encontrada).

## Ficha de Tela (novos blocos em Planejar)

- Quem usa: CRC (ligar reserva, motivo) e gestão (revisar desvios).
- Ação primária: "Ligar reserva" no card do resultado.
- Padrão: lista + formulário em diálogo (motivo) + 2 cards de listas.
- Estados: carregando, vazio ("Nenhum desvio pendente", "Nenhuma reserva sem planejamento"), erro com retry.
- Acessibilidade: rótulos, aria-label, foco, confirmação no revisar.
- Textos PT-BR: "Ligar reserva", "Registrar motivo", "Revisar", "Desvios", "Reservas sem planejamento", "Reserva não encontrada".

## Matriz critério → prova

| Critério | Prova |
|---|---|
| CA-1-10 desvio criado sem motivo (diferença) | P2-05 (40 min × item 60 min → sem_motivo) |
| CA-1-10 motivo registrado → justificado, aparece em Desvios | P2-05 (registrar → justificado; lista mostra) |
| CA-1-11 item sem planejamento → lista | P2-06 (item teste sem planejamento aparece) |
| CA-1-11 planejamento sem reserva até fim do dia → reserva_nao_encontrada | P2-06 (planejamento de ontem sem reserva) |
| RN-04 comparação usa tempo ARREDONDADO | P2-05 (sugerido 40 arredondado × 60) |
| RN-05 compromissos/bloqueios não contam | P2-06 (só APPOINTMENT entra) |

## Plano em código (teste de mesa)

| Entrada | Regra | Saída |
|---|---|---|
| planejamento 40 min + item 60 min mesmo profissional | RN-04 | desvio sem_motivo (diferença 20); planejamento reservado |
| desvio sem_motivo + motivo "grade do profissional" | CA-1-10 | justificado; sai dos pendentes da CRC |
| item APPOINTMENT sem planejamento | RN-05 | aparece em reservas_sem_planejamento |
| item EVENT/bloqueio sem planejamento | RN-05 | NÃO aparece |
| planejamento planejado de ontem sem reserva | RN-06 | reserva_nao_encontrada |
| planejamento de hoje sem reserva | RN-06 | continua planejado (fim do dia ainda não chegou) |

## Riscos

- Migration aditiva (coleção nova + campos novos em planejamentos) — sem risco de dado existente; situacao atual (sugerido/sem_regra) PRESERVADA: valores novos somados ao select.
- Concorrência de vínculo (2 CRCs ligam o mesmo item) — agenda_item é rel único por planejamento; rota valida item livre antes de gravar.
- RN-06 depende de "fim do dia": conciliação roda on-demand (botão/abertura da lista) e usa data do planejamento < hoje — sem cron nesta fase (modo demonstrativo).

## Impedimentos

- Nenhum bloqueante. O guard de tratamento (elegibilidade) é outra task — nesta task a reserva é simulada e não promete reserva real (SPEC: "reserva simulada tem marcador de demonstração").

## Verificação automática + teste humano

1. QA Skip verde + publicar + provar rotas no ar (401 anônimo) + migration aplicada (coleção desvios_duracao existe).
2. Provas P2-05 e P2-06 na tela Provas → PASSOU; regressão P2-01..04 e P3/P4 → PASSOU.
3. Teste humano (dono): Planejar → consultar tempo → Ligar reserva (item de teste) → desvio criado → registrar motivo → Desvios mostra justificado → gestão revisa → Reservas sem planejamento lista item órfão → "testei, pode seguir".
