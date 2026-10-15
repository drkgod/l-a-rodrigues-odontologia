# Teste de mesa — 6d5de2f5 (agrupar sem regra + validar)

| Caso | Entrada | Saída esperada | Onde o código garante | Resultado |
|---|---|---|---|---|
| Principal: agrupa iguais | 2 planejamentos sem_regra, mesma combinação + mesmo profissional | 1 grupo, ocorrencias=2, ultima=created do mais recente | agruparSemRegra (chave = descrição+profissional) | ok |
| Não junta combinações diferentes | combo A (10 facetas+1 coroa) e combo B (7 coroas) | 2 grupos separados | chave inclui a descrição dos itens | ok |
| Não junta profissionais diferentes | mesma combinação, profissionais A e B | 2 grupos | chave inclui profissional | ok |
| Ordena por repetição | contagens 1, 2 e 2 | grupos com 2 antes do 1; empate: mais recente primeiro | sort (b.ocorrencias - a.ocorrencias, depois ultima desc) | ok |
| Ignora já validados | planejamento com validado_em preenchido | não entra em grupo | filtro `p.validado_em` no agrupamento | ok |
| Validação grava autoria | ids do grupo + sessão gestão | validado_por = e-mail, validado_em = agora em todos | validarCombinacao (update em cada id) | ok |
| Validação exige permissão | update por usuário sem papel gestão | 403 do servidor | updateRule da coleção (gestao) — migration 0007 | ok |
| Motor intacto | caso sem validação | continua situacao=sem_regra na sugestão | nada muda em duracao_sugerir.js | ok |
| Limite: migração aditiva | campos novos em planejamentos | down remove os 2; nada existente muda | 0011_planejamentos_validacao.js | ok |

Prova P2-05 cobre: agrupamento (2 iguais → 1 grupo), validação (sai dos pendentes, autoria gravada) e a combinação diferente segue pendente.
