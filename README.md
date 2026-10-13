# Execução — L A Rodrigues Odontologia

**Atualizado:** 13/10/2026 · **Fase atual:** 1, fundamentação do app · **Pacote:** sete SPECs e 49 cards com UUID.

Comece por `04_fase-atual/fase.md` e `04_fase-atual/specs/00-INDICE.md`. Esta fase constrói telas, banco, papéis e regras: agenda, duração, leads/ficha, pacientes a agendar, confirmação/ligação, encaixe assistido, atendimento do dia e painel.

## Como começar

1. Disponibilize esta pasta ao Maestro no ambiente de construção.
2. Escolha uma única task elegível e leia sua SPEC. Títulos históricos foram preservados; a descrição atual define o recorte local.
3. Use fixture separada, arquivo validado ou cadastro manual. Não precisa de token Clinicorp, conta Meta ou provedor de IA para começar. Login, banco e arquivos nativos do Skip são a base.
4. Construa apenas a task, rode RED/GREEN/regressão e registre evidência em `05_entregas/`, ligada ao UUID.
5. A equipe segue o teste humano da SPEC. Só concluir e avançar depois de evidência e resposta explícita “testei, pode seguir”. Falha volta à mesma task.

## Dados e regras

Tabelas de duração/cadeiras e modelos de arquivos ajudam a validar os dados reais. Demonstração sintética permite começar enquanto faltam entradas, sem preencher parâmetros reais por suposição. Unidade/turno de Leonel, limite de Wesley/Pamela, regime de Erika e cobertura de ligações exigem confirmação no uso afetado.

Toda tela identifica origem/data e modo demonstrativo ou importado, sem sincronização. Testes não enviam mensagens, não acionam robô nem alteram consultas reais. Vencedor local não confirma reserva no Clinicorp. A clínica mantém suas ferramentas atuais até o piloto conectado e aceito na fase 4.

## Organização

- `04_fase-atual/`: cards e SPECs da fase atual.
- `05_entregas/`: provas e demonstrações.
- `06_notas/`: dúvidas e registros da equipe.
- `07-sistemas/`: arquivos ou referências do app construído.

Conexões externas ficam para a fase 4 e segunda unidade para a fase 5; instruções serão disponibilizadas na liberação. Cinco cards de acesso/virada foram reservados no plano futuro, preservando UUIDs. Os 49 cards atuais conservam estado, responsável, data e visibilidade; datas antigas são histórico a replanejar. Nenhuma implementação/aceite foi produzido neste preparo. Destino GitHub autorizado: `drkgod/l-a-rodrigues-odontologia`, privado.

## Repositório do sistema

O projeto [LAi](https://github.com/Luizrodri/Projeto-LAi---Reposit-rio) está vinculado como submódulo em `07-sistemas/Projeto-LAi---Reposit-rio`. O código mantém seu próprio histórico; o repositório do cliente registra a versão utilizada.

Para baixar a pasta do cliente com o sistema:

```sh
git clone --recurse-submodules https://github.com/drkgod/l-a-rodrigues-odontologia.git
```

Em um clone existente, execute `git submodule update --init --recursive`.
