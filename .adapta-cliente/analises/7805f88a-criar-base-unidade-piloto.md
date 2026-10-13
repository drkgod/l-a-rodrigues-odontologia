# Análise — Task 7805f88a: Criar a base da unidade piloto com acesso por função

**SPEC**: spec-1-001-agenda-da-unidade.md · **Critério**: CA-1-01 · **Prova**: P1-01
**Subtask incluída**: 556859ba — Montar a tela de provas da fase 1 (a SPEC manda construir "base/acesso → importador → agenda → provas"; a tela de provas é o mecanismo de evidência da fase e nasce junto da base).

## Objetivo e resultado observável

A equipe entra no sistema por função (gestão, CRC de agendamento/confirmação/comercial, recepção, dentista). Quem não tem função ou está inativo **não vê nada**. Cada papel vê apenas o que a matriz de acesso da SPEC define, garantido no servidor (regras de acesso), não só escondendo botão. A tela Provas (só gestão) executa os cenários da SPEC e grava o resultado.

## Estado atual (baseline verificada)

- Skip 65741 v0.0.3 (hash 8035205), template em branco, nada publicado. Pendência só `.skip.config.json` (da plataforma).
- Banco: só a coleção `users` nativa (auth) com campos name/avatar/created/updated — sem `papel`, sem `ativo`.
- Frontend: rotas `/` (Index) e `*` (NotFound); Layout mínimo sem menu.
- Zero chamadas a APIs externas — fundamentação da fase respeitada de fábrica.

## Plano em código (ordem: migration → hook → serviço → componentes → página → rota/menu)

### 1. Migration `0001_base_unidade.js` (aditiva, com down)

Coleções novas (todas com as 5 regras + created/updated autodate):

- **`users` (alteração)**: campos `papel` (select: gestao, crc_agendamento, crc_confirmacao, crc_comercial, recepcao, dentista), `profissional` (relation → profissionais, criada antes), `ativo` (bool, default true). Regras: list/view = próprio registro OU gestão da unidade; update = próprio OU gestão; create/delete = gestão. `@request.auth.papel = "gestao"` como base.
- **`profissionais`**: clinicorp_id (text), origem (select: fixture/manual/importacao), lote_id (text), nome (text, required), ativo (bool), cadeira_padrao (relation → cadeiras), tipo_agenda (select: avaliacao/tratamento/ambos).
- **`cadeiras`**: clinicorp_id, origem, lote_id, nome (required), tipo (select: avaliacao/tratamento).
- **`config_unidade`** (registro único): nome_unidade, clinicorp_business_id (opcional), modo_dados (select: demonstracao/importado), integracoes_externas_habilitadas (bool, false), fuso (text, "America/Sao_Paulo"), dias_passados_leitura (number, 7), dias_futuros_leitura (number, 45), arredondamento_min (number, 5).
- **`provas_execucoes`**: spec, cenario, esperado, obtido, passou (bool), executado_por, executado_em (date), observacao.

Regras de acesso (todas as coleções de dados): leitura `@request.auth.id != '' && @request.auth.papel != "" && @request.auth.ativo = true` (com refinamento por papel onde a matriz exige); escrita `@request.auth.papel = "gestao" && @request.auth.ativo = true`. Sem papel/inativo = nada (CA-1-01).

Risco de dados: nenhuma migration remove/renomeia campo; só aditivo (users ganha campos novos).

### 2. Serviços (`src/services/`)

- `auth.ts`: login (pb.collection('users').authWithPassword), logout, tipo `Usuario` (id, name, papel, ativo, profissional), helper `eGestao()`.
- `config.ts`: obterConfigUnidade (registro único), salvarConfigUnidade.
- `profissionais.ts`, `cadeiras.ts`: CRUD básico (usado pela gestão e pelas próximas SPECs).
- `provas.ts`: listarExecucoes, registrarExecucao (spec, cenario, esperado, obtido, passou, observacao).

### 3. Contexto de autenticação

`src/contexts/AuthContext.tsx`: provider com usuário atual (pb.authStore + refresh do registro), `useAuth()`. Guarda de rota: sem login → tela Login; com login mas `papel` vazio ou `ativo=false` → tela "Sem acesso" (mensagem clara, sem dados).

### 4. Telas

- **Login** (`/login`): e-mail + senha, mensagem de erro em PT-BR, estados carregando/erro.
- **Sem acesso** (`/sem-acesso`): para usuário autenticado sem papel válido/inativo.
- **Provas** (`/provas`, só gestão): um botão por cenário da SPEC-1-001 (P1-01 primeiro), executa contra serviços reais internos, grava em provas_execucoes, mostra resultado (esperado × obtido, passou/falhou, autor, data). Massa de teste sempre `teste=true`, botão para limpar fixture.
- **Layout**: menu lateral filtrado por papel (gestão vê tudo; demais papéis veem Agenda quando ela existir — por ora, só Provas para gestão).

### 5. Rotas e menu

App.tsx: rotas `/login`, `/sem-acesso`, `/provas` (protegida, gestão), `/` redireciona conforme papel. Menu no Layout com item ativo destacado.

## Ficha de Tela — Provas (`/provas`)

- Quem usa: gestão (Luiz/Victor), computador.
- Tarefa: executar os cenários de prova da fase e ver o resultado gravado.
- Ação primária: botão "Executar prova" por cenário.
- Padrão: dashboard simples (cards por cenário + tabela de execuções).
- Dados: cenário → provas_execucoes (esperado, obtido, passou, executado_por, executado_em).
- Estados: carregando · vazio (nenhuma execução) · erro com saída · sucesso (badge passou/falhou com texto, nunca só cor).
- Celular: cards empilhados, tabela vira lista.
- Acessibilidade: rótulos, foco, contraste, status com texto + ícone.
- Textos: "Executar prova", "Nenhuma execução ainda", "Prova passou"/"Prova falhou — veja o obtido".

## Teste de mesa — regra central de acesso (CA-1-01)

| Entrada | Regra aplicada | Saída esperada |
|---|---|---|
| Usuário sem `papel` | listRule exige `papel != ""` | 0 registros em qualquer coleção |
| Usuário `ativo=false` | listRule exige `ativo = true` | 0 registros |
| `crc_agendamento` | vê agenda/profissionais/cadeiras; provas = gestão only | 403/0 em provas_execucoes |
| `gestao` | tudo da unidade | acesso completo |
| Visitante sem login | `@request.auth.id != ''` falha | 0 registros |

## Matriz critério → prova

| Critério | Prova |
|---|---|
| CA-1-01 (sem papel/inativo não lê; cada papel vê só o seu) | P1-01 na tela Provas: usuário sem papel → 0 registros; papéis → escopo correto; verificado também nas regras do banco |
| Subtask 556859ba | Tela Provas executando P1-01 e gravando em provas_execucoes |

## Riscos

- Migration de `users` em auth collection: preview e produção usam o mesmo banco — migration aditiva, sem tocar campos nativos; `down` remove só os campos novos.
- Regras de `users` muito fechadas podem travar o próprio login (view do próprio registro precisa ficar aberta ao dono do registro).
- Nenhum risco de API externa (fundamentação da fase: zero chamadas).

## Decisões já fechadas pela SPEC (não preciso perguntar)

- Unidade de teste `UNIDADE-DEMO` isolada; fixture `teste=true`; modo demonstração separado.
- Papéis e matriz fixados na SPEC. Nada de negócio indefinido nesta task.

## Roteiro de teste humano (após entrega)

1. Abrir a URL de produção e entrar com usuário de gestão;
2. Abrir Provas e executar P1-01 — deve mostrar "passou";
3. Entrar com usuário SEM papel — deve ver "Sem acesso" e nada mais;
4. Entrar com usuário inativo — idem;
5. Abrir no celular e conferir que a tela Provas funciona empilhada;
6. Conferir que não há nenhum botão de "conectar" ou "sincronizar" em lugar nenhum.

---

## RESULTADO DA EXECUÇÃO (13/10/2026)

- Implementado conforme plano: migration `0001_base_unidade_piloto.js` (cadeiras, profissionais, users+papel/ativo/profissional, config_unidade, provas_execucoes; seeds idempotentes UNIDADE-DEMO e admin@lai.local); serviços auth/config/provas; AuthContext com Protegido/SomenteGestao; telas Login, SemAcesso, Provas (P1-01 real contra o banco), Index; Layout com menu por função; rotas em App.tsx.
- QA do Skip 100% verde (setup, static analysis, build, integrations). Versão v0.0.4 (ref e13e688) publicada em produção e provada (isPublished true, lastPublishedRef = versionHash).
- Migration aplicada no banco confirmada via list_migrations (status applied) e schema.json regenerado com as 5 coleções e regras exatas do plano.
- Zero chamadas a APIs externas (fundamentação preservada).
- Pendente: teste humano (roteiro acima) — resposta "testei, pode seguir" no card.
