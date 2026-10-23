# Fase 2 — Rotinas internas e contexto da avaliação

A fase 2 começa com a equipe usando a central da fase 1. Depois acrescenta o que acontece em volta da avaliação:
- **Tarefas:** com dono e prazo.
- **Registro da avaliação:** com o contexto do lead e os combinados.
- **Gravação:** só com autorização do paciente.
- **Média de tempo:** de cada dentista.

Nada se conecta a serviço externo nesta fase. A agenda oficial continua no Clinicorp, nenhuma mensagem sai para paciente e não há transcrição nem IA.

| SPEC | Entrega | O que o cliente vê | Teste do cliente |
|---|---|---|---|
| [SPEC-2-001](spec-2-001-central-em-uso-pela-equipe.md) | Central em uso pela equipe | Painel comparado com a base; roteiro por função; problemas do dia de uso resolvidos | Luiz confere a comparação e os desfechos |
| [SPEC-2-002](spec-2-002-tarefas-com-dono-e-prazo.md) | Tarefas com dono e prazo | Minhas tarefas, vencidas em destaque, histórico na Ficha | Luiz e uma pessoa da CRC |
| [SPEC-2-003](spec-2-003-registro-da-avaliacao.md) | Registro da avaliação | Conversa da CRC na Ficha; resultado, resumo e combinados que viram tarefas | Luiz como dentista e como gestão, e uma pessoa da CRC |
| [SPEC-2-004](spec-2-004-gravacao-autorizada-da-avaliacao.md) | Gravação autorizada da avaliação | Gravar só com autorização; só a gestão ouve; áudio apagado no 90º dia | Luiz e um dentista, com o termo de teste |
| [SPEC-2-005](spec-2-005-media-de-tempo-por-dentista.md) | Média de tempo por dentista | Média real por dentista e regra; tabela muda só com validação e publicação | Luiz como avaliador e como gestão |

## Ordem e dependências

As SPECs seguem esta ordem: 2-001, 2-002, 2-003, 2-004 e 2-005.
- **2-003 depende da 2-002:** usa as funções de criar e cancelar tarefas.
- **2-004 depende da 2-003:** grava no rascunho da avaliação.
- **2-005:** usa os tempos do Atendimento do dia e o planejamento da fase 1.
- **Enquanto não há dia de uso:** a última task da 2-001 espera o dia de uso da clínica, e a construção segue pela 2-002.

O executor constrói as tasks de cada SPEC em sequência e chama o teste do cliente quando todas as tasks daquela SPEC estiverem no ar.

## Dados da clínica que chegam nesta fase

Nenhum destes dados trava a construção. Quando chegarem, o caminho é este:
- **Custo de cada dentista e período da linha de base:** a gestão registra na Linha de base da fase 1, e o Maestro refaz a comparação da SPEC-2-001. Se a Linha de base não tiver onde registrar o custo, isso é corrigido como falha da fase 1, na mesma SPEC-2-001. Sem o dado, o indicador segue "dados insuficientes".
- **Modelo real da planilha do robô:** ajusta a lista de confirmação do dia da fase 1 (SPEC-1-004) para o modelo recebido, como correção dentro do aceite dela.
- **Exportação do Trello:** fica guardada na pasta da clínica, fora do repositório, porque tem dado de paciente. O Maestro só registra em `.adapta-cliente/fontes-do-projeto.md` que foi recebida.
- **Histórico de campanhas da agência:** é usado na fase 3, no resultado por campanha.
- **Termo de gravação aprovado:** a gestão cadastra na central (SPEC-2-004), e a gravação de pacientes reais começa.

## Fora desta fase

- **Conexões:** Clinicorp por API, WhatsApp, robô e qualquer envio ao paciente ficam para a fase 4.
- **IA:** transcrição, resumo por IA e uso do áudio para o feedback dos avaliadores ficam para a fase 4.
- **Follow-up comercial:** semáforo de leads, sequência de contato, cadências e mensagens de follow-up entram na fase 3, com a automação na fase 4.
- **Rotinas específicas:** prótese, pré-cirúrgico, financeiro e marketing ficam para a fase 3.
- **Custos:** a fase 2 não usa fornecedor pago. O painel de custo com valores manuais ou simulados, marcados como tal, entra na fase 3. O consumo real e o teto entram na fase 4.
