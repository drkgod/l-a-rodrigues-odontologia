## Debug Summary
**Task e problema:** f79847a5 rev.3 — dono cadastrou cobertura (Thays/Bianca) e quem já estava na lista de ligação continuava "a definir".
**Reprodução:** cobertura salva → lista de ligação segue com "a definir"; "Mover não respondentes" também não atualizava.
**Causa raiz (dupla):** (1) filtro do mover só aceitava mensagem_enviada/sem_resposta — em_lista_ligacao ficava fora; (2) busca da cobertura usava findFirstRecordByFilter(col, "turno", turno) — assinatura inválida (o 2º argumento é filtro, não valor), caindo no catch "a definir" sempre; além disso o pod não recarregava o hook antigo (mesmo sintoma do caso P4-06).
**Correção (rev.5, definitiva):** 3 causas somadas — (1) filtro sem em_lista_ligacao, (2) assinatura inválida findFirstRecordByFilter(col, filtro, '') — o 3º argumento vazio derrubava a busca pro catch, (3) pod não recarregava hook antigo. Solução: rota NOVA mover-nao-respondentes-v2 em arquivo novo (pod fresco), filtro `turno = "X"` SEM 3º argumento, serviço aponta pra -v2, salvarTurno re-movendo. PROVADO no ar v0.0.75 (bd9f3e5) via API interna: movidos=2, cobertura_a_definir=[], responsável Thays gravado.
**Verificação automática:** QA verde; prova via API interna (URL do .env — a pública bloqueia POST no nginx): mover -v2 = movidos 2, cobertura ok, Thays nos contatos.
**Situação:** aguardando teste humano
