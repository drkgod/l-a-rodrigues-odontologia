# Roteiro de uso da central por função — SPEC-2-001 (CA-2-02)

**Data:** 23/10/2026 · **Preparado por:** Maestro (Luiz) · **Uso:** dia de uso em paralelo (CL-008)

Uso em PARALELO: a agenda oficial continua no Clinicorp; o robô, o Trello e o APP CRC seguem como estão. Nenhuma mensagem sai para paciente e nada é escrito no Clinicorp (RN-04). A equipe registra na central só o que de fato fez na rotina atual (RN-05); liberação e oferta na central só espelham uma liberação/oferta de verdade — para treinar sem isso, usar a massa de teste.

## Conferência de usuários por função (P2.1-03/P2.1-06)

| Função | Papel no sistema | Usuário |
|---|---|---|
| Gestão | `gestao` | a criar pela gestão (login próprio do dono) |
| CRC de agendamento | `crc_agendamento` | a criar pela gestão (Configurações → usuários) |
| CRC de confirmação | `crc_confirmacao` | a criar pela gestão |
| Recepção | `recepcao` | a criar pela gestão |
| Dentista avaliador | `dentista` (+ `avaliador_habilitado`) | a criar pela gestão |
| Usuário sem função | — | deve ficar SEM acesso (prova P1-01) |

**Regra:** quem não tem papel ativo não lê nada (P2.1-06 = P1-01). A gestão cadastra cada usuário antes do dia de uso; o Maestro não cria conta real nem senha.

## Roteiro — CRC de agendamento (`crc_agendamento`)

1. **Planejar**: escolha profissional, procedimento e quantidade → consulte o tempo sugerido; registre o planejamento.
2. **Agenda**: confira os horários do dia importado (ocupados, bloqueios, incertos).
3. **Pacientes a agendar**: veja os procedimentos pendentes com disponibilidade e prontidão.
4. **Fichas**: busque o paciente pelo nome; registre a próxima ação com prazo e responsável.
5. Se uma vaga foi liberada de verdade no Clinicorp: **Planejar → Ofertar vaga liberada** (espelha a liberação real; até 3 pacientes).

## Roteiro — CRC de confirmação (`crc_confirmacao`)

1. **Confirmações**: gere a lista do dia; exporte o XLSX (até o limite do robô) e siga o envio manual do excedente.
2. Registre a resposta de cada paciente (confirmou / pediu remarcação / cancelou / sem resposta) **conforme a resposta real que obteve hoje**.
3. Mova os não respondentes para a lista de ligação; registre as ligações que fez de verdade (não atendeu etc.).
4. Liberação por silêncio: só espelhe se a liberação de verdade aconteceu no fluxo atual.

## Roteiro — Recepção (`recepcao`)

1. **Atendimento do dia**: abra o dia (cria os previstos da agenda importada).
2. Marque **Chegou** de quem chegar de verdade; marque **Falta** só depois do horário previsto.
3. Corrija horário com motivo quando necessário (fica no histórico).
4. No fim do turno, **Fechar dia** marca os incompletos.

## Roteiro — Dentista avaliador (`dentista`)

1. **Atendimento do dia**: veja sua fila (só os seus pacientes); **Chamar → Iniciar → Finalizar**.
2. **Fichas → Etapas do tratamento**: defina/aprove as etapas dos seus pacientes avaliados.
3. **Modelos**: consulte o catálogo de sequências aprovadas.

## Roteiro — Gestão (`gestao`)

1. **Importar**: exporte a agenda do dia no Clinicorp e importe o arquivo na central (lote identificado; reimportar o mesmo arquivo não duplica).
2. **Painel**: confira os indicadores do período (a comparação com a contagem direta está em `comparacao-do-painel.md`).
3. **Linha de base**: informe o custo dos dentistas quando chegar (CL-PEND-003) e calcule.
4. **Provas**: rode as provas P1–P6 no fim do dia — todas devem passar (P2.1-04).

## Registro de problemas (RN-01) — preencher no dia de uso

| # | Função | Tela | Passo | Esperado | Obtido | ID interno | Desfecho |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | (a preencher no dia de uso) |

Desfecho possível: **corrigido** (dentro do aceite da fase 1 — corrigir na SPEC de origem e reexecutar as provas dela) ou **sinal ao consultor** (pede algo além do aceite — RN-03, sem construir).
