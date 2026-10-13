# SPEC-1-007 — Demonstração e aceite da fundamentação

**Fase:** 1 · **Status:** planejada, não implementada  
**Dono:** clínica com Maestro; revisão/aceite: Rodrigo Santos  
**Origem:** RQ-016, CL-008, AC-13-IT. Este aceite é da fundamentação; virada operacional foi movida para a fase 4.

## Contexto e decisões fechadas

As SPECs 001–006 criam o app com dados locais. Esta entrega demonstra o fluxo completo por papel sem conectar serviços externos, operar um dia real exclusivamente na central ou desligar Trello/APP CRC. Exportações anteriores são arquivos fornecidos manualmente; não construir integração com esses produtos.

## Resultado observável

Luiz, Victor e equipe completam um roteiro na demonstração, conferem resultados com a massa/arquivo e registram dúvidas, falhas e aceite. Consultor aceita somente quando provas e teste humano passam. Nenhum aceite desta fase vale como prova de API, mensagem entregue ou reserva real.

## Limites e dependências

- Depende de SPEC-1-001 a 006 construídas e suas provas, com CL-008 confirmado; não exige acesso/credencial externa.
- Inclui armazenamento de exportações autorizadas quando fornecidas, roteiros por papel, regressão e registro de aceite. Fixture satisfaz demonstração se arquivos reais faltarem; ausência registrada sem inferir migração concluída.
- Saídas: coleção `virada` (nome legado interno) e tela “Demonstração e aceite”; acesso gestão/consultor autorizado, arquivos de pacientes restritos à gestão.
- Rollback conserva eventos, vencedores locais e tentativas; não apagar dados reais nem repetir contatos. Falha mantém task aberta e retorna à SPEC causadora.
- Não inclui retirar ferramentas, testar provedor externo, go-live, migração final ou dados da segunda unidade.

## Dados e integrações

Coleção `virada`: `tipo` (arquivo_trello, arquivo_app_crc, roteiro_funcao, regressao, conferencia_painel, aceite), arquivo nativo opcional, função, resultado (ok, com_contorno, falhou), observação, autor, data, `modo_dados`, `lote_id`, `versao_app`. Backend restringe gravação de aceite ao consultor/gestor designado; mesma unidade obrigatória. Arquivo com dados reais não é publicado em captura/grupo. Nenhuma API externa.

## Fluxo e regras

1. Gestão identifica versão do app e massa/arquivo; registra exportações recebidas ou “não recebido — demonstração sintética”.
2. CRC cadastra lead com origem, planeja duração, vincula reserva de fixture/importada e registra desvio com motivo.
3. CRC de confirmação confere XLSX sem enviar; simula 3+1/corte, cancelamento explícito, oferta e dois aceites concorrentes com um vencedor local. Fixture de tentativa permanece sintética.
4. Recepção/dentista registram chegada, chamada, início/fim e falta na massa; sem baixa de horário, comparação mostra insuficiência.
5. Gestão confere painel, separação de dados de teste/importados e permissões. Qualquer “falhou” ou prova obrigatória reprovada impede aceite; “com contorno” exige limitação documentada e aceita, nunca contornar regra obrigatória.
6. Consultor revisa provas/CL-008 e aceita fundamentação. Sistemas atuais continuam em uso. Baseline oficial e virada conectada entram na fase 4.

## Instruções de execução para o Ethos

Ler SPECs 001–006 e o schema; construir tela/registros de demonstração sem alterar regras anteriores. Uma task por vez. Primeiro roteiros, depois bloqueio de aceite, depois regressão. Não acessar provedores nem inventar aceite. Em falha, guardar esperado/obtido e retornar à task/SPEC causadora; não marcar [x] antes da prova e confirmação humana.

## Checklist de execução

- [ ] Versão e massa/arquivo identificados.
- [ ] Roteiros por função e evidências guardadas.
- [ ] P1–P6 e zero chamadas externas conferidos.
- [ ] Teste humano e aceite da fundamentação registrados.

## Critérios de aceite

- [ ] **CA-1-36:** exportações recebidas são armazenadas com acesso restrito, ou ausência registrada com fixture substituta para demonstração, sem afirmar migração.
- [ ] **CA-1-37:** roteiros por função completos na massa/arquivo; nenhum sistema anterior desligado e nenhuma chamada externa.
- [ ] **CA-1-38:** regressão P1–P6 aprovada e roteiro com falha impede aceite.
- [ ] **CA-1-39:** gestão confere painel com a massa, cliente confirma CL-008 e consultor registra aceite da fundamentação e limitações. Virada real não é critério desta fase.

## TDD da SPEC

| Etapa | Prova/ação | Esperado | Evidência |
|---|---|---|---|
| RED | P7-01 iniciar sem identificar massa/versão; P7-02 roteiro falhou e tentativa de aceite | Bloqueados | provas_execucoes |
| GREEN | P7-03 fixture ou arquivo identificado com origem; P7-04 roteiros/provas obrigatórios aprovados e aceite autorizado | Demonstração e aceite liberados apenas no segundo caso | Registro de massa/provas/aceite |
| REFACTOR/REGRESSÃO | P7-05 lead → planejamento → reserva local → confirmação simulada → atendimento → painel; liberação → oferta → concorrência | Percursos completos, um vencedor local, fonte em cada tela | Evidências sem dados pessoais |
| REFACTOR/REGRESSÃO | P7-06 interceptar saídas a fornecedores; P7-07 perda de sessão/retomada e reexecução | Zero chamadas externas; nenhum evento duplicado/apagado | Esperado/obtido, logs internos |

## Teste humano do cliente

CL-008: Luiz/Victor, CRC, recepção e dentista seguem roteiro na massa, sem telefone real ou contato externo. Resultado esperado: fluxo completo, painel confere, dados/permissões claros e sistemas atuais continuam disponíveis. Cada papel registra resultado; resposta “testei, pode seguir” com limitações e massa no card. Consultor decide aceite; o silêncio não aprova.

## Handoff e operação

Próxima fase aprofunda rotinas internas; credenciais e go-live ficam para a fase 4. Nenhuma task de operação clínica foi executada neste trabalho documental. Preservar log/versionamento e abrir correção na SPEC correspondente quando necessário.

## Tasks vinculadas

Fonte editável: `04_fase-atual/fase.md`. Títulos históricos/UUIDs preservados; descrição atual define o recorte local. Status/responsável/prazo somente nos cards.

| ID | Task | Critério | Prova/evidência | Pré-condição |
|---|---|---|---|---|
| ee4d87d7-d467-46d3-bbea-cfc5b60a959e | Exportar o histórico do Trello e do APP CRC | CA-1-36 | P7-03 | Dados locais e dependências desta SPEC |
| 08034e11-3455-4cc7-9531-96be0e75f0f1 | Revisar as evidências e aceitar as entregas da fase 1 | CA-1-39 | P7-04/05/06 | Dados locais e dependências desta SPEC |
| b9de8e96-cdcc-4cf7-83c2-160d89548e79 | Decidir o fechamento da fase 1 | CA-1-39 | Evidência/entrada definida no card; teste humano quando exigido | Dados locais e dependências desta SPEC |
