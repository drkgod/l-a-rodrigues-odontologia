# Análise — Task 5bcfa6f1: Gerar a lista de confirmação do dia para o robô

**SPEC**: spec-1-004-confirmacoes-liberacao-e-encaixe.md · **Critério**: CA-1-18 · **Provas**: P4-01 e P4-02
**Data da análise**: 16/10/2026 · Executor: Luiz (assistente ETHOS)

## Objetivo e resultado observável

A CRC abre a tela "Confirmações", escolhe a data-alvo (padrão: amanhã, confirmacao_dias_antes=1) e o sistema gera a lista de confirmação do dia a partir da agenda: pacientes com consulta no dia-alvo que ainda não têm contato de confirmação, em ordem de horário. Ela confere a prévia, exporta o XLSX no formato do robô (colunas nome, telefone, mensagem — modelo CL-009 com fallback da SPEC), vê o excedente do limite em "envio manual" e telefones inválidos em "corrigir telefone". Exportar NUNCA conta como envio (RN-02).

## Estado atual (baseline verificado 16/10)

- Backend das regras JÁ EXISTE (task a9f9e30e concluída 13/10): coleções contatos_confirmacao/mensagens_confirmacao/ligacoes/liberacoes/ofertas + politicas_agenda (migration 0006); rotas registrar-mensagem, ligacao/registrar, confirmacao/registrar, mover-nao-respondentes, capacidade/verificar, liberacao/decidir.
- FALTA: rota de geração da lista do dia-alvo (RN-01); tela Confirmações; exportação XLSX; provas P4-01/P4-02.
- Parâmetros em config_unidade: confirmacao_dias_antes, corte_confirmacao_hora, limite_linhas_robo, modelo_mensagem_confirmacao, formato_telefone_robo ✓ (0006). mensagens_minimas/ligacoes_minimas ficam no hook (hardcode 3/1 da regra) — não bloqueiam.
- xlsx (SheetJS) NÃO está nas dependências → instalar.
- CL-009 (modelo do robô) pendente do cliente → SPEC define fallback: colunas nome, telefone, mensagem. NÃO bloqueia.

## Arquivos afetados

1. pocketbase/hooks/confirmacao_regras.js — NOVA rota GET /backend/v1/confirmacao/lista-dia?data=YYYY-MM-DD (auth): agenda_itens do dia-alvo não cancelados/excluídos (APPOINTMENT), join contatos_confirmacao; para cada item sem contato → cria contato pendente (RN-01, idempotente); retorna lista ordenada por horário com estado do contato, telefone validado (formato_telefone_robo), mensagem montada do modelo ({nome}/{data}/{hora}/{profissional}).
2. src/services/confirmacao.ts — gerarListaDia(data), exportarXlsx(lista, limite) usando xlsx (SheetJS): linhas válidas até limite → XLSX; excedente → envio manual; telefone inválido → corrigir telefone. Exportação registra evento (quem/quando/quantas linhas — RN-15).
3. src/pages/Confirmacoes.tsx — NOVA tela: seletor de data, tabela em ordem de horário (paciente, horário, dentista, telefone, estado do contato, mensagem), 3 listas de saída (XLSX/envio manual/corrigir telefone), botão exportar (prévia antes de baixar), banner "sem envio automático — fase 1".
4. src/App.tsx + Layout.tsx — rota /confirmacoes (SomenteGestao? não: crc_confirmacao/crc_agendamento/gestao usam; recepcao/dentista leem — papéis ainda não existem no sistema Lai, hoje só gestão/sem_funcao → SomenteGestao como nas outras telas).
5. src/services/provas.ts + Provas.tsx — P4-01 (lista do dia: 4 consultas de teste — 3 telefone válido, 1 inválida → lista gerada com estados corretos) e P4-02 (exportação: limite de teste=2 → 2 linhas XLSX + 1 envio manual + 1 corrigir telefone; zero tentativas criadas só por exportar).

## Ficha de Tela (Confirmações)

- Usuário: CRC de confirmação (hoje: gestão). Tarefa: conferir e exportar a lista do dia.
- Dados: data-alvo (default amanhã), lista em ordem de horário com estado do contato.
- Ações: gerar/atualizar lista, exportar XLSX (com prévia), ver excedente e telefones a corrigir.
- Padrão: lista com tabela + 3 blocos de saída.
- Estados: carregando, lista vazia ("nenhuma consulta no dia-alvo"), erro com retry.
- Celular: tabela com colunas mínimas, blocos empilhados.
- Acessibilidade: aria-labels, role=alert nos erros, foco visível.
- Textos PT-BR: "Confirmações", "Lista do dia", "Envio manual", "Corrigir telefone", "Exportar XLSX", banner "A central não envia mensagens nesta fase — exporte e use o robô".

## Matriz critério → prova

| Critério | Prova |
|---|---|
| CA-1-18 lista do dia-alvo em ordem de horário | P4-01 (4 consultas de teste → lista com 3 válidas + 1 corrigir telefone) |
| CA-1-18 limite do robô + excedente em envio manual | P4-02 (limite 2 → 2 XLSX + 1 manual + 1 corrigir) |
| CA-1-18 exportação não conta como tentativa | P4-02 (zero mensagens_confirmacao após exportar) |
| RN-01 idempotente | P4-01 (2ª geração não duplica contatos) |
| RN-15 registro de exportação | P4-02 (evento com quem/quando/linhas) |

## Plano em código (teste de mesa)

| Entrada | Regra | Saída |
|---|---|---|
| 4 consultas 14/10 (3 tel ok, 1 inválida), sem contatos | RN-01 | 4 contatos pendentes; lista ordenada por horário |
| 2ª chamada lista-dia | RN-01 idempotente | mesmos 4 contatos, sem duplicar |
| exportar com limite 2 | CA-1-18 | XLSX 2 linhas; 1 em envio manual; 1 em corrigir telefone |
| exportar 2× | RN-02/RN-15 | mesmo conteúdo; 2 eventos de exportação; 0 tentativas |

## Riscos

- dependência xlsx nova (peso no bundle) — import dinâmico só na exportação.
- agenda_itens.paciente_telefone pode vir vazio/inválido da importação — tratado na lista "corrigir telefone".
- fuso: data-alvo é data civil (YYYY-MM-DD) — sem conversão de hora; corte 17h é da task de liberação, não desta.
- migration: NENHUMA necessária (coleções já existem) — só rota nova no hook existente (risco conhecido de pod velho: provar rota no ar após publicar).

## Impedimentos

- Nenhum bloqueante. CL-009 pendente do cliente usa o fallback da SPEC (nome, telefone, mensagem) — quando o modelo chegar, ajusta-se a ordem das colunas.

## Verificação automática + teste humano

1. QA Skip verde + publicar + provar rota lista-dia no ar (401 anônimo).
2. Provas P4-01 e P4-02 na tela Provas → PASSOU.
3. Teste humano (dono): abrir Confirmações → gerar lista de amanhã (massa de teste criada pela prova) → conferir ordem de horário e 3 listas → exportar XLSX e abrir o arquivo → conferir que não criou tentativas → "testei, pode seguir".