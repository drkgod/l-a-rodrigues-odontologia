## 2026-10-22 — task e2369241 (SPEC-1-004, CA-1-23) — IMPLEMENTADA E PUBLICADA
- Migration 0024 (aditiva): coleção ofertas_vaga — vaga (rel agenda_itens), paciente (rel), situacao (ofertada/aceita/recusada/expirada/cancelada), motivo_recusa, ofertada_por, teste. Única por vaga+paciente (índice único).
- Hook ofertas_regras.js: rotas server-side /ofertas/criar (gestão/CRC; vaga CANCELADA com liberação situacao=liberada; ATÉ 3 pacientes; cada um revalidado no servidor: plano aprovado exigido, recusado entra na resposta com motivo; evento "Vaga ofertada" na ficha de cada um), /ofertas/limpar-teste.
- rev.2: vaga cancelada = bool cancelado + liberação por situacao (bug do E2E).
- Prova P4-08 na tela Provas; E2E 6/6 PASS no ar.
- Publicado v0.0.116 (e2f4d40) 22h30; QA verde na 1ª tentativa.

## 2026-10-22 — task e2369241 UI + 36cdfc82 (aceite) — IMPLEMENTADAS E PUBLICADAS
- Tela Planejar: card "Ofertar vaga liberada" — escolher vaga liberada → buscar paciente → até 3 → ofertar; recusados com motivo; lista de ofertas com Aceitou/Recusou.
- Rotas /ofertas/aceitar e /ofertas/recusar (hook ofertas_regras.js): revalidação completa no commit — oferta ofertada + vaga cancelada + liberação liberada + plano aprovado; vencedor aceita, irmãs expiram com evento na ficha, liberação vira preenchida; recusa mantém vaga aberta.
- Debugs: import do service (./pocketbase → @/lib/pocketbase/client) e função top-level inline (scoping JSVM — QA pegou).
- E2E 10/10 PASS no ar.
- Publicado v0.0.120 (b5a1d5e) 21h; QA verde.
