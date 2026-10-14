# Análise — Task a9f9e30e: Definir as regras de confirmação e liberação de vagas

**SPEC**: spec-1-004-confirmacoes-liberacao-e-encaixe.md · **Critérios**: CA-1-20 e CA-1-21 · **Provas**: P4-04, P4-05, P4-07

## Recorte (menor recorte completo)

Esta task GRAVA AS REGRAS e garante que o backend as aplica — não é a tela de confirmação do dia (5bcfa6f1) nem registro de respostas na ficha (f124df8f), nem encaixe/ofertas (e2369241/36cdfc82). Entrega: parâmetros de CL-004 gravados, coleções de regras, rotas backend com os gates e provas P4-04/05/07 na tela Provas.

## Regras recebidas (NÃO reabrir — já respondidas pelo cliente)

- **Silêncio**: 3 mensagens EFETIVAMENTE enviadas + 1 ligação SEM SUCESSO no dia anterior + sem confirmação + relógio do SERVIDOR ≥ 17:00 do dia anterior à consulta (America/Sao_Paulo). Exportar planilha NÃO conta como envio.
- **Cancelamento/remarcação explícitos**: caminhos PRÓPRIOS (não passam pelo gate de silêncio).
- **Avaliação**: 2 por horário, 30 min por consulta. Tratamento com horário marcado: sem sobreposição (regra geral).
- **Políticas específicas pendentes** (Leonel 5/turno, Wesley+Pamela 20/turno, Erika 2/horário sábado): ficam NÃO ATIVADAS até vínculo confirmado — pendente NUNCA vira ilimitado nem 40.

## Plano em código

### 1. Migration `0006_regras_confirmacao.js` (aditiva)
- `config_unidade` + campos: confirmacao_dias_antes (1), corte_confirmacao_hora (17), limite_sobreposicao_avaliacao (2), duracao_avaliacao_minutos (30), limite_linhas_robo (80), modelo_mensagem_confirmacao (texto com {nome}/{data}/{hora}/{profissional}), formato_telefone_robo.
- Coleção `politicas_agenda`: unidade, profissional (rel), tipo (avaliacao|horario_marcado|ordem_chegada), dia_semana, turno_inicio/fim, limite_por_horario, limite_por_turno, escopo_limite (individual|grupo), duracao_minutos, origem_regra, aprovado_por, situacao (ativa|pendente), versao. RLS padrão (leitura papel+ativo; escrita gestão).
- Coleções `contatos_confirmacao` (agenda_item rel único, estado select 9 valores, responsavel, turno, versao_contato, teste), `mensagens_confirmacao` (contato rel, tentativa 1-3, chave_evento única, enviada_em, registrada_por, canal, resultado enviada|falhou, lote_origem, teste), `ligacoes` (contato rel, resultado select, crc, feita_em, chave_evento única, teste), `liberacoes` (agenda_item rel único, motivo, decidida_por/em, situacao, oferta_vencedora rel, inicio/fim, profissional, tipo_agenda, teste), `ofertas` (liberacao rel, item_a_agendar, estado, planejamento, teste).

### 2. Hook `confirmacao_regras.js` (rotas, gestão)
- POST /backend/v1/confirmacao/registrar-mensagem: grava tentativa (chave única idempotente; só resultado=enviada conta; correção = novo evento, não edição).
- POST /backend/v1/ligacao/registrar: grava ligação com chave única; nao_atendeu com autor/hora = prova de tentativa.
- POST /backend/v1/confirmacao/registrar: resposta muda SÓ o estado do contato (CA-1-19); confirmou interrompe régua; versao_contato incrementada.
- POST /backend/v1/confirmacao/mover-nao-respondentes (RN-04): mensagem_enviada → em_lista_ligacao com responsável do turno; sem cobertura → "a definir" + alerta para a gestão.
- POST /backend/v1/liberacao/decidir (CA-1-20 — o gate):
  - motivo cancelamento/remarcacao → caminho próprio, exige resposta registrada no contato, grava decidida (desmarcar no Clinicorp é tarefa humana; só liberada após evidência — nesta fase fica decidida/pendência);
  - motivo ligacao_sem_sucesso → valida NO SERVIDOR: ≥3 mensagens enviadas distintas (estado válido atual), ≥1 ligação nao_atendeu no dia anterior, contato sem confirmação, agora (servidor, America/Sao_Paulo) ≥ 17h do dia anterior à consulta; recusa com motivo específico em PT-BR;
  - body.agora aceito SÓ com teste=true (clock de fixture das provas; relógio do browser nunca burla produção).

### 3. Rota GET/POST /backend/v1/capacidade/verificar (CA-1-21)
- Dado (data, hora, profissional, tipo): primeira a política ATIVA com vínculo exato (unidade+profissional+dia+tipo); sem política ativa → { situacao: 'regra_nao_validada' } (nunca ilimitado).
- Avaliação: conta consultas não canceladas no horário (visitas únicas); ≥2 → bloqueia 3º.
- Ordem de chegada: visitas únicas por turno [inicio,fim) com escopo (individual|grupo); ≥ limite → bloqueia.
- Tratamento horário marcado: sobreposição → bloqueio (regra geral RN-09).

### 4. Provas P4-04/P4-05/P4-07 na tela Provas (massa teste=true, limpeza por marcador)
- P4-04: 3 mensagens + sem ligação + 17h → recusa.
- P4-05: eventos completos; clock 16:59 recusa / 17:00 permite (consulta 14/10 08h; corte 13/10 17h); consulta 16h do dia 14 tem o MESMO corte (17h de 13/10).
- P4-07: 2 avaliações no mesmo horário ok; 3ª bloqueada; 2 tratamentos sobrepostos bloqueados.

## Teste de mesa (gates)

| Entrada | Regra | Saída |
|---|---|---|
| 2 mensagens enviadas + ligação + 17h | CA-1-20 | recusa (mensagens < 3) |
| 3 mensagens + 0 ligações + 17h | CA-1-20 | recusa (falta ligação) |
| 3 mensagens + ligação 13/10 10h + clock 13/10 16:59 | CA-1-20 | recusa (antes do corte) |
| idem + clock 17:00 | CA-1-20 | permite (decidida) |
| contato confirmou depois | revisão humana; não desfaz | — |
| 3ª avaliação mesmo horário | CA-1-21 | bloqueada |
| política pendente | CA-1-21 | "regra da agenda não validada" (não vira ilimitada) |

## Riscos

- Migration aditiva (campos novos + coleções novas) — sem risco de dado existente.
- Relógio de fixture (body.agora) só com teste=true — produção usa relógio do servidor.

## Pendências de VÍNCULO (perguntas ao cliente — opcionais, ficam pendentes se não responder agora)

1. Leonel (ordem de chegada, 5/turno): qual unidade e intervalo do turno?
2. Wesley/Pamela (Itaboraí, 20/turno): limite é INDIVIDUAL de cada um ou CONJUNTO dos dois? E intervalo do turno?
3. Erika (Alcântara sábado, 2/horário): qual categoria/regime exato dessa agenda?
4. Cobertura de ligação por turno (CRC): quem cobre manhã e quem cobre tarde?

## Teste humano previsto

1. Provas P4-04, P4-05, P4-07 na tela → ✓ Passou;
2. (Se respondeu os vínculos) conferir as políticas gravadas como ativas/pendentes na coleção.

## Resolução (13/10 ~21h)

### DECISÃO DO CLIENTE (vínculos respondidos pelo dono)
- Leonel (ordem de chegada, 5/turno): **ITA, quarta a partir das 16h** (db_horarios_profissionais: "até terminar os pacientes" — turno sem fim).
- Wesley + Pamella (Itaboraí): **20 para CADA um**, **turno da manhã e turno da tarde** (não é conjunto). Turnos derivados dos horários reais: Wesley SEG/QUA/QUI 09–13 e 14–17; Pamella SEX/SAB 09–13 e 14–18.
- Erika (Alcântara sábado): **atende ortodontia** → regime_agenda=ortodontia (2 por horário).
- Cobertura de ligação: **recepção** — cadastro por turno (config_turno_ligacao) fica para a task da lista de ligação; RN-04 devolve "a definir" + alerta para a gestão enquanto não houver cadastro.

### Implementação
- Migration 0006: config +7 campos (CL-004), coleções politicas_agenda/contatos_confirmacao/mensagens_confirmacao/ligacoes/liberacoes/ofertas, 12 seeds de políticas PENDENTES (dedup por conteúdo corrigido — origem_regra se repetia em turnos diferentes e colapsava linhas).
- Hook confirmacao_regras.js: rotas /confirmacao/registrar-mensagem, /ligacao/registrar, /confirmacao/registrar, /confirmacao/mover-nao-respondentes, /capacidade/verificar, /liberacao/decidir. Gates no SERVIDOR (CA-1-20: 3 mensagens enviadas distintas + 1 ligação nao_atendeu no dia anterior + sem confirmação + ≥17h local do dia anterior; clock de fixture só com teste=true; idempotência por chave única e por liberação existente). CA-1-21: avaliação 2/30min (regra geral, política específica prevalece), ordem_chegada EXIGE política ativa (pendente = regra_nao_validada), horario_marcado sem sobreposição (regra geral RN-09).
- Provas P4-04/P4-05/P4-07 na tela Provas (SPEC-1-004); tela lista as duas SPECs; limpeza apaga as duas.
- v0.0.24 (0dd3496) → v0.0.25 (f07e442, gate RN-09 correto) → v0.0.26 (45af710, dedup das seeds). Todas publicadas.

### E2E no servidor (prova real, massa teste=true + limpeza verificada)
| Cenário | Esperado | Obtido |
|---|---|---|
| 2 mensagens + ligação + 17h | recusa | 400 "precisa de 3 mensagens (tem 2)" ✓ |
| 3 mensagens + sem ligação + 17h | recusa | 400 "precisa de 1 ligação... (2026-10-13)" ✓ |
| eventos completos, clock 16:59 | recusa | 400 "Ainda não são 17h... 16:59 local" ✓ |
| eventos completos, clock 17:00 | permite | 200 decidida (liberação t1yrhry3o614x9w) ✓ |
| mesma decisão de novo | idempotente | ja_decidida ✓ |
| 3ª avaliação 09:00 (2 existentes) | bloqueada | bloqueado (2/2) ✓ |
| 1ª avaliação 10:00 | permitida | permitido (0/2, 30min) ✓ |
| tratamento 10:15 com 10:00–11:00 | bloqueado | bloqueado (sobreposição) ✓ |
| ordem_chegada política pendente | regra_nao_validada | regra_nao_validada ✓ |

Banco após limpeza: 0 em todas as coleções de confirmação; 12 políticas (seeds pendentes, teste=false).
