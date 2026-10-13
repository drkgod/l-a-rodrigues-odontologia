# Debug — P1-08 falhou no teste humano (13/10/2026 19:58)

## Debug Summary
**Task e problema:** f4982b80 (tabela por dentista) — teste humano do champion: P1-08 "Failed to create record." (print 19:58:09); P1-02 passou 13s antes.
**Reprodução:** (1) direto por API: aplicar-lote origem=fixture com clinicorp_id "fixture-20-1" → create manual com MESMO clinicorp_id e origem=manual → 400 validation_not_unique EM UM TESTE, coexistência em outro. (2) Na tela (navegador, banco limpo): sequência P1-02 → P1-08 = P1-08 PASSOU.
**Causa raiz:** servidor correto (índice único composto idx_agenda_ns(origem,item_tipo,clinicorp_id) confirmado na coleção; mesmo ID em origens diferentes coexiste — provado no banco). A falha do teste humano veio do POD VELHO atrás do LB (padrão Skip: pods servem versão/regras antigas por minutos após publish; v0.0.22 publicada ~1h antes do teste). Achado real adicional: a limpeza da P1-08 deixava SOBRA — o registro manual de teste (Paciente Manual, origem=manual) não era apagado (limpeza varria só origem=fixture).
**Correção:** v0.0.23 (ref b6e6890) — apagarSobrasDeTeste agora apaga TODO agenda_itens teste=true (inclui manuais de prova); nada de dado real é tocado (dado real tem teste=false).
**Verificação automática:** QA 100% verde; P1-08 ✓ Passou na tela em produção (v0.0.23); pós-prova: 0 itens teste, 0 profs fixture; tabela real v2 continua ATIVA e única (tabela de teste da P2-08 da rodada anterior removida).
**Situação:** aguardando teste humano
