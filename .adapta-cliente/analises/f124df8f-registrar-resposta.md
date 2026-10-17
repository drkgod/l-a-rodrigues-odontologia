# Análise — Task f124df8f: Registrar a resposta de cada paciente

**SPEC**: spec-1-004-confirmacoes-liberacao-e-encaixe.md · **Critério**: CA-1-19 · **Prova**: P4-03
**Data da análise**: 16/10/2026 · Executor: Luiz (assistente ETHOS)

## Objetivo e resultado observável

Na tela "Confirmações", a CRC registra a resposta de cada paciente da lista do dia (confirmou, pediu remarcação, cancelou, sem resposta). Cada resposta muda SÓ o estado do contato (a consulta continua agendada); quem não respondeu vai para a lista de ligação com o responsável do turno; a gestão vê os turnos sem cobertura de ligação.

## Estado atual (baseline verificado 16/10, v0.0.55 ff39792 no ar)

O backend da CA-1-19 JÁ EXISTE (task a9f9e30e, publicado):
- POST /backend/v1/confirmacao/registrar — respostas válidas confirmou/pediu_remarcacao/cancelou/sem_resposta; muda estado, atualizado_por/em, versao_contato. ✓
- POST /backend/v1/confirmacao/registrar-mensagem — contagem por chave idempotente (contato+tentativa+dia civil); pendente → mensagem_enviada só se ainda não respondeu (resposta interrompe a régua). ✓
- POST /backend/v1/ligacao/registrar ✓
- POST /backend/v1/confirmacao/mover-nao-respondentes — mensagem_enviada → em_lista_ligacao com responsável do turno (manhã < 12:00, tarde ≥) de config_turno_ligacao; sem cadastro → "a definir" + alerta_gestao. ✓ (degradação graciosa com try/catch)
- Tela Confirmacoes.tsx: lista do dia com badge de estado — MAS SEM AÇÃO: nenhuma linha tem botão de resposta; não há botão de mover não respondentes; não há gestão da cobertura por turno.

## Lacunas (o recorte desta task)

1. **Tela — registro de resposta por linha**: botões por contato (Confirmou / Pediu remarcação / Cancelou / Sem resposta) com confirmação no cancelar/remarcar; grava via registrarResposta; atualiza a linha (badge) e mostra autoria.
2. **Tela — lista de ligação**: botão "Mover não respondentes para lista de ligação" (rota mover-nao-respondentes) + painel com os em_lista_ligacao do dia-alvo, turno e responsável; alerta de turno sem cobertura.
3. **Banco + tela — cobertura por turno**: migration 0014 cria config_turno_ligacao (turno select [manha|tarde] único, responsavel text, teste bool; escrita gestão, leitura CRCs/recepção) + tela/gerenciamento simples (2 registros fixos: manhã e tarde) na tela Confirmações (só gestão edita).
4. **Prova P4-03** (SPEC): registrar mensagens 1/2/3 (contagem distinta); repetir chave → ja_registrada (não duplica); registrar resposta confirmou → estado do contato muda, MENSAGENS continuam contadas (régua interrompida = novas mensagens não mudam estado), agenda_itens NÃO muda (consulta continua agendada).
5. **Prova complementar**: mover não respondentes com contato mensagem_enviada do dia-alvo → em_lista_ligacao com responsável do turno; contato com resposta confirmou NÃO é movido.

## Arquivos afetados

1. Migration 0014_config_turno_ligacao.js (aditiva): coleção nova — sem risco de dado existente.
2. Hook confirmacao_regras.js: SEM mudança de regra (rotas já cobrem); opcional: nada. (Evitar tocar o hook — as 5 rotas já provadas ficam intactas.)
3. Serviço confirmacao.ts: tipos ConfigTurno + listarTurnos/salvarTurno (via CRUD PocketBase da coleção nova) — reutiliza pb.collection.
4. Tela Confirmacoes.tsx: coluna "Ações" com os 4 botões de resposta (dialog de confirmação no cancelou/pediu_remarcacao); botão "Mover não respondentes"; card "Lista de ligação" (em_lista_ligacao do dia-alvo com turno/responsável); card "Cobertura de ligação" (2 turnos, editável só pela gestão).
5. Provas.tsx/provas.ts: P4-03 + prova de mover (P4-03b) + botões.

## Ficha de Tela (blocos novos em Confirmações)

- Quem usa: CRC (registra resposta, move não respondentes) e gestão (edita cobertura por turno).
- Ação primária: botões de resposta na linha do paciente.
- Padrão: tabela com ações por linha + 2 cards (Lista de ligação, Cobertura).
- Estados: carregando, vazio ("Ninguém em lista de ligação"), erro com retry; dialog de confirmação no cancelou/pediu_remarcacao.
- Acessibilidade: rótulos, aria-label nos botões, foco no dialog, confirmação explícita.
- Textos PT-BR: "Confirmou", "Pediu remarcação", "Cancelou", "Sem resposta", "Mover não respondentes", "Lista de ligação", "Cobertura de ligação", "Responsável da manhã/tarde".

## Matriz critério → prova

| Critério (CA-1-19) | Prova |
|---|---|
| Resposta muda SÓ o estado do contato | P4-03: registrar confirmou → estado confirmou; agenda_itens intacto |
| Régua interrompida pela resposta | P4-03: mensagens 1/2/3 contadas; após confirmou, registrar-mensagem não muda estado |
| Contagem distinta / chave repetida não duplica | P4-03: 3 mensagens = 3 registros; repetir chave → ja_registrada |
| Quem não respondeu vai p/ lista de ligação com responsável do turno | P4-03b: mover → em_lista_ligacao + responsável; confirmou não é movido |
| Consulta continua agendada | P4-03: agenda_itens do item intacto após resposta |

## Plano em código (teste de mesa)

| Entrada | Regra | Saída |
|---|---|---|
| registrar-mensagem ×3 (tentativas 1/2/3) | chave contato+msg+tentativa+dia | 3 registros; contato pendente→mensagem_enviada |
| repetir tentativa 1 | chave igual | ja_registrada, 0 novos |
| registrar confirmou | resposta | contato confirmou; agenda_itens intacto |
| registrar-mensagem após confirmou | régua interrompida | mensagem gravada, estado NÃO muda (só muda se pendente) |
| mover-nao-respondentes (dia-alvo) | RN-04 | mensagem_enviada→em_lista_ligacao+responsável; confirmou fica |
| sem config_turno_ligacao | degradação | "a definir" + alerta_gestao |

## Riscos

- Migration aditiva (coleção nova) — sem risco de dado existente. Fila de migrations do Skip: se a 0014 não aplicar na nuvem, re-apply (padrão conhecido: tocar hook força reload).
- Tela Confirmacoes.tsx já tem ~330 linhas — patches em 2 regiões distintas (tabela + cards); verificar arquivo inteiro após 2º patch (lição do patch duplo).
- config_turno_ligacao sem registro criado: hook degrada para "a definir" — a tela deve criar os 2 registros padrão vazios na primeira edição (gestão), nunca bloquear.
- NÃO tocar nas rotas provadas da a9f9e30e (gates CA-1-20/21) — só leitura/CRUD da coleção nova.

## Teste humano (roteiro)

1. Confirmações → dia-alvo → criar massa de teste (se lista vazia).
2. Clicar "Confirmou" numa linha → badge muda para Confirmou.
3. Clicar "Sem resposta" noutra linha → badge muda.
4. "Mover não respondentes" → quem ficou mensagem_enviada vai para Lista de ligação com turno/responsável; quem confirmou fica fora.
5. (Gestão) Cobertura de ligação → definir responsável da manhã → mover de novo → responsável aparece.
6. Provas → P4-03 e P4-03b → banner verde.
7. Conferir que a consulta continua agendada (Agenda do dia).