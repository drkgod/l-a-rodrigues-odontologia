# AP-2026-10-16-1527- massa-da-prova-auto-apaga-deixa-teste-humano-sem-massa

- Status: candidato
- Escopo: projeto do cliente (Lai, Skip 65741)
- Task/SPEC: 5bcfa6f1 (SPEC-1-004) — debug do teste humano
- Sinal: prova que cria massa de teste e a apaga no finally deixa o teste humano sem massa — o dono abriu a tela vazia e não conseguiu testar o download (botão desabilitado sem explicação).
- Evidência: print do dono (Confirmações 17/10 = 0 consultas, botão desabilitado); correção v0.0.50.
- Regra reutilizável: quando o teste humano depende de massa que a prova cria, oferecer massa na PRÓPRIA TELA (botão "Criar massa de teste" + "Limpar") — não depender da prova; e estado vazio de tela sempre explica o porquê e o caminho.
- Quando aplicar: toda tela cujo teste humano precisa de dados que não existem em produção ainda.
- Quando não aplicar: massa permanente de produção (aí o estado vazio é real).
- Confiança: alta — bug de UX real pegos pelo dono no teste.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
