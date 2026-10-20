# Análise — eec75533: Importar os leads em aberto do APP CRC

**SPEC:** SPEC-1-003 · **Card:** "Leads em aberto do APP CRC importados por arquivo; SPEC-1-003"

## Entrada recebida (19/10)
- `Clientes_APPCRC_-_clinica_alcantara.xlsx` (aba Dados, 2.549 linhas, 100 rejeitadas sem nome/telefone)
- `Clientes_APPCRC_-_clinica_itaborai.xlsx` (1.711 linhas, 28 rejeitadas)
- Colunas: Nome, Data registro, Telefone, Fase, Situação, Origem, Etiquetas (id do APP CRC)…

## Decisões de mapeamento (registradas)
- **Etiquetas** → `id_app_crc` (identificador estável do APP CRC; dedup por ele).
- **Fase do APP CRC → etapa da central**: Aguardando 1º contato→novo; Aguardando posição do decisor/Aguardando entrada→em_atendimento; Sem resposta/Contato perdido→aguardando_retorno; Agendou retorno→agendado; Pós venda→compareceu. "Fechou" NÃO é importado na task de leads em aberto (o dono ofereceu os contatos fechados separadamente — decisão dele).
- **Data registro** → `entrada_em` (12:00 UTC para evitar deslocamento de fuso).
- **Origem** → `origem_texto_original` (código de campanha casa exato quando existir; senão fica o texto original — a task 1ccd1bb9 confere o histórico com a agência).
- Telefone normalizado `+DDDNNNNNNNNN` (55 prefixado quando já vem com 55).

## Entrega (v0.0.82 11f8bef)
- Migration 0016: `leads.importado_app_crc` (bool).
- Hook importar-app-crc: aceita fase/entrada_em; mapeia fase→etapa; grava entrada_em; marca importado_app_crc; dedup id_app_crc/telefone; ficha única vinculada.
- Serviço `xlsxParaLinhasAppCrc` (parser XLSX no navegador, aba 1, colunas por nome) + tela Leads aceita .xlsx.

## Importação executada (20/10 ~01h)
- ALC: 2.449 válidas; ITA: 1.683 válidas.
- **4.117 leads gravados com ficha vinculada** (4.118 pacientes — 1 ficha pré-existente).
- Dedup provado: reimportação de lote completo → 3.956 duplicados pulados, 0 rejeitadas.
- Etapas na amostra: novo 128, em_atendimento 51, aguardando_retorno 17, agendado 4 (leads antigos do ALC já estavam no sistema? não — a importação foi a primeira; a distribuição reflete as fases das planilhas).

## Teste humano
Importação em massa não tem nada para o dono ver além da lista — mas a lista de leads É visível. Task entra em aguardando_teste (roteiro: abrir Leads e conferir os 4.117). Caso crítico? Não muda fluxo em uso (a lista estava vazia). Segue no teste da SPEC-1-003.