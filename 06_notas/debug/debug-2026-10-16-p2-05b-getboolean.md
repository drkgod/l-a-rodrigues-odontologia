## Debug Summary
**Task e problema:** fdca5fb0 — P2-05b falhou "Something went wrong while processing your request" (500) na 2ª rodada de teste (print do dono).
**Reprodução:** executar prova P2-05b → ligar-reserva → 500.
**Causa raiz:** logs do Skip (skip_cloud_list_logs): "TypeError: Object has no member 'getBoolean' at pb.js:19:24" na rota /duracao/ligar-reserva — getBoolean NÃO existe nesta versão do JSVM (lição getInt/getFloat já registrada no 51907; getNumber não existe; getBoolean também não). Havia 5 ocorrências: ligar-reserva (cancelado/excluido), desvio teste, conciliar (2×) e lista-dia no confirmacao_regras.
**Correção (v0.0.54, 3b817d9):** todas as ocorrências trocadas por getInt('campo') !== 0 (bools no PocketBase são 0/1); comentário de bug fix no ponto principal.
**Verificação automática:** QA verde; publicado 3b817d9; lastPublishedRef = versão atual.
**Situação:** aguardando teste humano.
