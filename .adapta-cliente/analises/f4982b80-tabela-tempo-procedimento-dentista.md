# Análise — Task f4982b80: Enviar a tabela de tempo por procedimento e por dentista

**SPEC**: spec-1-002-duracao-sugerida.md · **Critério**: CA-1-07 · **Pré-condição**: 1f4de19d concluída (importador no ar) ✓

## Recorte

A task anterior entregou o importador/versionamento/aprovação (estrutura). Esta task completa o **DADO**: a dimensão "por dentista" da tabela real — regras específicas por profissional — e o caminho de importação delas. Não toca em cálculo/rota sugerir (task 097ff6ce seguinte), nem em tela de planejamento.

## Fonte (consultada antes — AGENTS.md)

"Tabela Procedimentos x Tempos.xlsx" (Drive, id 1Eeb5ij9WLuAq8kwRh4IkBtDThau6HVJT, mod. 04/10/2026):
- `db_regras_duracao`: 22 regras de grupo (JÁ ativas no sistema como v1);
- `db_procedimento_profissional`: 395 linhas, **só 5 tempos específicos por dentista** (dedup por procedimento+profissional+duração):
  | Procedimento | Profissional | Min | Obs da planilha |
  |---|---|---|---|
  | PRC003 COMBO 4 SISOS | Ana Clara | 60 | 1ª opção ALC |
  | PRC003 COMBO 4 SISOS | Dr. Luiz Sergio | 40 | 2ª opção (ITA/ALC) |
  | PRC003 COMBO 4 SISOS | Leonel | 30 | 3ª opção (ITA/ALC) |
  | PRC047 EXODONTIA DENTE DECIDUO | Alice | 20 | "Em Alcântara as consultas são de 20 min" |
  | PRC048 Mantenedor de espaço | Alice | 20 | idem |
- as outras 388 linhas NÃO são tempo: são preferência de quem atende/dias/função (alimentam SPEC-1-001, tasks de horários/escala) — NÃO importar como regra de duração (regra da SPEC: não promover estimativa a regra clínica).

## Achados

1. **PRC047/PRC048 não têm grupo de regra** (não estão em db_regras_duracao_procedimentos): os tempos de 20 min da Alice existem SÓ na aba de procedimento×profissional. Importação por dentista cria grupos próprios para eles.
2. **CONFLITO RESOLVIDO PELO DONO (13/10 18h16)**: PRC003 tem regra de grupo SISOS_COMBO = 60 min E durações por dentista (60/40/30). Decisão: "a regra vale dependendo de qual agenda ele vai entrar, pois cada profissional leva um determinado tempo, na dúvida deixa 40 min" — regra ESPECÍFICA do dentista prevalece; sem dentista definido, COMBO 4 SISOS = 40 min (não os 60 da planilha).
3. **Profissionais reais vs sistema**: a importação NÃO exige profissional cadastrado (grava o NOME como texto; vínculo é do cálculo/planejamento). Nomes reais NÃO vão ao Git (demonstração usa massa sintética; regra AC-13-IT).

## Plano em código (implementado)

### 1. Migration `0005_regras_duracao_profissional.js` (aditiva)
- `regras_duracao` + campo `profissional` (text, opcional — vazio = vale para todos).

### 2. Hook `duracao_importar_tabela.js` (extensão)
- Linha com `profissional` preenchido → grava o campo (regra específica).
- Validação nova: regra por dentista EXIGE duracao_min (não existe "sem regra" por dentista).
- Variável `sempre` na whitelist (regra incondicional por dentista, min=max=1).
- Reimport idempotente: hash do arquivo inteiro (grupo + por dentista).

### 3. Service `duracao.ts`
- Parser lê coluna `profissional`; vazio → omitir no envio (lição PocketBase).

### 4. Tela `TabelaDuracao.tsx`
- Regras da versão ativa: coluna "Profissional" ("todos" quando vazio).

### 5. Provas
- P2-07/P2-08 seguem válidas (CSV de teste da prova não muda; guarda da v0.0.20 protege dado real).

## Teste de mesa (regras centrais)

| Entrada | Regra | Saída |
|---|---|---|
| CSV com 27 regras (22 grupo + 5 dentista) | importação | v2 rascunho, 27 gravadas |
| Mesmo arquivo 2× | hash | ja_aplicado |
| Linha por dentista SEM duração | validação | rejeitada com motivo |
| Variável `sempre` | whitelist | válida (min=max=1) |
| Ativar v2 | aprovação | v1 desativa, 27 ativas |

## Riscos

- Nomes reais de profissionais: importação de demonstração usa massa sintética; os nomes reais (Ana Clara, Luiz Sergio, Leonel, Alice) entram quando o dono importar de verdade — a importação é dele na tela. NENHUM nome real vai ao Git (regra LGPD da SPEC).
- Migration aditiva (campo novo), sem risco de dado.

## RESULTADO DA EXECUÇÃO (13/10/2026)

- Implementado conforme plano; publicado v0.0.21 (190c454) e v0.0.22 (11a9012, whitelist `sempre`), QA 100% verde.
- DEBUG 1: 1ª importação rejeitou as 2 regras da Alice (variável `sempre` fora da whitelist) — corrigido v0.0.22; reimport completo: 27 gravadas, 0 rejeitadas, v2 ATIVA.
- CSV v2: artifacts/tabela-duracao-v2.csv (27 regras; SISOS grupo = 40 com nota da decisão; lentes 8+ = 240).
- E2E servidor: reimport idempotente, ativação única (v1 desativada e removida como legado de teste), P2-07 ✓ e P2-08 ✓ na tela em produção (v2 real presente e sobrevivente à guarda).
- Pendente: teste humano do champion.
