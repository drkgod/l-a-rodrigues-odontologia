# AP-2026-10-17-0946 — Housekeeping só existe depois do commit (sem commit, se perde)

- **Task**: c9b95987 (teste humano 2 e 4 coroas com 2 dentistas) + housekeeping de 8d76cea5/ac46ef6d
- **Data**: 17/10/2026 09h46
- **Contexto**: checkboxes de 8d76cea5 + ac46ef6d foram re-marcados [x] em 16/10 (concluídos e
  testados 14/10, checkbox faltava) — mas essa correção NÃO foi gravada em commit. No reset do
  clone para o remoto (fluxo de reconciliação), o arquivo local voltou ao estado sem as marcas e
  o erro voltou a aparecer em 17/10.
- **Causa raiz**: correção de registro (fase/STATUS) aplicada só no disco local, sem commit no
  momento; o fluxo de reconciliação com o remoto (`git reset --hard origin/main`) descartou-a.
- **Padrão reutilizável**: housekeeping de fase/estado é efêmero enquanto não estiver em commit —
  ou vai no commit do momento (entrega/debug/conclusão), ou é refeito na próxima escrita. Nunca
  assumir que correção de registro "já está salva" sem commit provado.
- **Evidência**: fase.md local sem [x] em 17/10 (após reset); housekeeping registrado em
  3587e46/estado mas fase.md do mesmo commit ainda sem as marcas; re-marcado e enviado em
  0f39083+ (conclusão f124df8f) — desta vez no commit.
- **Regra derivada**: toda alteração de fase/STATUS/changelog/estado sai no PRÓXIMO commit
  obrigatório do fluxo (entrega, debug ou conclusão) — nunca fica "só no disco" esperando.