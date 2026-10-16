## 2026-10-16 — task fdca5fb0 (SPEC-1-002, CA-1-10/11) — IMPLEMENTADA E PUBLICADA
- Migration 0013 (aditiva): coleção desvios_duracao + campos em planejamentos (paciente, agenda_item rel único, minutos_reservados, criado_por) + valores novos de situacao (planejado/reservado/reserva_nao_encontrada/cancelado) preservando os existentes.
- Hook duracao_sugerir.js +4 rotas: ligar-reserva (reserva simulada, mesmo profissional, item livre; diferença usa tempo ARREDONDADO e cria desvio sem_motivo — RN-04), motivo-desvio (obrigatório → justificado), revisar-desvio (gestão → revisado), conciliar (RN-05/06 on-demand, sem cron).
- Tela Planejar: botão "Ligar reserva" nos badges de vagas, diálogo de motivo, card "Desvios de duração", card "Conciliação de reservas".
- Provas P2-05b (60×40 → sem_motivo +20 → justificado → revisado) e P2-06 (item órfão; planejamento de HOJE não marcado) na tela Provas.
- Publicado v0.0.52 (b6e4f44) 18:38 UTC; QA verde (1 erro de migration corrigido: pl.save → app.save); migration na nuvem provada; 4 rotas provadas no ar (401 anônimo).
- Registro: checkbox da task 8d76cea5 (concluída e testada em 14/10) estava dessincronizado no fase.md — corrigido.

## 2026-10-16 — task 5bcfa6f1 CONCLUÍDA (teste humano aprovado pelo dono)
- "testei, pode seguir" 15h27 na v0.0.50, após debug do download (massa de teste na tela + textos de estado).
- Verificação independente: versão no ar = testada (6e10115, lastPublishedRef igual); QA verde; segredos limpos; GitHub 7/7 código + registros; rotas 401 anônimo; banco sem resíduo de massa (0 itens de teste); checklist de UI 10/10; diff 100% coberto por CA-1-18 + RN-01/02/15.
- Aprendizado capturado: AP-2026-10-16-1527 (massa da prova auto-apaga → massa na tela).

- 2026-10-16 · [Luiz] · DEBUG task 5bcfa6f1: "não consegui baixar a planilha" (lista vazia) → causa raiz: sem consultas no dia-alvo (massa da prova se auto-apaga; agenda real não importada) + UX sem orientação → corrigido: botão "Criar massa de teste" na tela + textos de estado (skip 6e10115 v0.0.50).
## 2026-10-16 — task 5bcfa6f1 (SPEC-1-004, CA-1-18) — IMPLEMENTADA E PUBLICADA
- Rota /backend/v1/confirmacao/lista-dia no hook confirmacao_regras.js: consultas do dia-alvo (APPOINTMENT, não canceladas/excluídas) ganham contato pendente se não tiverem (RN-01 idempotente); lista em ordem de horário com telefone validado e mensagem montada do modelo (fallback CL-009 da SPEC: nome, telefone, mensagem).
- Serviço confirmacao.ts: gerarListaDia, dividirSaidas (XLSX até limite / envio manual / corrigir telefone) e exportarXlsx (SheetJS import dinâmico; registro RN-15 em provas_execucoes; exportar NUNCA cria tentativa — RN-02).
- Tela nova /confirmacoes (SomenteGestao): dia-alvo (default amanhã), tabela em ordem de horário com estado do contato, 3 blocos de saída, exportação com prévia/toast, banner "a central não envia mensagens nesta fase". Estados: carregando, vazio, erro role=alert.
- package.json: dependência xlsx@^0.18.5 (import dinâmico — só carrega na exportação).
- Provas P4-01 (lista do dia: 4 consultas, 3 válidas + 1 inválida, idempotência na 2ª geração) e P4-02 (limite 2 → 2 XLSX + 1 manual + 1 corrigir; exportação cria 0 tentativas) na tela Provas.
- Publicado v0.0.49 (15579f4) 17:31 UTC; QA verde na 1ª tentativa; rota provada no ar (401 anônimo); pendências só .skip.config.json.

## 2026-10-16 — task 55a359b0 CONCLUÍDA (teste humano aprovado pelo dono)
- "testei, pode seguir" 14h20 após 2 correções de bugs pegos no teste: P3-05 (hook texto×relação) e P3-11 (prova com massa oposta ao cenário).
- Verificação independente: versão no ar = testada (v0.0.48, a347b1e, lastPublishedRef igual); QA verde; segredos limpos; diff 100% coberto por CA-1-14/15 + CA-SEQ-03 (sem sobra de escopo, sem linha vermelha); GitHub 8/8 arquivos de código + registros; rotas 401 anônimo; coleção pendencias com regra de acesso provada; checklist de UI 11/11.
- Aprendizado capturado: AP-2026-10-16-1420 (migration não aplica — pod velho) e AP-2026-10-16-1421 (texto×relação + prova vs cenário).

## 2026-10-16 — task 55a359b0 (SPEC-1-003, CA-1-14/15, CA-SEQ-03) — IMPLEMENTADA E PUBLICADA
- Migration 0012: coleção pendencias (paciente, telefone, procedimento, dentista, situação de execução, agendamento futuro verificado, disponibilidade 1/2, prontidão, motivo de revisão, origem, teste) + campo pendencias_desde em config_unidade. Migration aplicou só no 2º apply (pod do backend não recarregou na 1ª publicação — tocada no hook pra forçar reload, v0.0.46).
- Hook pendencias_regras.js: rotas server-side /pendencias/importar (CSV linha a linha, rejeita com motivo, dedup por paciente+procedimento+profissional+arquivo), /pendencias/estado (executada/aguardando_condicao com motivo) e /pendencias/verificar-agendamento (cruza agenda_itens: mesmo paciente+profissional, data futura, não cancelado).
- Serviço pendencias.ts + tela /pacientes-a-agendar (SomenteGestao): 3 seções — A agendar (pendências prontas + leads em_atendimento/aguardando_retorno + faltas a reagendar), Agendado (verificado) e Para revisão (com motivo); importação CSV com prévia; disponibilidade e prontidão editáveis; marcar executada com confirmação.
- Emenda CA-SEQ-03: pendência de tratamento sem plano aprovado vai para "para revisão" com motivo "aguarda sequência/liberação do avaliador" — não é elegível de encaixe.
- Provas P3-04 (pendência entra/sai), P3-05 (agendamento futuro verificado → agendado), P3-06 (aguardando_condicao → revisão) e P3-11 parcial (sem plano → revisão) na tela Provas; regressão P3-01..03 e P2-01..05 intocada.
- Publicado v0.0.46 (0ce4ea1) 14:08 UTC; QA verde (1 erro meu de </CardBody> corrigido no 2º apply). Produção provada: lastPublishedRef = 0ce4ea1; coleção pendencias na nuvem (anônimo vê 0); rotas anônimo = 401 (regras de acesso ok). E2E completo por API fica para o teste humano (login do dono).

- 16/10 10h54: teste humano APROVADO pelo dono ("testei, pode seguir"). Task 6d5de2f5 CONCLUÍDA (v0.0.42, d9a5e12 no ar). fase.md 13/54 cards. Aprendizado capturado (2 padrões: prova imune a resíduo; push truncado no GitHub).

## 2026-10-16 — task 6d5de2f5 (debug teste humano)
- Teste do dono pegou bug real: P2-05 falhou com "agrupamento inesperado: 3 grupo(s)" — a asserção lia a coleção INTEIRA de planejamentos de teste; resíduo de execuções anteriores contaminou a contagem (50 execuções registradas).
- Correção (v0.0.42, d9a5e12, QA verde, publicado 13:45 UTC): a prova agora agrupa EXATAMENTE os 3 planejamentos que ela mesma criou (ids devolvidos pela rota) e limpa resíduo de planejamentos de teste antes de montar a massa. Mensagem de erro enriquecida com os grupos encontrados.
- Motor, tela e validação intocados — bug era da prova, não do produto.

## 2026-10-15 — task 6d5de2f5 (SPEC-1-002, CA-1-09) — IMPLEMENTADA E PUBLICADA
- Migration 0011_planejamentos_validacao: campos validado_por (text) e validado_em (date) em planejamentos; aditiva, down remove os 2. Aplicada na nuvem (21:29 UTC).
- Serviço planejamento.ts: descreverItens movida da tela (fonte única), agruparSemRegra (agrupa pendentes por combinação+profissional, ordena por repetição e depois mais recente) e validarCombinacao (grava validado_por = e-mail da sessão + validado_em em todos os ids do grupo).
- Tela Planejar: card "Casos sem regra" agora AGRUPADO — descrição, dentista, badge de contagem ("N ocorrências"), data da última ocorrência e botão "Marcar como validado" (só gestão, com confirmação explicando o efeito). Lista carrega ao abrir a tela (antes só após consultar).
- Prova P2-05 na tela Provas (SPEC-1-002): 2 ocorrências iguais → 1 grupo com contagem 2; validar → sai dos pendentes com autoria gravada; combinação diferente segue pendente. Massa de teste apagada no fim.
- Publicado v0.0.41 (e442ea4) 21:29 UTC; QA verde 1ª tentativa (setup/static/build/integrations ok). Produção provada: lastPublishedRef = e442ea4, HTTP 200. Migration 0011 aplicada na nuvem. Nada foi alterado no motor (duracao_sugerir.js intocado — caso validado continua "sem regra" até existir regra cadastrada).
- Conector Skip ficou indisponível no runtime de 14/10 22h30 a 15/10 18h20 (5 buscas + subagente sem sucesso; reinício do app não reescaneou). Resolvido com novo pedido de conexão ao dono — reconexão concluída pelo dono e descoberta refeita nesta sessão.

## 2026-10-14 — task 6d5de2f5 (SPEC-1-002, CA-1-09)
- Autorizada ("pode seguir" 21h38) e analisada; implementação NÃO iniciada — orçamento da sessão esgotou na exploração (TabelaDuracao.tsx não está no espelho; busca no git consumiu os passos). Nada alterado no Skip (v0.0.40 segue no ar, task 8d76cea5 concluída 15/49).
- Plano pronto em .adapta-cliente/analises/6d5de2f5-lista-sem-regra.md: agrupamento por combinação+dentista com contagem, botão validar com confirmação, migration 0011 (validado_por/em), prova P2-05.
- Heartbeat indevido enviado ao GitHub por erro de chamada e REMOVIDO (commits 6f50189→0bc9ff4). Lição: nunca usar push_files para teste de conexão.
- 22h30 BLOQUEIO: "pode seguir" recebido, mas o conector Skip (mcp_skip) desconectou da sessão antes da 1ª escrita — 15+ rediscovery sem sucesso; nada alterado no Skip (v0.0.40 no ar). Estado bloqueada; implementação da 6d5de2f5 retoma quando o conector voltar.
- 23h16: 2ª tentativa após novo "pode seguir" — mcp_skip AINDA ausente; conector em "applying" aguardando conclusão pelo dono na tela Conectores. Nada alterado no Skip.
- 23h25: rascunhos completos da 6d5de2f5 salvos em .adapta-cliente/rascunhos/6d5de2f5/ (migration 0011_planejamentos_validacao, adições planejamento.ts com agruparSemRegra/validarCombinacao, prova P2-05, patch Planejar.tsx, teste de mesa 9 casos). Skip ainda sem conexão; v0.0.40 intacta.
- 23h32: dono reconectou o Skip (print: CONECTADOS 10, Skip verde). Sessão atual do assistente segue SEM expor mcp_skip (descoberta carregada com servidor fora não recarrega). Diagnóstico: sessão nova resolve. Rascunhos prontos no GitHub 0e3d888.
- 02h41: teste decisivo — subagente com descoberta de ferramentas do zero TAMBÉM não achou mcp_skip (3 buscas). Desmente "sessão nova resolve": o runtime do assistente carregou o registro de conectores com o Skip fora e só reescaneia com reinício completo do app. Fix: dono reinicia o ETHOS e manda "pode seguir".