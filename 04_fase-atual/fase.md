# Fase 2 — Tarefas

<!-- fase-format:2 -->

- [x] Comparar os números do painel com a contagem direta da base @"L A Rodrigues" !26/10/2026 ✅ 23/10/2026 (15/15 indicadores conferidos, zero divergência; P2.1-01 custo sem entrada = "dados insuficientes"; relatório em 05_entregas/fase-2/comparacao-do-painel.md; comparação no lote do dia de uso fica pra depois do CL-008)  <!-- id:22d83348-1372-46f4-88cd-0cf15f55cd06 -->
  > Para cada indicador do painel e da linha de base, o número da tela ao lado da contagem direta, no mesmo período; sem dado da clínica aparece "dados insuficientes". SPEC-2-001 · CA-2-01.
- [x] Escrever o roteiro de uso da central para cada função @"L A Rodrigues" !27/10/2026 ✅ 23/10/2026 (roteiro das 5 funções + conferência de usuários em 05_entregas/fase-2/uso-pela-equipe.md; usuários reais a criar pela gestão antes do dia de uso; tabela de problemas pronta pra preencher)  <!-- id:bffde635-3aa5-48b1-ab88-a76834e96eb2 -->
  > Conferir que cada função tem usuário e escrever o passo a passo da CRC, da recepção, do dentista e da gestão para o dia de uso. SPEC-2-001 · CA-2-02.
- [ ] Corrigir os problemas encontrados no dia de uso @"L A Rodrigues" !06/11/2026  <!-- id:abb0fefa-2464-47b8-80a4-60ffc453ea8c -->
  > Começa depois do dia de uso da clínica; até lá a construção segue pela SPEC-2-002. Corrigir o que está no aceite da fase 1 e levar o resto ao consultor. SPEC-2-001 · CA-2-03, CA-2-04.
- [ ] Criar a lista de tarefas de cada pessoa @"L A Rodrigues" !28/10/2026  <!-- id:f046773a-58f1-465a-8f40-da7a840b8e36 -->
  > Criar tarefa à mão e ver as suas em Minhas tarefas; sem responsável ativo, prazo, descrição ou paciente/lead é recusada, e a mesma origem nunca cria duas. SPEC-2-002 · CA-2-05, CA-2-08.
- [ ] Concluir tarefa com desfecho registrado na ficha @"L A Rodrigues" !29/10/2026  <!-- id:59352d82-b2a5-4e7a-a730-cda2db3037b6 -->
  > Concluir exige o resultado, "sem contato" pede a próxima tarefa ou o motivo, cancelar exige motivo, e tudo entra no histórico da Ficha. SPEC-2-002 · CA-2-06.
- [ ] Mostrar à gestão as tarefas vencidas e sem responsável ativo @"L A Rodrigues" !30/10/2026  <!-- id:e3f767d3-e42c-4910-afae-532bf8e12e80 -->
  > Vencidas em destaque para o dono e para a gestão; tarefas de usuário desativado vão para a gestão reatribuir. SPEC-2-002 · CA-2-07.
- [ ] Registrar na ficha o que o lead contou à CRC @"L A Rodrigues" !03/11/2026  <!-- id:58110848-dd3b-44b1-b206-fbe4319f23dd -->
  > Dor, impacto, desejo, motivo para buscar agora, objeção, decisor e canal preferido, como no guia da CRC; vazio fica "não informado". SPEC-2-003 · CA-2-09.
- [ ] Registrar a avaliação com resultado, resumo e combinados @"L A Rodrigues" !04/11/2026  <!-- id:e93d9923-12ab-4611-ba19-08370535af4a -->
  > Pelo Atendimento do dia, com a marca "copiado para o Clinicorp"; a CRC vê resultado e combinados, nunca o resumo; dentista só dos seus pacientes. SPEC-2-003 · CA-2-10, CA-2-13.
- [ ] Transformar os combinados aprovados em tarefas @"L A Rodrigues" !05/11/2026  <!-- id:7ee8a4c0-897c-4e71-b2f4-4b69ce3cf72b -->
  > Ao aprovar, cada combinado vira tarefa do responsável, sem duplicar; avaliação em rascunho gera a tarefa de aprovar. SPEC-2-003 · CA-2-11.
- [ ] Corrigir uma avaliação aprovada sem perder o histórico @"L A Rodrigues" !06/11/2026  <!-- id:c9b7db52-cf3f-4ed7-9b86-ddf5d9fcb6c8 -->
  > A correção cria versão nova, cancela com motivo as tarefas que deixaram de valer e cria "Revisar combinado corrigido" para quem já tinha feito. SPEC-2-003 · CA-2-12.
- [ ] Bloquear a gravação sem termo aprovado ou sem autorização do paciente @"L A Rodrigues" !09/11/2026  <!-- id:5553c749-7158-46cb-a7e9-ab1f9f8e80b6 -->
  > A gestão cadastra o termo e a recepção ou o dentista registram a decisão do paciente; sem termo ou com recusa, gravar fica bloqueado. SPEC-2-004 · CA-2-14.
- [ ] Gravar a avaliação quando o paciente autorizar @"L A Rodrigues" !10/11/2026  <!-- id:e04eeb1a-1a57-4308-ab03-dd0b4b0895a4 -->
  > Partes de até 10 minutos, protegidas desde o envio e reenviadas sem duplicar; a avaliação mostra "transcrição não disponível nesta fase". SPEC-2-004 · CA-2-15, CA-2-18.
- [ ] Deixar só a gestão ouvir o áudio, com registro de acesso @"L A Rodrigues" !11/11/2026  <!-- id:a8f60f01-76a3-459b-9d69-046d874421a7 -->
  > Só a gestão ouve, pela central, e cada vez fica registrada; dentista, recepção e CRC não recebem o áudio. SPEC-2-004 · CA-2-16.
- [ ] Apagar os áudios depois de 90 dias ou na revogação @"L A Rodrigues" !12/11/2026  <!-- id:5eb21b1d-c6e1-4fc4-aa03-f7dbd50bcaca -->
  > Rotina diária apaga o áudio no 90º dia e mantém a avaliação e o resumo; a revogação apaga os áudios da avaliação. SPEC-2-004 · CA-2-17.
- [ ] Calcular a média de tempo de cada dentista @"L A Rodrigues" !13/11/2026  <!-- id:0a04a3a8-7c96-4788-a663-6a4c4af35021 -->
  > Só atendimentos com início, fim e planejamento válidos, com amostra mínima; mostra média, mediana e excluídos; a gestão ajusta janela e amostra. SPEC-2-005 · CA-2-19, CA-2-20, CA-2-22.
- [ ] Atualizar a tabela de duração com a média validada @"L A Rodrigues" !16/11/2026  <!-- id:197073b8-9623-4d46-b248-31b1188bca9a -->
  > Um avaliador habilitado valida, a gestão publica a versão que muda só aquela regra e o Planejar sugere o tempo novo; dá para rejeitar e reverter. SPEC-2-005 · CA-2-21.
