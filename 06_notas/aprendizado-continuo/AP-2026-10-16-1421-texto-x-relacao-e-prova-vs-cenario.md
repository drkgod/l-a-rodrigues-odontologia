# AP-2026-10-16-1421- texto-x-relacao-e-prova-vs-cenario

- Status: candidato
- Escopo: projeto do cliente (Lai, Skip 65741)
- Task/SPEC: 55a359b0 (SPEC-1-003) — bugs pegos pelo teste humano (P3-05 e P3-11)
- Sinal: (1) cruzar coleções comparando campo TEXTO com campo RELAÇÃO nunca casa (nome vs id); (2) prova que cria massa contrária ao cenário anunciado prova o oposto e falha sem bug de sistema.
- Evidência: P3-05 falhou (hook comparava pendencias.profissional texto com agenda_itens.profissional relação — schema provado); P3-11 falhou (prova marcava prontidao 'pronto' num cenário "sem plano" = default aguardando_condicao).
- Regra reutilizável: antes de filtrar cruzando coleções, conferir o TIPO do campo no schema (texto × relação) e resolver nome→ids; antes de executar prova, conferir que a MASSA representa o cenário anunciado.
- Quando aplicar: hooks que cruzam coleções; provas com massa própria.
- Quando não aplicar: filtros dentro da mesma coleção com tipos iguais.
- Confiança: alta — dois bugs reais no ar, pegos pelo teste humano do dono.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
