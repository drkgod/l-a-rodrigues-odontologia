## Debug Summary
**Task e problema:** fdca5fb0 — P2-05b falhou "massa P2: 0 regras" na 3ª rodada (print do dono).
**Reprodução:** executar prova P2-05b → criarTabelaTesteP2 → importarTabelaDuracao devolve regras_gravadas=0 → throw.
**Causa raiz:** o hook de importação tem DEDUP por hash: reimport do MESMO CSV devolve ja_aplicado=true com regras_gravadas=0 (comportamento correto, provado pela P2-08). A tabela de teste já existia das execuções anteriores (a limpeza da prova apaga regras/tabela, mas a P2-05b rodou depois de outras provas que recriaram). A prova exigia regras_gravadas === 4 — errado: o que importa é TER a tabela.
**Correção (v0.0.55, ff39792):** criarTabelaTesteP2 aceita ja_aplicado: if (r.regras_gravadas !== 4 && !r.ja_aplicado) throw.
**Verificação automática:** QA verde; publicado ff39792; lastPublishedRef = versão atual.
**Situação:** aguardando teste humano. GitHub: provas.ts parcial (pendente de reenvio na conclusão).