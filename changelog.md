## 2026-10-20 — task b2cb546c (teste humano aprovado) — CONCLUÍDA

- Teste humano aprovado pelo dono ("testei passou" ~10h22) na v0.0.92 (07daddf).
- Fluxo de reposição de vaga provado de ponta a ponta com as mãos do dono:
  - 3 mensagens registradas (botão "Mensagem 1/3" novo na tela Confirmações, v0.0.89).
  - Mover não respondentes → lista de ligação; ligação sem sucesso registrada (botões novos DENTRO da lista de ligação, v0.0.92).
  - Gate de liberação recusou 2x com a regra certa (ligação fora da véspera; corte 17h) — comportamento correto provado.
  - Liberação decidida com fixture de relógio; cancelamento comprovado via API (simulando leitura) → "Conciliar agora" → vaga LIBERADA com evidência.
- Gaps corrigidos no caminho: import registrarMensagem faltando (v0.0.90), contador capado 3/3 (v0.0.91).
- Massa de teste apagada (9 registros: mensagens, ligação, liberação, contato, consulta, profissional).
- Oferta/aceite da vaga ficam nas tasks e2369241/36cdfc82 (dependem da emenda CA-SEQ-06) — fora do escopo deste teste.

## 2026-10-20 — task d03a15ee + d45e8f8a (v0.0.88 9b843b1) — CONCLUÍDA

- Lead acompanha até o comparecimento (CA-1-17): vínculo automático por telefone (migration 0017: agenda_itens.lead) — consulta criada → agendado, confirmação → confirmado, cancelamento → aguardando_retorno; chegada manual → compareceu/faltou (botões na tela Leads + guarda de etapa).
- Relatório de origem por campanha/período (rota /leads/relatorio-origem + card na tela Leads, sem dados pessoais); prova P3-07 na tela Provas.
- E2E no ar: vínculo→agendado ✓, guarda 400 ✓, agendado→compareceu ✓.
- FIX entrada_em (v0.0.88 9b843b1): entrada_em é autodate (ignora escrita via API) — data real do APP CRC agora em data_entrada (migration 0018); relatório de origem usa data_entrada com fallback; backfill dos 4.117 leads com a Data registro das planilhas (4.108 ok, 9 recuperados depois; 0 sem data).
- Teste humano APROVADO pelo dono (chegada compareceu provada no print; guarda recusou 2º registro como esperado).
- rev.2-6: hook reescrito por scoping do JSVM (função top-level não é visível em callback — QA pegou) e roteamento por campos (e.collection não veio no evento).

## 2026-10-20 — task eec75533 (v0.0.82 11f8bef) — CONCLUÍDA

- Importação dos leads em aberto do APP CRC — planilhas ALC (2.449 válidas) e ITA (1.683) importadas: 4.117 leads gravados com ficha vinculada, fase do APP CRC mapeada pra etapa da central (novo/em_atendimento/aguardando_retorno/agendado), entrada_em preservada, marca importado_app_crc (migration 0016).
- Importador agora aceita .xlsx direto (parser na tela Leads). Dedup por id_app_crc/telefone provado (3.956 duplicados pulados na reimportação).
- Teste humano aprovado pelo dono ("confirmo o teste, fecho a task") na v0.0.82 (11f8bef).

## 2026-10-19 — task 84b8f8d6 (v0.0.81 89dd14d) — CONCLUÍDA

- Limites por agenda/turno ATIVOS (dono 13/10): Leonel 5/turno (ITA qua 16h+), Wesley e Pamella 20/turno individual, Erika 2/horário sábado ortodontia.
- Gate corrigido (unidade de origem aceita na piloto, política que COBRE a hora prevalece, horario_marcado com limite específico); provas P4-13/14/15 na tela Provas.
- E2E provado no ar: Leonel 6ª bloqueada ✓, Wesley 21ª manhã bloqueada + tarde livre ✓, Erika 3ª sábado bloqueada ✓; vínculo por nome da política da Erika corrigido (Dra. Erika); massa de teste limpa (0 restantes).

## 2026-10-19 — task 8421e27b (v0.0.77-79) — CONCLUÍDA

- Sinal de sobreposição/conflito no Planejar (CA-1-21): "Ligar reserva" consulta a capacidade antes de gravar (avaliação bloqueia no 3º por horário, tratamento bloqueia horário sobreposto, política pendente nunca vira ilimitada); badge do regime (Avaliação/Tratamento) junto do tempo sugerido.
- rev.2 (v0.0.78 680d586): BUG do motor de duração corrigido — matcher "inverso" espelhava quantidades (5 implantes + 2 extrações casava 40min errado); agora só casa regra direta e o caso sem regra vai pra lista "Casos sem regra" pra direção validar. "Tipo do agendamento" (Avaliação/Tratamento) é escolha no formulário do Planejar.
- rev.3 (v0.0.79 6a79d2f): avaliação é consulta fixa (CL-004) — com tipo "Avaliação" o formulário esconde procedimento/quantidade e o resultado mostra "X min (consulta de avaliação)" com a duração e o limite da config da unidade (30 min / 2 por horário).
- Teste humano aprovado ("testei deu certo") na v0.0.79 (6a79d2f). Revalidação do zero: sem_regra 5+2 ✓, 2+2=40 ✓, 2+1=30 ✓, config 30/2 gravada ✓, versão no ar = testada ✓.

## 2026-10-19 — task f79847a5 (v0.0.66-76) — CONCLUÍDA

- Lista de ligação operacional (registrar ligação por contato), decidir liberação com gate no servidor, painel de liberações + conciliar agora, conciliação automática após importação (CA-1-22), rota /liberacoes/conciliar + migration 0015.
- Provas P4-06 e P4-12 passando no ar; P4-04/05/07 regressão ok.
- Debugs: "Mover não respondentes" não levava contatos com resposta "Sem resposta" (filtro só aceitava estado=mensagem_enviada → corrigido, v0.0.70); cobertura cadastrada não atualizava quem já estava na lista (rota nova mover-nao-respondentes-v2 em arquivo novo, pod fresco, v0.0.74); causa final do "a definir": 3º argumento vazio no findFirstRecordByFilter (assinatura inválida derrubava a busca da cobertura pro catch) → corrigido e PROVADO no navegador (v0.0.76 e7770c1: "manhã | Thays" na lista de ligação).
- Teste humano aprovado ("testei passou") na v0.0.76 (e7770c1).

## 2026-10-17 — task 35bff70c (v0.0.60-65) — CONCLUÍDA

- Ficha do paciente no ar: histórico append-only com autor/hora, próxima ação com prazo vencido destacado, acesso por função (dentista sem acesso), ficha única (lead cria ficha vinculada) + Nova ficha (rota /backend/v1/ficha/criar, gestão/CRC, RN-03 duplicado).
- Teste humano aprovado pelo dono ("Testei e passou" ~14h53) na v0.0.65 d03e183. fase.md 22/54 (41%).
- 3 rodadas de debug pegaram bugs reais: filtro texto×relação (P3-09a — listarEventos filtrava paciente/lead TEXTO mas migration 0010 trocou por relações; 500 no PocketBase v0.36), campo teste inexistente em users + e-mail escondido no create (P3-09b — PocketBase esconde e-mail de auth quando emailVisibility=false; fix: variável local emailProva com o e-mail ENVIADO).

## 2026-10-17 — task f124df8f (v0.0.56-59) — CONCLUÍDA

- Resposta do paciente na tela Confirmações (confirmou/remarcação/cancelou/sem resposta), mover não respondentes p/ lista de ligação com responsável do turno, cobertura de ligação (migration 0014), provas P4-03/03b.
- Testado pelo dono ("pode seguir" 00h27) na v0.0.59 f4d3b7b.
- Debugs: "Value must be unique" na lista-dia (rota não achava contato da massa e duplicava agenda_item; busca sem filtrar teste, v0.0.57); massa 2× acumulava 8 consultas (criarMassaConfirmacao idempotente, v0.0.58); "getString is not a function" (SDK JS devolve record como objeto, não Record do servidor — provas corrigidas pra campos diretos, v0.0.59).

## 2026-10-16 — task fdca5fb0 (SPEC-1-002, CA-1-10/11) — CONCLUÍDA

- Desvio de duração + conciliação de reservas no ar (v0.0.55, ref ff39792); testado pelo dono ("pode seguir" 19h36); provas P2-05b/P2-06 aprovadas na tela.
- Migration 0013 (aditiva): coleção desvios_duracao + campos em planejamentos (paciente, agenda_item rel único, minutos_reservados, criado_por) + valores novos de situacao (planejado/reservado/reserva_nao_encontrada/cancelado) preservando os existentes.
- Hook duracao_sugerir.js +4 rotas: ligar-reserva (reserva simulada, mesmo profissional, item livre; diferença usa tempo ARREDONDADO e cria desvio sem_motivo — RN-04), motivo-desvio (obrigatório → justificado), revisar-desvio (gestão → revisado), conciliar (RN-05/06 on-demand, sem cron).
- Tela Planejar: botão "Ligar reserva" nos badges de vagas, diálogo de motivo, card "Desvios de duração", card "Conciliação de reservas".
- 3 rodadas de debug: "Only superusers" (prova criava registro direto + hook gravava 'sugerido' fora do select → provas via rota sugerirDuracao(teste=true) + hook grava 'planejado', v0.0.53); 500 "Something went wrong" (getBoolean não existe no JSVM → getInt('campo') !== 0 nas 5 ocorrências, v0.0.54); "massa P2: 0 regras" (dedup por hash devolve ja_aplicado=true com 0 regras em reimport — correto; prova corrigida pra aceitar ja_aplicado, v0.0.55).

## 2026-10-16 — task 5bcfa6f1 (SPEC-1-004, CA-1-18) — CONCLUÍDA

- Rota /backend/v1/confirmacao/lista-dia no hook confirmacao_regras.js: consultas do dia-alvo ganham contato pendente se não tiverem (RN-01 idempotente); lista em ordem de horário com telefone validado e mensagem montada do modelo (fallback CL-009).
- Serviço confirmacao.ts: gerarListaDia, dividirSaidas (XLSX até limite / envio manual / corrigir telefone) e exportarXlsx (SheetJS import dinâmico; registro RN-15 em provas_execucoes; exportar NUNCA cria tentativa — RN-02).
- Tela nova /confirmacoes (SomenteGestao): dia-alvo (default amanhã), tabela em ordem de horário, 3 blocos de saída, exportação com prévia/toast, banner "a central não envia mensagens nesta fase".
- Provas P4-01 (lista do dia: 4 consultas, 3 válidas + 1 inválida, idempotência) e P4-02 (limite 2 → 2 XLSX + 1 manual + 1 corrigir; exportação cria 0 tentativas).
- Debug: "não consegui baixar a planilha" (lista vazia) → sem consultas no dia-alvo (massa da prova se auto-apaga) + UX sem orientação → botão "Criar massa de teste" na tela + textos de estado (v0.0.50 6e10115).
- Teste humano aprovado ("testei, pode seguir" 15h27) na v0.0.50. Aprendizado: AP-2026-10-16-1527 (massa da prova auto-apaga → massa na tela).

## 2026-10-16 — task 55a359b0 (SPEC-1-003, CA-1-14/15, CA-SEQ-03) — CONCLUÍDA

- Migration 0012: coleção pendencias (paciente, telefone, procedimento, dentista, situação de execução, agendamento futuro verificado, disponibilidade 1/2, prontidão, motivo de revisão, origem, teste) + campo pendencias_desde em config_unidade.
- Hook pendencias_regras.js: rotas server-side /pendencias/importar (CSV linha a linha, rejeita com motivo, dedup por paciente+procedimento+profissional+arquivo), /pendencias/estado (executada/aguardando_condicao com motivo) e /pendencias/verificar-agendamento (cruza agenda_itens: mesmo paciente+profissional, data futura, não cancelado).
- Serviço pendencias.ts + tela /pacientes-a-agendar (SomenteGestao): 3 seções — A agendar, Agendado (verificado) e Para revisão (com motivo); importação CSV com prévia; disponibilidade e prontidão editáveis; marcar executada com confirmação.
- Emenda CA-SEQ-03: pendência de tratamento sem plano aprovado vai para "para revisão" com motivo "aguarda sequência/liberação do avaliador" — não é elegível de encaixe.
- Provas P3-04, P3-05, P3-06 e P3-11 parcial na tela Provas; regressão P3-01..03 e P2-01..05 intocada.
- Teste humano aprovado ("testei, pode seguir" 14h20) na v0.0.48 (a347b1e), após 2 correções de bugs pegos no teste: P3-05 (hook texto×relação) e P3-11 (prova com massa oposta ao cenário). Aprendizados: AP-2026-10-16-1420 (migration não aplica — pod velho) e AP-2026-10-16-1421 (texto×relação + prova vs cenário).

## 2026-10-16 — task 6d5de2f5 (SPEC-1-002, CA-1-09) — CONCLUÍDA

- Migration 0011_planejamentos_validacao: campos validado_por (text) e validado_em (date) em planejamentos; aditiva, down remove os 2.
- Serviço planejamento.ts: descreverItens movida da tela (fonte única), agruparSemRegra (agrupa pendentes por combinação+profissional, ordena por repetição e depois mais recente) e validarCombinacao (grava validado_por = e-mail da sessão + validado_em em todos os ids do grupo).
- Tela Planejar: card "Casos sem regra" AGRUPADO — descrição, dentista, badge de contagem ("N ocorrências"), data da última ocorrência e botão "Marcar como validado" (só gestão, com confirmação).
- Prova P2-05 na tela Provas: 2 ocorrências iguais → 1 grupo com contagem 2; validar → sai dos pendentes com autoria gravada; combinação diferente segue pendente. Massa de teste apagada no fim.
- Publicado v0.0.41 (e442ea4); QA verde 1ª tentativa. Migration 0011 aplicada na nuvem. Nada alterado no motor (duracao_sugerir.js intocado).
- Debug do teste humano: P2-05 falhou com "agrupamento inesperado: 3 grupo(s)" — resíduo de execuções anteriores contaminou a contagem; prova agora agrupa EXATAMENTE os 3 planejamentos que ela mesma criou e limpa resíduo antes de montar a massa (v0.0.42 d9a5e12). Bug era da prova, não do produto.
- Teste humano aprovado (16/10 10h54: "testei, pode seguir"). fase.md 13/54 cards. Aprendizado capturado (2 padrões: prova imune a resíduo; push truncado no GitHub).

## 2026-10-14/15 — task 6d5de2f5 (bloqueio e retomada)

- Autorizada ("pode seguir" 21h38 14/10); implementação não iniciada — orçamento da sessão esgotou na exploração. Plano pronto em .adapta-cliente/analises/6d5de2f5-lista-sem-regra.md.
- 22h30 BLOQUEIO: conector Skip (mcp_skip) desconectou da sessão antes da 1ª escrita — 15+ rediscovery sem sucesso; nada alterado no Skip (v0.0.40 no ar). Subagente com descoberta de ferramentas do zero TAMBÉM não achou mcp_skip (3 buscas): o runtime do assistente carregou o registro de conectores do runtime stale, uptime 32d. Fix: reiniciar o ETHOS e mandar "pode seguir".
- Rascunhos completos salvos em .adapta-cliente/rascunhos/6d5de2f5/ (migration 0011, adições planejamento.ts, prova P2-05, patch Planejar.tsx, teste de mesa 9 casos) — GitHub 0e3d888.
- Heartbeat indevido enviado ao GitHub por erro de chamada e REMOVIDO (commits 6f50189→0bc9ff4). Lição: nunca usar push_files para teste de conexão.
- 23h32 14/10: dono reconectou o Skip (print: CONECTADOS 10, Skip verde). Retomada em 15/10.

## 2026-10-14 — task 8d76cea5 / ac46ef6d (registro)

- Checkboxes re-marcar [x] (concluídos e testados 14/10 — correção de 16/10 não foi gravada em commit e se perdeu no reset; lição: housekeeping vai no commit imediatamente).
