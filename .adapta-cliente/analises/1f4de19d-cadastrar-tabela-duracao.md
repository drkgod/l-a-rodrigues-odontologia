# Análise — Task 1f4de19d: Cadastrar a tabela de duração na central

**SPEC**: spec-1-002-duracao-sugerida.md · **Critério**: CA-1-07 · **Prova**: nenhuma P2 dedicada (CA-1-07 é comportamento do importador; provas P2-01..04 cobrem o cálculo com a tabela de teste)
**Recorte**: importação/versionamento/aprovação da tabela de duração — SEM a tela de planejamento (tasks 097ff6ce/6d5de2f5/fdca5fb0 vêm depois, uma por vez).

## Fonte real dos dados (consultada antes de pedir — AGENTS.md)

- **Drive da clínica** (1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9): arquivo **"Tabela Procedimentos x Tempos.xlsx"** (id 1Eeb5ij9WLuAq8kwRh4IkBtDThau6HVJT, mod. 04/10/2026, não trashed) — LEIA-ME diz: abas `db_` são "para os programadores: uma linha por registro, sem células mescladas, minutos em número inteiro".
- **Estrutura lida**: `db_regras_duracao` (22 regras, 7 grupos, variável_1/2 com faixas min/max inclusivas, max vazio = sem limite), `db_regras_duracao_procedimentos` (25 ligações grupo→PRC###), `db_procedimentos` (91 PRC### com duracao_padrao_min e grupos_regra_duracao), `db_profissionais` (22 PRF##), `db_horarios_profissionais` (67 linhas ALC/ITA com almoço), `db_escala` (76 linhas cadeira×função×modo), `db_procedimento_profissional` (395; só 8 com duração específica), `db_clinicas` (ALC+ITA), `db_dicionario` (convenções).
- **Aba `db_clinicorp_credenciais` NÃO lida** (dado sensível; integração é fase 4).
- Inventário completo em `.adapta-cliente/fontes-do-projeto.md`.

## Achados que moldam o plano

1. **A tabela real é mais rica que o contrato nominal da SPEC**: regras MULTI-VARIÁVEL (ex.: REG-IMP-03: qtd_implantes 2–2 E qtd_exodontias 2+ → 40 min) e separa grupo→procedimentos. Importar colunas planas destruiria as regras reais. DECISÃO DO CLIENTE (13/10 16:53): importar o formato REAL (regras por grupo + variáveis + ligações).
2. **REG-LEN-04 (lentes 8+) tinha duração vazio na própria tabela** → DECISÃO DO CLIENTE: turno de 4 horas = 240 min (informado pelo dono, não inventado).
3. **Unidade piloto = UNIDADE-DEMO** com arredondamento_min=5; profissionais no sistema são os 2 de teste. A importação grava o grupo/variáveis sem exigir cadastro prévio de profissional (vínculo é no cálculo/planejamento).
4. **O cálculo (rota sugerir) é a task seguinte** (097ff6ce), não esta.

## Plano em código (implementado)

### 1. Migration `0004_tabela_duracao.js` (aditiva)
- `tabela_duracao`: versao, arquivo_hash, nome_arquivo, importada_por, aprovada_por, aprovada_em, ativa. Regras: leitura papel+ativo; escrita gestão.
- `regras_duracao`: tabela (rel), grupo_regra, aplica_a, variavel_1, min_1/max_1, variavel_2, min_2/max_2, duracao_min, procedimentos, observacao, origem (fixture/importacao), teste.

### 2. Rotas (hooks, uma por arquivo)
- `POST /backend/v1/duracao/importar-tabela` (gestão): valida linha a linha (grupo, variável conhecida, faixas min≤max, duração positiva ou vazia = sem regra, Number.isFinite), cria tabela_duracao (versão RASCUNHO) + regras. Reimport do mesmo hash → ja_aplicado.
- `POST /backend/v1/duracao/aprovar-tabela` (gestão): desativa as outras, ativa esta com aprovada_por/em.

### 3. Serviço + telas
- `src/services/duracao.ts`: importarTabelaDuracao (CSV ; ou , + hash SHA-256 + campos number vazios omitidos), aprovarTabelaDuracao, listarTabelas, listarRegras.
- Tela `/tabela-duracao` (gestão): importar → prévia (regras/rejeitadas com motivo) → versões com badge Ativa/Rascunho → Ativar → conferência das regras da versão ativa.
- Menu: "Tabela de duração" (gestão). Provas P2-07/P2-08 na tela Provas.

## Teste de mesa (regras centrais)

| Entrada | Regra | Saída |
|---|---|---|
| Importação válida (22 regras) | versão nova | rascunho, contagens, autor |
| Mesmo arquivo 2× | hash | 2ª: ja_aplicado |
| Linha com minutos = -5 | validação | rejeitada com motivo |
| Duração "PRC074" (não numérica) | validação | rejeitada com motivo |
| Faixa min > max | validação | rejeitada com motivo |
| Variável desconhecida | validação | rejeitada com motivo |
| Aprovar versão | ativação | só 1 ativa; anteriores consultáveis |

## Riscos

- Parse de XLSX no navegador sem lib: CSV é o formato de entrada (o importador aceita ; ou ,). CSV da tabela real preparado pelo assistente a partir do Drive (sem dado sensível).

## Teste humano previsto (após implementação)

1. Gestão importa o CSV da tabela real → prévia mostra 22 regras, 0 rejeitadas;
2. Aplicar → versão rascunho no histórico com autor;
3. Ativar a versão → badge "Ativa" e conferência das 22 regras;
4. Reimportar o mesmo arquivo → "já importado, nada duplicado";
5. Provas P2-07/P2-08 na tela Provas → ✓ Passou.

## RESULTADO DA EXECUÇÃO (13/10/2026)

- Implementado conforme plano; publicado v0.0.19 (ref 9d1e3f1), QA 100% verde.
- DEBUG 1: PocketBase rejeita string vazia em campo number ("The submitted number is not properly formatted") — fix v0.0.18: cliente omite chaves vazias.
- DEBUG 2: CSV de teste desalinhado (10 colunas vs 11) fazia "PRC074" virar duração e NaN passava no `<= 0` — fix v0.0.19: validação Number.isFinite no hook + CSV de teste corrigido. Diagnosticado interceptando window.fetch (payload real).
- E2E servidor: 22 regras reais (0 rejeitadas), reimport ja_aplicado, aprovação ativa 22 (coroas 3-4=40, lentes 8+=240), 401 sem auth, dados de teste apagados (0 restantes).
- Provas na tela em produção: P2-07 ✓ Passou e P2-08 ✓ Passou (17:12, admin@lai.local).
- Pendente: teste humano do champion.
