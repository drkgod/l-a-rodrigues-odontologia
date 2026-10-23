# Execução — L A Rodrigues Odontologia

**Atualizado:** 23/10/2026 · **Fase atual:** 2, rotinas internas e contexto da avaliação · **Pacote:** cinco SPECs e 16 tarefas com UUID.

Comece por [tarefas da fase 2](04_fase-atual/fase.md) e pelo [índice das SPECs](04_fase-atual/specs/00-INDICE.md). A fase acrescenta tarefas com dono e prazo, contexto e registro da avaliação, gravação autorizada e médias de tempo por dentista.

## Como começar

1. Leia `AGENTS.md`, `.adapta-cliente/fontes-do-projeto.md`, o card e sua SPEC.
2. Comece por **Comparar os números do painel com a contagem direta da base** (SPEC-2-001; UUID `22d83348-1372-46f4-88cd-0cf15f55cd06`). O aceite anterior do painel está preservado; esta task faz a comparação detalhada e prepara o uso pela equipe.
3. Construa uma task por vez, em sequência dentro da SPEC, com provas e evidências em `05_entregas/fase-2/`. Faça o teste humano único de cada SPEC quando suas tasks estiverem no ar; registre o aceite antes de concluí-las.
4. A correção dos problemas do dia de uso espera a equipe usar a central. Enquanto isso, siga para a SPEC-2-002, conforme o índice.
5. Consulte o [checklist da clínica](04_fase-atual/checklist-do-cliente.md). As entradas pendentes não impedem a construção; gravação real depende do termo aprovado.

## Dados e regras

Use fixture isolada, arquivo validado ou cadastro manual. Consulte as fontes já recebidas antes de pedir documentos; não invente valores da clínica nem copie dados identificáveis para o Git.

Clinicorp continua sendo a agenda oficial. Nenhuma API externa, envio ao paciente, transcrição ou IA é ativada nesta fase. Trello, APP CRC e robô continuam na rotina atual; conexões e piloto real ficam para a fase 4. Toda tela identifica origem e dados de teste.

## Organização

- `04_fase-atual/`: 16 tarefas, checklist e cinco SPECs da fase 2.
- `05_entregas/fase-1/`: tarefas, SPECs e estado histórico da fase 1, encerrada por AC-23-02.
- `05_entregas/fase-2/`: destino das evidências a produzir durante a execução.
- `06_notas/`: dúvidas e registros da equipe.
- `07-sistemas/`: código e referências do app existente.

A fase 2 está liberada para construção; suas tarefas ainda não foram implementadas por esta publicação. O aceite do painel pelo Luiz em 23/10 às 10h10 foi preservado no changelog. Repositório: `drkgod/l-a-rodrigues-odontologia` (visibilidade pública constatada em 23/10/2026).

## Repositório do sistema

O projeto [LAi](https://github.com/Luizrodri/Projeto-LAi---Reposit-rio) está vinculado como submódulo em `07-sistemas/Projeto-LAi---Reposit-rio`. O código mantém seu próprio histórico; o repositório do cliente registra a versão utilizada.

Para baixar a pasta do cliente com o sistema:

```sh
git clone --recurse-submodules https://github.com/drkgod/l-a-rodrigues-odontologia.git
```

Em um clone existente, execute `git submodule update --init --recursive`.
