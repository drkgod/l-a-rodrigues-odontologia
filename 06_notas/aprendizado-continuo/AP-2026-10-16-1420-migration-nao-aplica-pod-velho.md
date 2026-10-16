# AP-2026-10-16-1420- migration-nao-aplica-pod-velho

- Status: candidato
- Escopo: projeto do cliente (Lai, Skip 65741)
- Task/SPEC: 55a359b0 (SPEC-1-003)
- Sinal: migration nova não aplica no backend na 1ª apply+publish — pod velho serve rotas antigas (rota nova 404, coleção nova 404 na API) mesmo com QA verde.
- Evidência: 16/10 — coleção pendencias ausente após 1ª publicação (get_collections + API anônima), presente após 2º apply que tocou o hook; rota 404→401 após reload forçado.
- Regra reutilizável: após publicação que cria migration/rota, PROVAR no ar (coleção via get_collections + rota por API); se 404, re-apply tocando o arquivo do hook força reload do pod.
- Quando aplicar: toda task que cria migration ou rota nova em projeto Skip.
- Quando não aplicar: alteração só de frontend/tela (não depende do pod).
- Confiança: alta — reproduzido e provado no mesmo dia.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
