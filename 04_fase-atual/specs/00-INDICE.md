# Índice de SPECs — Fase 1

**Fase:** 1 — Central de agenda da unidade piloto (06/10/2026 a 20/10/2026)  
**Resultado da fase:** fundamentação do app com dados locais/arquivos identificados: agenda, pacientes, regras, atendimento e painel demonstráveis. Trello/APP CRC continuam até o piloto conectado da fase 4.  
**Gerado em:** 2026-10-05 · run 20261005T105044799Z-a34aeebe  
**Tasks:** arquivo de tarefas da fase (cards do portal; o status fica só lá)

| SPEC | Entrega | Critérios | Depende de | Degrau |
|---|---|---|---|---|
| [SPEC-1-001](spec-1-001-agenda-da-unidade.md) | Agenda da unidade piloto na central (base, funções, importação/fixture, agenda e vagas, mecanismo de provas) | CA-1-01 a CA-1-06 | Fixture/arquivo e CL-001; pessoas/papéis, sem acesso externo | nativo da plataforma |
| [SPEC-1-002](spec-1-002-duracao-sugerida.md) | Duração sugerida e desvio justificado | CA-1-07 a CA-1-11 | SPEC-1-001, CL-001 | construção mínima |
| [SPEC-1-003](spec-1-003-leads-pacientes-e-ficha.md) | Leads com origem, pacientes a agendar e ficha do paciente | CA-1-12 a CA-1-17 | SPEC-1-001, SPEC-1-002 | construção mínima |
| [SPEC-1-004](spec-1-004-confirmacoes-liberacao-e-encaixe.md) | Confirmações (lista para o robô), liberação pela regra e encaixe com reserva exclusiva | CA-1-18 a CA-1-25 | SPEC-1-001 a SPEC-1-003, CL-004, CL-009 | reuso + construção mínima |
| [SPEC-1-005](spec-1-005-atendimento-do-dia.md) | Atendimento do dia em dados locais | CA-1-26 a CA-1-30 | SPEC-1-001, SPEC-1-003 | construção mínima |
| [SPEC-1-006](spec-1-006-painel-e-linha-de-base.md) | Painel de agendamento e linha de base | CA-1-31 a CA-1-35 | SPEC-1-001 a SPEC-1-005 | construção mínima |
| [SPEC-1-007](spec-1-007-virada-da-unidade.md) | Demonstração e aceite da fundamentação | CA-1-36 a CA-1-39 | SPEC-1-001 a SPEC-1-006 | reuso |

**Fora desta fase:** gravação e transcrição, média automática por dentista, WhatsApp oficial e envio automático, oferta automática, escrita no Clinicorp, qualquer uso de IA, cobrança, resultado financeiro por campanha, painel de custo e segunda unidade.

**Mecanismo de provas:** definido na SPEC-1-001 (tela "Provas", massa de teste com `teste = true`, RED/GREEN/REGRESSÃO).

**Teste humano:** CL-008 em todas as SPECs; demonstração local (SPEC-1-007); dia real movido à fase 4.

## Revisão de 13/10 — fundamentação antes de conexões

49 cards atuais, sete SPECs, sem credenciais externas. Cinco cards de acesso/virada transferidos à fase 4 privada e reservados até SPEC futura. Todos os 54 UUIDs, estados, responsáveis, datas e visibilidades preservados. Datas originais são histórico a replanejar. Nenhuma task foi executada/concluída. Endpoints externos estão mapeados no plano privado e serão detalhados para execução na liberação da fase 4; pasta operacional recebe apenas a fundamentação.

## Análise documental por SPEC — orientação de 13/10

Todas as sete SPECs incluem fontes/campos, extração, validação, saída para o app e perguntas limitadas a lacunas comprovadas. 001 agenda/catálogos; 002 tempos; 003 leads/procedimentos/campanhas; 004 políticas/modelo de confirmação; 005 presença/baixa; 006 indicadores/histórico/custo; 007 evidências/aceite. Pasta Drive informada não significa conteúdo já lido. Análise é etapa da task que consome documentos, sem novos cards de solicitação ou reabertura das entregas aceitas.

## Emenda 14/10 — planejamento por etapas

SPEC-1-001 habilitação clínica; 002 duração/combinações novas; 003 sequência, modelo opcional, aprovação/conclusão/revisão por paciente; 004 gate de elegibilidade/concorrência; 007 regressão. Construir rascunho e lista Sem regra pode continuar; oferta/novo agendamento de tratamento depende do guard. Tasks novas sem UUID até retorno do portal, sem prazos inventados.
