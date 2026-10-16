## Debug Summary
**Task e problema:** fdca5fb0 — P2-05b falhou "Only superusers can perform this action" (print do dono).
**Reprodução:** executar prova P2-05b na tela Provas → erro na criação do planejamento de teste.
**Causa raiz:** planejamentos.createRule = null (migration 0007 — escrita só pelo hook); as provas P2-05b/P2-06 criavam o registro DIRETO via SDK → PocketBase recusa ("Only superusers"). Além disso, o hook sugerir gravava situacao 'sugerido', valor que a migration 0013 não incluiu no select (agora planejado/reservado/reserva_nao_encontrada/cancelado) — a conciliação RN-06 marca 'planejado'.
**Correção (v0.0.53, bc5d3c8):** provas criam o planejamento VIA ROTA sugerirDuracao(teste=true) com a tabela de teste (coroa 2 dentista B = 25 min) e ligam item de 60 min → desvio diferença +35 (a regra é reservado ≠ sugerido; o exemplo 40×60 da SPEC é ilustrativo); hook grava 'planejado' em vez de 'sugerido'.
**Verificação automática:** QA verde; publicado bc5d3c8; lastPublishedRef = versão atual.
**Situação:** aguardando teste humano.
