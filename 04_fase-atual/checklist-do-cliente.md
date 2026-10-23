# Fase 2 — o que a clínica precisa enviar ou decidir (23/10/2026)

Itens que saíram das tasks da fase 1 (AC-23-02) e itens novos da fase 2. Nenhum deles trava a construção: o Maestro segue e usa cada dado quando chegar.

| ID | Item | Para que serve | Trava o quê |
|---|---|---|---|
| CL-PEND-003 | Informar o custo de cada dentista (diária ou outra forma) e o período da linha de base | Custo por paciente na linha de base | Só o custo por paciente, que mostra "dados insuficientes" até chegar |
| CL-009 | Enviar o modelo real da planilha do robô de confirmação | Lista do dia no formato do robô | Nada na fase 2; a lista atual segue com o modelo da fase 1 |
| CL-PEND-006 | Exportar o quadro do Trello | Guardar o histórico antes da virada da fase 4 | Nada na fase 2 |
| CL-010 | Confirmar a unidade e a conta do relatório da agência de junho a agosto e a diferença no custo por lead de junho; pedir à agência a base original | Resultado por campanha da fase 3 | Nada na fase 2 |
| CL-PEND-007 | Aprovar o texto do termo de gravação, com a finalidade (continuidade do tratamento), a forma de assinatura e o que acontece na revogação; depois a gestão cadastra o termo na central | Liberar a gravação de pacientes reais (SPEC-2-004) | Só a gravação real; o teste usa o termo de teste |
| CL-008 | Separar um dia (ou um turno) para a equipe usar a central em paralelo: a gestão exporta a agenda do dia do Clinicorp e importa na central, e cada função segue o seu roteiro | Última task da SPEC-2-001 | O fechamento da SPEC-2-001 |
| CL-PEND-013 | Confirmar se a média de tempo usa os últimos 90 dias e no mínimo 5 atendimentos | Parâmetros da SPEC-2-005 | Nada; os valores podem ser ajustados na configuração |
| CL-002 | Enviar o restante do material da mentoria e as réguas de follow-up | Fases 3 e 4 (follow-up e playbook) | Nada na fase 2; o guia de conexão e comunicação da CRC já foi recebido em 23/10 |

## Rastreabilidade da transferência (AC-23-02)

| Entrada | UUID da fase 1 | Destino |
|---|---|---|
| Modelo da planilha do robô | 71531c1d-0e0d-443f-9b6e-3e8dbf3e00b8 | CL-009 |
| Custo por dentista e período | 04d3496d-faf3-4332-85d2-9e8c4478e993 | CL-PEND-003 |
| Histórico do Trello/APP CRC | ee4d87d7-d467-46d3-bbea-cfc5b60a959e | CL-PEND-006; preservar registros do APP CRC já recebidos |
| Histórico de campanhas | 1ccd1bb9-ad1c-4d16-8327-462ae08621ac | CL-010 |

Antes de pedir qualquer entrada, conferir as fontes já recebidas conforme AGENTS.md. Arquivos com dados de pacientes ficam na pasta restrita da clínica; no Git registrar apenas referência e estado. Esta publicação não confirma recebimento nem altera o portal.
