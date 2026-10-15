# Análise — task 6d5de2f5 (listar combinações sem regra, SPEC-1-002 · CA-1-09)

## O que já existe (da 097ff6ce)
- Tela Planejar.tsx tem card "Casos sem regra": lista plana dos últimos 20 planejamentos situacao=sem_regra (descreverItens + profissional + data).
- Hook duracao_sugerir.js grava cada consulta em planejamentos (itens JSON, profissional, situacao).
- Coleção planejamentos: createRule null (só hook grava), updateRule/deleteRule gestão.

## O que falta (escopo desta task)
1. **Agrupar**: mesma combinação (itens normalizados) + mesmo profissional = 1 linha com CONTAGEM e data da última ocorrência — o que repete muito entra primeiro.
2. **Botão "Marcar como validado"** (gestão, com confirmação): grava validado_por/validado_em no(s) planejamento(s) da combinação; sai da lista de pendentes, fica no histórico.
3. **Migration 0011**: planejamentos + campos validado_por (text), validado_em (date). Down remove.
4. **Prova P2-05** na tela Provas (SPEC-1-002): criar caso sem regra de teste → aparece agrupado na lista; validar → sai dos pendentes e mantém histórico.
5. **Regra mantida**: enquanto não valida, o planejamento continua devolvendo "sem regra" (nada muda no motor).

## Fontes
- Planejar.tsx, planejamento.ts, duracao_sugerir.js, 0007_planejamentos.js (lidos do espelho GitHub 0bc9ff4).
- TabelaDuracao.tsx: NÃO está no espelho — ler do Skip (skip_file_read) antes de qualquer patch.
- Lição aplicável: patch duplo na mesma região corrompe JSX; conferir arquivo inteiro após 2º patch.

## Estado
- Autorização do dono: "pode seguir" (14/10 21h38). Implementação NÃO iniciada (orçamento da sessão esgotou na exploração — TabelaDuracao.tsx não estava no espelho e a busca no git consumiu os passos). Nada foi alterado no Skip.
