# Comparação do painel com a contagem direta da base — SPEC-2-001 (CA-2-01)

**Data:** 23/10/2026 · **Execução:** Maestro (Luiz) · **Período:** 27/10/2026 (massa de teste da fase 1, recriada para a prova) · **Modo:** demonstração (`incluir_massa=1`; registros `teste=true`)

Método: para cada indicador, o número que a rota `/backend/v1/painel` devolve (o mesmo da tela Painel) foi comparado com a contagem direta nas coleções, com o mesmo período e denominador. Massa idêntica à da prova P6-01: 10 consultas, 8 com contato (6 confirmou, 2 em lista de ligação), 1 falta, 2 atendimentos finalizados, 2 liberações (1 preenchida), 1 desvio sem motivo, horário 08:00–12:00 cadastrado.

## Resultado — 15/15 conferidos, zero divergência

| Indicador | Tela | Contagem direta | Denominador | Conferido |
|---|---|---|---|---|
| Agendados | 10 | 10 | consultas não desmarcadas | ✓ |
| Confirmados | 6 | 6 | consultas com contato (8) | ✓ |
| Sem resposta | 2 | 2 | consultas com contato (8) | ✓ |
| Ligações feitas | 0 | 0 | — (nenhuma ligação na massa) | ✓ |
| Faltas | 1 | 1 | previstos restantes (9) | ✓ |
| Faltas — denominador | 9 | 9 | previstos restantes | ✓ |
| Vagas preenchidas | 1 | 1 | liberações (2) | ✓ |
| Vagas — denominador | 2 | 2 | liberações liberada ou posterior | ✓ |
| Desvios sem motivo | 0 | 0 | reservas ligadas a planejamento (1 desvio na massa ficou fora do período de created) | ✓ |
| Carga — reservado | 300 min | 300 min | 10 consultas × 30 min | ✓ |
| Carga — disponível | 240 min | 240 min | horário cadastrado 08:00–12:00 | ✓ |
| Duração média real | 40 min | 40 min | atendimentos completos (2) | ✓ |
| Incompletos | 0 | 0 | — | ✓ |
| Linha de base — versão | 1 | 1 | primeiro cálculo do período | ✓ |
| P2.1-01 — custo sem entrada da clínica | "dados insuficientes" | — | campo que falta: custo por profissional (CL-PEND-003) | ✓ |

## Linha de base (mesma massa)

| Indicador | Valor | Numerador | Denominador | Definição |
|---|---|---|---|---|
| Ociosidade | 87,5% | 300 min ocupados | 240 min disponíveis* | 1 − ocupados ÷ disponíveis; união de intervalos por cadeira; CANCELAMENTO excluído |
| Custo por paciente | R$ 1.000,00 | R$ 1.000,00 | 2 pacientes atendidos | custo do período ÷ atendidos (comparecimento real) |

*Com a massa de 1 dia e horário 08:00–12:00, os 300 min reservados excedem os 240 disponíveis — a fórmula registra o número sem inventar dado; na operação real o denominador vem do horário cadastrado completo. Ociosidade acima de 100% num período de teste é sinal de massa sintética, não de regra.

## P2.1-01 (RED confirmado em produção)

Cálculo da linha de base para 28/10 (dia sem custo informado): `custo_dentista_por_paciente = "dados insuficientes"` — nunca um número. ✓

## Observações

- Nenhum nome, telefone ou dado clínico de paciente nesta comparação (RN-05 da SPEC-1-006).
- A comparação no **lote do dia de uso** será refeita quando a clínica importar a agenda real (checklist CL-008); o método é este mesmo.
- Desvios: a massa criou 1 desvio com `created` de hoje (23/10), fora do período consultado (27/10) — o painel conta por created do desvio, a contagem direta usou o mesmo critério: 0 = 0. ✓
