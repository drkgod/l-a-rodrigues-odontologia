# SPEC-2-004 — Gravação autorizada da avaliação

**Fase:** 2  
**Status:** planejada  
**Dono:** clínica com o Maestro; aceite do Luiz  
**Origem no escopo:** fase 2 (captura e arquivo de áudio nativo quando autorizado), DH-02, DH-04, RQ-008, WA-04, CL-PEND-007, risco "dado de saúde na gravação"  
**Degrau da solução:** recurso nativo da plataforma — gravação pelo navegador, arquivo protegido no armazenamento do Skip e rotina agendada do próprio Skip (a fase 1 já usa uma, `atendimentos_fechar_dia`).

## Contexto e decisões fechadas

- **Estado atual:**
  - **Gravação:** não existe.
  - **Política recebida da clínica:** com recusa, o registro é manual; o áudio fica 90 dias; áudio e transcrição integral só para o administrador; resumo para dentistas e recepção.
  - **Pendente:** o texto do termo e a forma de assinatura ainda não foram aprovados pela clínica.
- **Estado desejado:** o paciente que autorizou pode ter a avaliação gravada; quem recusou segue com o registro manual; só a gestão ouve, e cada vez fica registrada; o áudio some no 90º dia.
- **Decisões já fechadas:**
  - **Administrador:** na política, administrador é o papel de gestão que já existe na central.
  - **Termo:** a gravação real só funciona depois que a gestão registra na central o termo aprovado pela clínica, com versão, texto, finalidade e data. O termo de teste só vale para paciente de teste.
  - **Finalidade:** fixa nesta fase, "continuidade do tratamento".
  - **Vínculo:** a autorização e as partes ficam ligadas ao atendimento de avaliação e ao paciente. Avaliação sem atendimento não grava.
  - **Partes:** a gravação é feita em partes de até 10 minutos, enviadas ao terminar cada uma. A parte pendente fica só na memória da página.
  - **Acesso:** a gestão só ouve na central; não há download nesta fase.
  - **Transcrição:** não existe nesta fase, e nenhum serviço externo é chamado.
  - **Revogação:** impede novas gravações daquele atendimento e apaga os áudios daquela avaliação, registrando o evento. É o padrão até a clínica definir outro no termo.
- **Bloqueios:** nenhum para construir. A gravação real depende do termo aprovado (checklist da clínica).

## Resultado observável

No atendimento de avaliação, a recepção ou o dentista registram se o paciente autorizou ou recusou. Com termo ativo e autorização, o dentista toca em "Gravar", e a central grava a avaliação em partes. Só a gestão ouve, pela própria central, e cada vez fica registrada. Sem termo, com recusa ou com termo de teste para paciente real, o botão fica bloqueado com o motivo, e o registro manual da SPEC-2-003 segue normal. Uma rotina diária apaga os áudios no 90º dia, sem apagar a avaliação nem o resumo.

## Limites e dependências

- **Inclui:** cadastro do termo pela gestão; registro de autorização, recusa e revogação; verificação de permissão antes de gravar; gravação em partes; reprodução só pela gestão com registro de acesso; retenção de 90 dias; estado da transcrição como "não disponível nesta fase".
- **Fora de escopo:** transcrição; resumo por IA; envio do áudio para qualquer serviço; uso do áudio para o feedback dos avaliadores (exige aviso próprio, fase 4); download.
- **Entradas e pré-condições:** SPEC-2-003 no ar (rascunho de avaliação por atendimento); para gravação real, o termo aprovado pela clínica.
- **Saídas/artefatos:** coleções `termos_gravacao`, `autorizacoes_gravacao`, `audios_avaliacao` e `acessos_audio`; rotas `pode-gravar`, `enviar-parte` e `ouvir`; botões no atendimento de avaliação; tela da gestão para o termo e para os acessos; rotina diária de retenção.
- **Dependências e responsáveis:** Maestro constrói; a clínica aprova o termo; Luiz testa.
- **Atores e permissões mínimas:**
  - **Registrar a decisão do paciente:** a recepção ou o dentista do atendimento.
  - **Gravar:** só o dentista do atendimento.
  - **Gestão:** cadastra o termo, ouve e vê os acessos.
  - **Demais papéis:** nenhum recebe o arquivo nem o link.
- **Superfícies/arquivos/configurações afetadas:**
  - **Coleções:** migrations novas com regras de lista e leitura de `audios_avaliacao` só para a gestão, campo `arquivo` protegido (audio/webm, audio/mp4, audio/ogg; até 20 MB por parte) e `acessos_audio` só de inclusão.
  - **Histórico:** migration aditiva em `eventos.tipo` (`gravacao_autorizada`, `gravacao_recusada`, `gravacao_revogada`, `audio_apagado`).
  - **Regras e telas:** hook de regras; rotina agendada; atendimento de avaliação (SPEC-2-003); tela de configuração da gestão.
- **Risco e plano B:** se o armazenamento recusar o tamanho de uma parte, reduzir a parte para 5 minutos; se o navegador do celular não gravar, gravar no computador da sala.
- **Rollback ou reversão:** deixar o termo inativo bloqueia novas gravações sem apagar avaliações; áudios existentes seguem a retenção.

## Dados e integrações

| Origem/destino | Fonte de verdade | Campos/contrato | Autenticação/permissão | Timeout/retry/idempotência | Tratamento de erro |
|---|---|---|---|---|---|
| Gestão → `termos_gravacao` | Clínica (texto aprovado) | `versao`; `texto`; `finalidade` ("continuidade do tratamento"); `aprovado_por_clinica` (nome); `aprovado_em`; `ativo`; `unidade`; `teste` | Só gestão | Uma versão ativa por unidade e por tipo (real ou teste) | Sem termo ativo, gravação real bloqueada |
| Atendimento → `autorizacoes_gravacao` | Central | `atendimento`; `paciente`; `decisao` (autorizou, recusou, revogou); `termo_versao`; `finalidade`; `registrado_por`; `registrado_em`; `teste` | Recepção, dentista do atendimento, gestão | Última decisão vale; histórico preservado | Decisão sem termo ativo é recusada |
| Navegador → `audios_avaliacao` | Central | `avaliacao_raiz`; `atendimento`; `parte` (1, 2…); `arquivo` (protegido); `duracao_s`; `gravado_por`; `gravado_em`; `apagar_em` (= data de `gravado_em` + 90 dias); `estado` (ativo, apagado); `motivo_apagado` (retencao, revogacao); `transcricao_estado` (nao_disponivel_fase_2); `teste` | Rota `enviar-parte`, que repete a verificação de `pode-gravar` | Mesma `avaliacao_raiz` + `parte` não duplica | Upload falho mantém a parte na memória da página para nova tentativa; antes de fechar a tela, aviso de parte não enviada |
| Gestão → `acessos_audio` | Central | `audio`; `usuario`; `acao` (ouviu); `em` | Gravado pela rota `ouvir` antes de entregar o conteúdo | — | — |
| Rotina diária → `audios_avaliacao` | Central | `apagar_em` ≤ hoje e `estado` ativo | Servidor | Reexecutar não falha nem apaga outros; grava a última execução | Falha registrada para a gestão |

| Regra de negócio | Condição | Ação/resultado | Exceção | Fonte |
|---|---|---|---|---|
| RN-01 | Sem termo real ativo | `pode-gravar` responde bloqueado: "Termo de gravação ainda não aprovado" | Paciente de teste com termo de teste ativo | DH-04, CL-PEND-007 |
| RN-02 | Termo de teste com paciente sem marca de teste | Bloqueado | — | Proteção do dado real |
| RN-03 | Decisão "recusou" ou sem decisão | Bloqueado; registro manual segue | — | WA-04 |
| RN-04 | Decisão "revogou" | Bloqueia novas gravações do atendimento e apaga os áudios da avaliação com motivo "revogacao" | — | Padrão desta SPEC |
| RN-05 | Pedido do arquivo | Só pela rota `ouvir`, só para a gestão, com `acessos_audio` gravado antes; a tela nunca monta o link do arquivo; endereço direto negado a todos | — | Política da clínica |
| RN-06 | `apagar_em` ≤ hoje | Apagar o arquivo; manter o registro com estado "apagado" e motivo "retencao" | — | Política de 90 dias |
| RN-07 | Rotina sem rodar há mais de 36 horas | Aviso "retenção de áudio sem rodar" na tela da gestão | — | Monitoramento |
| RN-08 | Transcrição | Estado fixo "não disponível nesta fase"; nenhuma chamada HTTP para fora do Skip | — | Escopo da fase 2 |
| RN-09 | Armazenamento local | Nenhum áudio vai para IndexedDB, cache ou download no navegador | — | Dado de saúde em aparelho compartilhado |
| RN-10 | Tocar em "Gravar" sem avaliação do atendimento | A central abre o rascunho da avaliação daquele atendimento (SPEC-2-003) | — | Vínculo da gravação |

## Fluxo e regras

1. A gestão cadastra o termo aprovado pela clínica e o deixa ativo.
2. No atendimento de avaliação, a recepção ou o dentista leem o termo ao paciente e registram "autorizou" ou "recusou".
3. O dentista toca em "Gravar". A tela consulta `pode-gravar` e, se permitido, grava mostrando o tempo, a parte atual e as partes enviadas. "Pausar" e "Encerrar" fecham a parte e a enviam.
4. A gestão ouve na avaliação pela rota `ouvir`; cada reprodução entra em `acessos_audio`.
5. Se o paciente revogar, a pessoa registra "revogou", e os áudios daquela avaliação são apagados.
6. Toda madrugada a rotina apaga os áudios do dia de retenção.

| Cenário | Dado/condição | Resultado esperado | Caminho de erro/recuperação |
|---|---|---|---|
| Principal | Termo ativo e autorizou | Partes gravadas e ligadas à avaliação | — |
| Limite | Avaliação de 35 minutos | Quatro partes | — |
| Falha | Sem termo ativo | Botão bloqueado com o motivo | Registro manual |
| Falha | Recusou | Botão bloqueado | Registro manual |
| Falha | Dentista ou CRC tenta abrir o arquivo | Negado pelo servidor | — |
| Recuperação | Internet cai durante a parte 2 | Parte 2 reenviada ao voltar, sem duplicar | — |

## Instruções de execução para o Maestro

1. **Ler antes de alterar:** esta SPEC, a SPEC-2-003 e a configuração de arquivos do projeto em `07-sistemas/`.
2. **Alterar somente:** as migrations, o hook, as rotas e a rotina desta SPEC; o atendimento de avaliação; a tela de configuração da gestão.
3. **Não alterar:** permissões das coleções da fase 1 e da SPEC-2-003; nenhuma chamada a serviço externo.
4. **Executar nesta ordem:** termo, autorização e `pode-gravar`; gravação em partes com arquivo protegido desde o início; rota `ouvir` com registro de acesso; retenção e revogação.
5. **Parar e pedir validação quando:** o armazenamento do Skip não permitir arquivo protegido lido só pela rota do servidor. Nesse caso, não gravar áudio; relatar a limitação.
6. **Estado válido ao parar:** sem termo ativo a gravação fica bloqueada; o registro manual funciona.
7. **Ritmo:** construir as tasks vinculadas em sequência, sem pedir autorização nem teste a cada task. O teste do cliente é o roteiro único de `## Teste humano do cliente`, quando todas as tasks vinculadas estiverem no ar. Ponto de aprovação antes disso: nenhum.

## Checklist de execução

- [ ] Termo com versão, finalidade, unidade e tipo; só a gestão cadastra.
- [ ] Autorização, recusa e revogação com histórico e eventos.
- [ ] `pode-gravar` aplica RN-01 a RN-03; `enviar-parte` repete a verificação.
- [ ] Arquivo protegido desde a primeira parte; `ouvir` só para a gestão, com registro de acesso.
- [ ] Rotina diária idempotente, com aviso de 36 horas.
- [ ] Provas P2.4 na tela Provas com áudio sintético.

## Critérios de aceite

- [ ] **CA-2-14:** sem termo real ativo, com termo inativo, com recusa ou com termo de teste para paciente sem marca de teste, a gravação é recusada pelo servidor, e o registro manual segue funcionando; deixar o termo inativo não apaga avaliações nem áudios.
- [ ] **CA-2-15:** com termo ativo e autorização, a gravação é salva em partes ligadas à avaliação e ao atendimento; uma parte reenviada não duplica; tipo e tamanho fora do permitido são recusados; nenhum áudio fica guardado no navegador.
- [ ] **CA-2-16:** só a gestão recebe o áudio, e só pela rota `ouvir`; o endereço direto do arquivo é negado a todos; dentista, recepção e CRC recebem negado; cada reprodução fica em `acessos_audio`, que ninguém edita nem apaga.
- [ ] **CA-2-17:** no dia em que `apagar_em` chega, a rotina apaga o áudio, e a avaliação e o resumo continuam; a revogação apaga os áudios da avaliação; os dois casos ficam registrados com o motivo; rotina sem rodar há mais de 36 horas aparece para a gestão.
- [ ] **CA-2-18:** a avaliação mostra "transcrição não disponível nesta fase", e o código desta SPEC não faz chamada HTTP para fora do Skip.

## TDD da SPEC

| Etapa | Prova | Comando/ação | Resultado esperado | Evidência |
|---|---|---|---|---|
| RED | P2.4-01: `pode-gravar` sem termo real ativo, com paciente sintético sem marca de teste, criado e removido pela prova | Rota | Bloqueado; nenhum arquivo gravado | Registro da tela Provas |
| RED | P2.4-02: recusa registrada; P2.4-02b: termo de teste ativo com paciente sem marca de teste | Rota `pode-gravar` | Bloqueado nos dois | Registro da tela Provas |
| RED | P2.4-03: dentista, recepção e CRC pedem o áudio | Rota `ouvir` e leitura direta | Negado nos três | Registro da tela Provas |
| RED | P2.4-09: gestão pede o arquivo pelo endereço direto | Endereço do arquivo | Negado | Registro da tela Provas |
| RED | P2.4-12: parte com tipo inválido e parte acima de 20 MB | `enviar-parte` | Recusadas | Registro da tela Provas |
| GREEN | P2.4-04: termo de teste, autorização, duas partes de áudio sintético | `enviar-parte` | Duas partes ligadas à avaliação; `apagar_em` = +90 dias | Registro da tela Provas |
| GREEN | P2.4-05: gestão ouve | Rota `ouvir` | Conteúdo entregue; acesso registrado antes | Registro da tela Provas |
| GREEN | P2.4-10: estado da transcrição e chamadas externas | Abrir a avaliação; conferir o código desta SPEC | "transcrição não disponível nesta fase"; nenhuma chamada HTTP para fora do Skip | Registro da tela Provas e lista de arquivos conferidos |
| REFACTOR/REGRESSÃO | P2.4-06: reenviar a parte 2 | `enviar-parte` | Continua uma parte 2 | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.4-07: parte de teste com `apagar_em` hoje; rodar a rotina duas vezes | Rotina | Arquivo apagado uma vez; avaliação preservada; segunda execução sem erro; última execução gravada | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.4-08: revogar | Registrar revogação | Áudios da avaliação apagados com motivo; botão bloqueado | Registro da tela Provas |
| REFACTOR/REGRESSÃO | P2.4-11: deixar o termo inativo | Configuração | Nova gravação bloqueada; avaliações e áudios preservados | Registro da tela Provas |

**Dados/fixtures:** termo de teste "TESTE-1", paciente de teste, paciente sintético sem marca criado e removido pela prova, dois arquivos curtos de áudio sintético sem voz de paciente; limpeza pela tela Provas.  
**Caminhos de erro obrigatórios:** sem termo, termo de teste com paciente real, recusa, papel sem acesso, endereço direto, parte repetida, arquivo inválido, rotina repetida, revogação, termo inativo.  
**Evidência exigida:** registro das provas; captura do botão bloqueado e da lista de acessos.

## Teste humano do cliente

- **Origem:** CL-008
- **Quando:** quando todas as tasks de `## Tasks vinculadas` estiverem no ar
- **Quem testa:** Luiz (com um usuário de gestão) e um dentista
- **Passos:**
  1. Com o paciente de teste e o termo de teste, registrar a autorização.
  2. Como dentista, gravar um minuto falando de um caso fictício e tentar ouvir.
  3. Como gestão, ouvir e ver o acesso registrado.
  4. Registrar a recusa noutra avaliação de teste e ver o botão bloqueado.
- **Resultado esperado:** grava só com autorização, só a gestão ouve e fica registrado quem ouviu.
- **Evidência do aceite:** "testei, pode seguir" do Luiz no grupo. A gravação de pacientes reais começa quando a clínica aprovar o termo e a gestão o cadastrar.

## Handoff e operação

- **Como demonstrar:** avaliação de teste com duas partes e a lista de acessos.
- **Como operar depois:** a recepção lê o termo e registra a decisão; o dentista grava; a gestão ouve quando precisar.
- **Como monitorar:** aviso de rotina sem rodar e falhas da retenção na tela da gestão.
- **Pendência conhecida:** termo e forma de assinatura da clínica; prazo de retenção da transcrição (fase 4).

## Tasks vinculadas

| ID | Task | Dono | SPEC | Critério | Recorte da prova | Evidência esperada | Pré-condições | Status |
|---|---|---|---|---|---|---|---|---|
| 5553c749-7158-46cb-a7e9-ab1f9f8e80b6 | Bloquear a gravação sem termo aprovado ou sem autorização do paciente | L A Rodrigues | SPEC-2-004 | CA-2-14 | P2.4-01, P2.4-02, P2.4-02b, P2.4-11 | Provas | SPEC-2-003 no ar | ☐ |
| e04eeb1a-1a57-4308-ab03-dd0b4b0895a4 | Gravar a avaliação quando o paciente autorizar | L A Rodrigues | SPEC-2-004 | CA-2-15, CA-2-18 | P2.4-03, P2.4-04, P2.4-06, P2.4-10, P2.4-12 | Provas | Bloqueio da gravação no ar | ☐ |
| a8f60f01-76a3-459b-9d69-046d874421a7 | Deixar só a gestão ouvir o áudio, com registro de acesso | L A Rodrigues | SPEC-2-004 | CA-2-16 | P2.4-03, P2.4-05, P2.4-09 | Provas e lista de acessos | Gravação no ar | ☐ |
| 5eb21b1d-c6e1-4fc4-aa03-f7dbd50bcaca | Apagar os áudios depois de 90 dias ou na revogação | L A Rodrigues | SPEC-2-004 | CA-2-17 | P2.4-07, P2.4-08 | Provas | Gravação no ar | ☐ |

## Emendas

| Data | Origem do sinal | Micro-spec/task | Motivo |
|---|---|---|---|
| | | | |
