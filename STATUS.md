# Estado operacional

13/10/2026: fase 1 em execução — 7/49 cards concluídos (task 7805f88a + subtask 556859ba, base da unidade piloto com acesso por função + tela de provas; task c7194c3e + subtasks a38335a3 e 416ed8cc, agenda do Clinicorp na central: importação por arquivo, catálogos, agenda do dia e provas P1-02..P1-08; task 1f4de19d, tabela de duração: importação versionada com aprovação, 22 regras reais no formato de 2 variáveis, provas P2-07/P2-08; task f4982b80, tabela por dentista: campo profissional, 27 regras reais ativas (SISOS: específica por dentista prevalece, padrão 40 min pela decisão do dono), com debug da P1-08 no 1º teste). Sistema Lai no ar em https://projeto-lai-19327.goskip.app (Skip 65741, v0.0.23, ref b6e6890), QA 100% verde, provas executadas e aprovadas pelo champion na tela (evidências 13/10 ~14:42, ~17:46 e 20:14-20:31).

Fundamentação mantida: fixture/arquivo/cadastro manual; zero chamadas a APIs externas; nenhuma mensagem de teste enviada. Conexões e piloto real passam para a fase 4; segunda unidade/validação para a 5. Sistemas atuais continuam em uso.

Datas históricas dos cards a replanejar (vários vencidos durante o preparo). Próximo passo: champion pede a próxima task ("próxima task") — em ordem vem "Definir as regras de confirmação e liberação de vagas" (a9f9e30e) ou "Mostrar o tempo sugerido ao planejar um agendamento" (097ff6ce, a próxima da SPEC-1-002 que consome a tabela já cadastrada).

Repositório de destino: `drkgod/l-a-rodrigues-odontologia` (privado).

13/10/2026 — análise documental definida nas sete SPECs; perguntas limitadas a lacunas comprovadas. Quatro descrições ajustadas sem alterar metadados ou estados. Conteúdo do Drive já verificado e lido (planilha de tempos estruturada em abas db_).
