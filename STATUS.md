# Estado operacional — fase 2 liberada

23/10/2026: pacote documental da fase 2 publicado com cinco SPECs, 16 tarefas abertas e checklist da clínica. AC-23-02 encerrou o escopo da fase 1 e transferiu as entradas pendentes; referências arquivadas em `05_entregas/fase-1/`.

O changelog no commit f8f7b01 registra o teste humano aprovado do painel e da linha de base demonstrativa pelo Luiz às 10h10. Esse aceite foi preservado. A comparação detalhada e o dia de uso pela equipe continuam na SPEC-2-001.

Próxima ação: task `22d83348-1372-46f4-88cd-0cf15f55cd06`, comparar painel e contagem direta. Depois, roteiro por função; enquanto aguarda o dia de uso, continuar pela SPEC-2-002. Teste humano por SPEC, conforme os roteiros.

Nenhuma implementação ou teste do app foi executado nesta publicação documental. Não houve alteração do código, do submódulo, das integrações ou dos cartões no portal.

---

## Histórico anterior à liberação (não é o estado atual)

# Estado operacional

17/10/2026: fase 1 em execução — 21/54 cards concluídos (41%): + task 5b3fe9b6 (+81d10fc4, +b1b67130), tela de agenda e vagas da unidade: tela /horarios (horários por dentista + importação CSV + cadeiras), seed real 67 horários + 11 cadeiras (CL-001; Leonel ITA QUA fim aberto assumido 18h), prova P1-05 re-verificada, teste humano aprovado pelo dono ("testei e tudo funciona", 23h38) — v0.0.37, ref e43abd9; + task a9f9e30e, regras de confirmação e liberação (gates CA-1-20/21 no servidor: 3 mensagens + 1 ligação sem sucesso no dia anterior + corte 17h local; avaliação 2/horário 30min; ordem de chegada só com política ATIVA; 12 políticas específicas gravadas como pendentes com as decisões do dono de 13/10; provas P4-04/05/07 aprovadas na tela com banner de resultado — v0.0.30, ref 5e25a8c; task 097ff6ce, tempo sugerido ao planejar: rota /duracao/sugerir (tabela ativa, específica do dentista prevalece, arredondamento pra cima no múltiplo 5, combinação de 2 grupos nunca soma), tela Planejar agendamento com vagas do dia como referência e lista Casos sem regra; provas P2-01..04 aprovadas na tela pelo dono (22h42) — v0.0.36, ref c5e48f7) (task 6d5de2f5, lista agrupada de combinações sem regra + validação da direção: card "Casos sem regra" na tela Planejar agora agrupa por combinação+dentista com contagem e data da última, botão "Marcar como validado" só pra gestão com confirmação (grava validado_por/validado_em — migration 0011), prova P2-05 na tela Provas; publicada v0.0.41, ref e442ea4; + task 7805f88a + subtask 556859ba, base da unidade piloto com acesso por função + tela de provas; task c7194c3e + subtasks a38335a3 e 416ed8cc, agenda do Clinicorp na central: importação por arquivo, catálogos, agenda do dia e provas P1-02..P1-08; task 1f4de19d, tabela de duração: importação versionada com aprovação, 22 regras reais no formato de 2 variáveis, provas P2-07/P2-08; task f4982b80, tabela por dentista: campo profissional, 27 regras reais ativas (SISOS: específica por dentista prevalece, padrão 40 min pela decisão do dono), com debug da P1-08 no 1º teste). Sistema Lai no ar em https://projeto-lai-19327.goskip.app (Skip 65741, v0.0.59, ref f4d3b7b), QA 100% verde, provas executadas e aprovadas pelo champion na tela (evidências 13/10 ~14:42, ~17:46, 20:14-20:31, ~21h40, ~22h42, 16/10 19h36, 17/10 00h27 e 09h46).

Fundamentação mantida: fixture/arquivo/cadastro manual; zero chamadas a APIs externas; nenhuma mensagem de teste enviada. Conexões e piloto real passam para a fase 4; segunda unidade/validação para a 5. Sistemas atuais continuam em uso.

Task 55a359b0 (lista de pacientes a agendar) CONCLUÍDA — testada pelo dono (v0.0.48).
Task 5bcfa6f1 (lista de confirmação do dia + XLSX) CONCLUÍDA — testada pelo dono (v0.0.50, ref 6e10115).

Task fdca5fb0 (desvio de duração + conciliação de reservas) CONCLUÍDA — testada pelo dono ("pode seguir", 16/10 19h36) na v0.0.55 (ref ff39792): botão "Ligar reserva" na tela Planejar, desvio sem_motivo com diferença, motivo → justificado, revisão da gestão → revisado, listas Desvios/Reservas sem planejamento, provas P2-05b/P2-06 aprovadas na tela (3 rodadas de debug: Only superusers → getBoolean → dedup por hash).

Task f124df8f (registrar resposta do paciente + cobertura de ligação) CONCLUÍDA — testada pelo dono ("pode seguir", 17/10 00h27) na v0.0.59 (ref f4d3b7b): botões de resposta na linha da tela Confirmações (confirmou/pediu remarcação/cancelou/sem resposta), "Mover não respondentes" para lista de ligação com responsável do turno (manhã/tarde, editável pela gestão — migration 0014), provas P4-03/03b verdes na tela. 3 rodadas de debug (Value must be unique → massa 2× → getString).

Task c9b95987 (teste humano 2 e 4 coroas com 2 dentistas) CONCLUÍDA — testada pelo dono ("testei, pode seguir", 17/10 09h46) na v0.0.59 (ref f4d3b7b), sem alteração de código: tempo sugerido bate com a regra específica de cada dentista na tabela.

Registro 17/10: checkboxes de 8d76cea5 + ac46ef6d re-marcados [x] (concluídos/testados 14/10 — correção de 16/10 se perdeu; lição: housekeeping vai no commit imediatamente). Pendências de entrada: modelo da planilha do robô (71531c1d, CL-009) e exportação dos leads do APP CRC (eec75533, CL-PEND-001). Próximo passo: champion pede a próxima task ("próxima task").

Repositório de destino: `drkgod/l-a-rodrigues-odontologia` (privado).

13/10/2026 — análise documental definida nas sete SPECs; perguntas limitadas a lacunas comprovadas. Quatro descrições ajustadas sem alterar metadados ou estados. Conteúdo do Drive já verificado e lido (planilha de tempos estruturada em abas db_).

14/10/2026 — SPECs e tarefas corrigidas para sequência individual. Cinco incrementos novos abertos;49cards anteriores preservados/restaurados com seus metadados. A revisão documental não implementou nem aprovou o incremento. A tela Sem regra continua para duração; plano/gate clínico precedem novas ofertas e reservas de tratamento. Avaliação sem execução de tratamento não exige plano.
