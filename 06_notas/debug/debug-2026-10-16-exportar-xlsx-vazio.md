## Debug Summary
**Task e problema:** 5bcfa6f1 — "testei, só não consegui baixar a planilha" (print: Confirmações com lista do dia 17/10 = 0 consultas, botão Exportar XLSX desabilitado).
**Reprodução:** abrir /confirmacoes com dia-alvo sem consultas na agenda → lista vazia → botão desabilitado.
**Causa raiz:** a agenda real de amanhã não foi importada e a massa da prova P4-01 se auto-apaga ao terminar (finally) — o dono não tinha NENHUMA consulta no dia-alvo. O botão estava desabilitado porque "não há o que exportar" (comportamento correto da regra CA-1-18), mas a tela não explicava isso nem oferecia caminho para testar o download. Download em si provado funcionando (XLSX gerado e relido com a mesma lib, local).
**Correção (v0.0.50, 6e10115):** botão "Criar massa de teste" na tela (4 consultas fixture teste=true no dia-alvo: 3 telefone válido + 1 inválido) + botão "Limpar massa de teste" + textos de estado vazio orientando (lista vazia e card de exportação) + title no botão desabilitado explicando o porquê.
**Verificação automática:** QA verde; publicado 6e10115; lastPublishedRef = versão atual.
**Situação:** aguardando teste humano.
