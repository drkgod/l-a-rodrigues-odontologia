# Fontes do projeto e materiais recebidos

**Atualizado:** 13/10/2026. Consultar antes de pedir documento, conforme `AGENTS.md`.

## Pasta indicada pela clínica

- URL: https://drive.google.com/drive/folders/1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9
- ID: `1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9`.
- Origem: consultor informou que a clínica compartilhou as planilhas/documentos do projeto.
- Estado: **acesso confirmado e conteúdo lido em 13/10/2026** (leitura pelo assistente; sem alteração de arquivos/permissões).
- Subpastas listadas: `Adapta` (2 PDFs de escopo/PRD — materiais do consultor, não exigidos pelas tasks atuais), `Ebooks_`, `Videos Processos` (mídia). ZIP de mentoria está na lixeira (desconsiderado).

## Material recebido no contexto e incorporado às SPECs

| Material | Conteúdo aproveitado | Referência atual |
|---|---|---|
| Respostas de WhatsApp de 13/10 | 3 mensagens + 1 ligação, corte às 17h do dia anterior; avaliação 2/horário de 30min; limites específicos; autorização/recusa e retenção de áudio | SPEC-1-004/005 e regras futuras; não perguntar novamente as respostas completas |
| `Regras_de_Cobranca_LA_Rodrigues (1).pdf` | Briefing financeiro; exceções de execução/CANCELAMENTO refletidas no núcleo | SPEC-1-003/006; módulo financeiro nas fases correspondentes |
| `3270L.A Rodrigues Consultório Dentário - São Gonçalo (2).pdf` | Relatório reconstruído de junho/julho/agosto, qualidade e vínculo de unidade a conferir | SPEC-1-003; sem inventar leads individuais/atribuição |
| Calls do projeto | Fluxos e exemplos de duração incorporados | SPECs atuais; exemplos não substituem catálogo completo aprovado de tempos |

“Recebido no contexto” não afirma que cada original está neste Git ou foi localizado no Drive. Procurar a versão disponível na pasta indicada; não exigir reenvio genérico.

## CL-001 — verificar os arquivos existentes primeiro

Task `f4982b80-9c9e-4a0b-95b2-49a41af4e476`, “Enviar a tabela de tempo por procedimento e por dentista”. Consumo: SPEC-1-002 (tabela/cálculo de duração) e SPEC-1-001 (horários/cadeiras).

Dados necessários: procedimento, quantidade/faixa, combinação quando houver, profissional e minutos; cadeiras e horários de trabalho quando disponíveis. Permitem sugerir duração e mostrar vagas compatíveis. Podem estar distribuídos entre vários arquivos: não precisa existir uma planilha nova chamada “CL-001”.

**RESOLVIDO 13/10/2026**: CL-001 LOCALIZADO E LIDO — `Tabela Procedimentos x Tempos.xlsx` no Drive (ver inventário abaixo). Nenhuma lacuna bloqueia a SPEC-1-002; REG-LEN-04 (lentes 8+) recebeu a duração do dono (240 min).

Antes de registrar ausência, ler os materiais compartilhados, aproveitar o suficiente e identificar apenas a lacuna efetiva. Exemplos das calls não autorizam completar regras clínicas por suposição. Interface/importador podem ser construídos e testados com massa sintética identificada enquanto se valida a tabela de produção.

## Inventário de arquivos consultados

| Arquivo/link ou ID | Versão/data | Conteúdo lido | Requisito/task atendidos | Estado/lacuna |
|---|---|---|---|---|
| Pasta raiz (1Zwvm_2xfc7B-Ub9Ndk9hXpIOT_5yFgc9) | Listada 13/10/2026 | Inventário completo abaixo | Localizar documentos antes de pedir entradas | Acesso OK |
| `Tabela Procedimentos x Tempos.xlsx` (id 1Eeb5ij9WLuAq8kwRh4IkBtDThau6HVJT, mod. 04/10/2026, 225 KB) | 04/10/2026 (não trashed; substitui cópia de 02/10 na lixeira) | **LIDO integralmente**: 46 abas — LEIA-ME + 17 visuais + 28 `db_` (dados p/ programadores). `db_regras_duracao` = 22 regras em 7 grupos (IMPLANTE_CIRURGIA, REABERTURA, COROAS_PROTESISTA, RESTAURACOES, LENTES_RESINA, PROTOCOLO_ARCADA, SISOS_COMBO) com variáveis/faixas/duração; `db_regras_duracao_procedimentos` = 25 ligações grupo→PRC; `db_procedimentos` = 91 procedimentos (PRC###, duração padrão, grupos); `db_profissionais` = 22 (PRF##); `db_horarios_profissionais` = 67 linhas (ALC/ITA, SEG–SAB, entrada/saída/almoço); `db_escala` = 76 (clínica×dia×cadeira×profissional×função×modo); `db_procedimento_profissional` = 395 (8 com duração específica); `db_clinicas` = ALC+ITA; `db_dicionario` = convenções (minutos inteiros, faixas inclusivas, max vazio = sem limite). Aba `db_clinicorp_credenciais` = dado sensível — NÃO lida nem copiada (fase 4) | CL-001 → SPEC-1-002 (tabela de duração, task 1f4de19d); SPEC-1-001 (horários/escala, tasks 81d10fc4 e seguintes) | **Lacuna confirmada**: REG-LEN-04 (lentes 8+) com `duracao_min` vazio na própria tabela — vira "sem regra" no cálculo ou o dono informa o valor. Per-professional: só 8 linhas de `db_procedimento_profissional` têm duração específica |
| `3270L.A Rodrigues Consultório Dentário - São Gonçalo.pdf` (id 13Qn6KY4...) | 10/10/2026 | Localizado (já recebido antes; conteúdo registrado em SPEC-1-003) | SPEC-1-003 | localizado |
| `Planilha de organização de Follow UP.xlsx` (id 1RQewfqxD9yjFeaxEC4XYnK2tNO36HlIw) | mod. 21/09/2026 | Localizado, não lido (não exigido pelas tasks atuais) | Futuras (follow-up) | localizado |
| `Projeto Lai - Detalhamento.xlsx` (id 1kfL0Pnz9iwmo5Qu145alias40NyhVblI) | mod. 21/09/2026 | Localizado, não lido (não exigido pelas tasks atuais) | Referência | localizado |
| `Adapta/Escopo-PRD-Ciano-Lab-para-validacao.pdf` + `Adapta/larodrigues-escopo-cliente-20261006-v2 (1).pdf` | 06-07/10/2026 | Localizados, não lidos (materiais do consultor) | Consultor | localizado |

## Padrão para pedido necessário

“Consultei [arquivos/fontes]. Para [task e tela], precisamos de [documento/informação e campos], porque [uso concreto]. Já encontrei [dados aproveitados]; falta apenas [lacuna comprovada]. Isso [bloqueia uso real / permite seguir em demonstração]. Podem [completar os campos ou liberar acesso ao arquivo identificado]?”

Falha de acesso pede identificação do ambiente/conta e permissão mínima, depois de conferidos. Não inventar e-mail de acesso nem declarar ausência de documento.


## Liberação da fase 2 — 23/10/2026

- **Fonte lida:** cinco SPECs, índice e arquivo de 16 tarefas preparados pelo Claude em 23/10, no plano local do projeto. Publicados em `04_fase-atual/`, com UUIDs, responsáveis, prazos e estados preservados.
- **Decisão lida:** AC-23-02, em `03-Projeto/analise-do-consultor.md` do plano: fase 1 encerrada; entradas da clínica transferidas ao checklist; fase 2 liberada. O plano privado não integra este pacote.
- **Evidência lida:** changelog do repositório no commit f8f7b01: aceite humano do painel e da linha de base demonstrativa em 23/10, 10h10. Atualizado o contexto da SPEC-2-001 sem remover seu teste de uso pela equipe.
- **Guia da CRC:** `guia-conexao-comunicacao-crc.pdf`, recebido em 23/10 e localizado na pasta de contexto da clínica. Os campos incorporados pelo Claude na SPEC-2-003 foram lidos; o PDF original não foi relido nesta publicação e não foi copiado para o Git.
- **Entradas ainda necessárias:** conferir `04_fase-atual/checklist-do-cliente.md`. Transferir uma pendência não significa que o documento foi recebido.
