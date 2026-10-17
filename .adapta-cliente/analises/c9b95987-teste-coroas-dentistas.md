# Análise — c9b95987 · Testar duas e quatro coroas com dentistas diferentes

- **Task**: c9b95987-0344-4a5f-b528-b5561c1717ca (subtask de fdca5fb0)
- **Data**: 17/10/2026 00h50 (análise) · 09h46 (conclusão)
- **Tipo**: TESTE HUMANO do dono — não é task de código. O sistema já tem tudo pronto.

## Seleção (ordem de leitura da fase)

1. ~~029c9b34 (call de início)~~ — do consultor (Rodrigo), não implementável por mim.
2. ~~71531c1d (modelo da planilha do robô)~~ — ENTRADA do cliente (CL-009); aguarda o dono enviar o arquivo.
3. ~~8d76cea5 + ac46ef6d (leads/campanhas)~~ — CONCLUÍDOS e testados 14/10 (v0.0.40, "testei pode seguir"); checkbox re-marcar [x] hoje (correção de 16/10 se perdeu no reset do clone — lição registrada).
4. ~~eec75533 (importar leads APP CRC)~~ — implementado na tela, aguarda o dono exportar o arquivo (CL-PEND-001).
5. **c9b95987 — 1ª ELEGÍVEL** ← selecionada.

## Objetivo e resultado observável

O dono valida, com uso real da tela, que o tempo sugerido pela tabela respeita a regra por dentista: **2 coroas e 4 coroas com dois dentistas diferentes** — cada um mostra o tempo da SUA regra (específica prevalece sobre a geral). Resultado observável: tempo sugerido na tela Planejar = valor da tabela ativa para cada combinação; divergência → debug.

## Estado atual (baseline, nada alterado)

- Versão no ar: v0.0.59 (f4d3b7b), QA verde, publicação provada.
- Tabela real ativa: 27 regras com campo profissional (f4982b80; específica prevalece, padrão 40 min).
- Rota /duracao/sugerir + tela Planejar com vagas do dia e tempo sugerido (097ff6ce).
- Provas P2-01..04 (coroas 2/4, dentista A vs B, arredondamento 5) verdes na tela Provas — massa sintética.
- fdca5fb0 concluída: desvio com motivo obrigatório + conciliação (P2-05b/06 verdes).

## Plano (sem código)

Nada a construir. Entregar o roteiro de teste abaixo; o dono executa na tela; se algo divergir → debug-task na mesma task.

## Roteiro de teste humano (dono)

1. Abrir https://projeto-lai-19327.goskip.app e entrar com seu login.
2. Menu **Planejar** (tela "Planejar agendamento").
3. Escolher um paciente de teste (ou lead) e o procedimento **Coroa** com quantidade **2**, dentista **A** → anotar o **tempo sugerido**.
4. Conferir na **Tabela de duração** (menu) o valor da regra de 2 coroas do dentista A — tem que bater.
5. Repetir com quantidade **4** e o mesmo dentista A — conferir na tabela.
6. Repetir os dois testes (2 e 4 coroas) com o dentista **B** — se A e B têm regras diferentes na tabela, cada um tem que mostrar o SEU tempo (a regra específica do dentista prevalece sobre a geral).
7. (Opcional, cobre a fdca5fb0) Ligar reserva com tempo diferente do sugerido → o sistema pede **motivo** obrigatório.
8. Se algum tempo divergir da tabela ou algo travar: me manda print/mensagem que eu debugo.

## Matriz critério → prova

| Critério | Prova |
|---|---|
| Tempo sugerido = tabela (2 coroas, dentista A) | Passo 3-4 do roteiro (dono confere na tela) |
| Tempo sugerido = tabela (4 coroas, dentista A) | Passo 5 |
| Específica do dentista prevalece (A vs B) | Passo 6 |
| Desvio pede motivo | Passo 7 (opcional) |
| P2-01..04 (automatizado) | Já verdes na tela Provas (baseline) |

## Riscos / casos de erro

- Divergência tempo×tabela → é bug do motor ou da tabela → debug (não marcar a task).
- Dentista sem regra específica → cai na regra geral/grupo (comportamento esperado; conferir com o dono se é o que ele espera).
- Prova usa massa sintética; o teste humano usa a tabela REAL — é justamente o valor deste teste.

## Impedimentos

- Nenhum para esta task. (Fora dela: eec75533 aguarda exportação do dono; 71531c1d aguarda modelo da planilha do robô.)

## Conclusão (09h46)

- Teste humano APROVADO pelo dono ("testei, pode seguir" 09h46) na v0.0.59 f4d3b7b — a mesma versão no ar provada antes do fechamento (lastPublishedRef = f4d3b7b).
- Sem alteração de código: a task validava o motor já entregue (f4982b80 + 097ff6ce + fdca5fb0).
- fase.md 21/54 (39%); STATUS/changelog/estado/AP atualizados; GitHub enviado no commit do fechamento.