// Task a9f9e30e — regras de confirmação e liberação (SPEC-1-004 · CA-1-20/21):
// parâmetros CL-004 na config, políticas por agenda e coleções de contato/mensagem/
// ligação/liberação/oferta. Aditiva: não mexe em dado existente (só preenche vazio).
migrate(
  (app) => {
    const regraLeitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const regraGestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"

    // 1. config_unidade: parâmetros da regra de confirmação (CL-004)
    const config = app.findCollectionByNameOrId('config_unidade')
    if (!config.fields.getByName('confirmacao_dias_antes'))
      config.fields.add(new NumberField({ name: 'confirmacao_dias_antes', onlyInt: true }))
    if (!config.fields.getByName('corte_confirmacao_hora'))
      config.fields.add(new NumberField({ name: 'corte_confirmacao_hora', onlyInt: true }))
    if (!config.fields.getByName('limite_sobreposicao_avaliacao'))
      config.fields.add(
        new NumberField({ name: 'limite_sobreposicao_avaliacao', onlyInt: true }),
      )
    if (!config.fields.getByName('duracao_avaliacao_minutos'))
      config.fields.add(new NumberField({ name: 'duracao_avaliacao_minutos', onlyInt: true }))
    if (!config.fields.getByName('limite_linhas_robo'))
      config.fields.add(new NumberField({ name: 'limite_linhas_robo', onlyInt: true }))
    if (!config.fields.getByName('modelo_mensagem_confirmacao'))
      config.fields.add(new TextField({ name: 'modelo_mensagem_confirmacao' }))
    if (!config.fields.getByName('formato_telefone_robo'))
      config.fields.add(new TextField({ name: 'formato_telefone_robo' }))
    app.save(config)

    // Seed idempotente dos parâmetros recebidos (só preenche campo vazio)
    try {
      const registro = app.findFirstRecordByData('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
      let mudou = false
      if (registro.getString('confirmacao_dias_antes') === '') {
        registro.set('confirmacao_dias_antes', 1)
        mudou = true
      }
      if (registro.getString('corte_confirmacao_hora') === '') {
        registro.set('corte_confirmacao_hora', 17)
        mudou = true
      }
      if (registro.getString('limite_sobreposicao_avaliacao') === '') {
        registro.set('limite_sobreposicao_avaliacao', 2)
        mudou = true
      }
      if (registro.getString('duracao_avaliacao_minutos') === '') {
        registro.set('duracao_avaliacao_minutos', 30)
        mudou = true
      }
      if (registro.getString('limite_linhas_robo') === '') {
        registro.set('limite_linhas_robo', 80)
        mudou = true
      }
      if (registro.getString('modelo_mensagem_confirmacao') === '') {
        registro.set(
          'modelo_mensagem_confirmacao',
          'Olá, {nome}! Aqui é da L A Rodrigues Odontologia. Sua consulta está marcada para {data} às {hora} com {profissional}. Responda esta mensagem para confirmar, ou ligue para remarcar. Até logo!',
        )
        mudou = true
      }
      if (registro.getString('formato_telefone_robo') === '') {
        registro.set('formato_telefone_robo', 'somente_digitos_com_55')
        mudou = true
      }
      if (mudou) app.save(registro)
    } catch (_) {}

    // 2. politicas_agenda — limites por agenda/profissional/turno (gestão cadastra)
    const profissionaisId = app.findCollectionByNameOrId('profissionais').id
    app.save(
      new Collection({
        name: 'politicas_agenda',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'unidade', type: 'text' },
          {
            name: 'profissional',
            type: 'relation',
            collectionId: profissionaisId,
            maxSelect: 1,
          },
          { name: 'profissional_nome', type: 'text' },
          {
            name: 'tipo',
            type: 'select',
            values: ['avaliacao', 'horario_marcado', 'ordem_chegada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'dia_semana', type: 'number', onlyInt: true },
          { name: 'turno_inicio', type: 'text' },
          { name: 'turno_fim', type: 'text' },
          { name: 'limite_por_horario', type: 'number', onlyInt: true },
          { name: 'limite_por_turno', type: 'number', onlyInt: true },
          {
            name: 'escopo_limite',
            type: 'select',
            values: ['individual', 'grupo'],
            maxSelect: 1,
          },
          { name: 'grupo_profissionais_ids', type: 'text' },
          { name: 'duracao_minutos', type: 'number', onlyInt: true },
          { name: 'regime_agenda', type: 'text' },
          { name: 'origem_regra', type: 'text' },
          { name: 'aprovado_por', type: 'text' },
          {
            name: 'situacao',
            type: 'select',
            values: ['ativa', 'pendente'],
            maxSelect: 1,
          },
          { name: 'versao', type: 'number', onlyInt: true },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_politicas_lookup ON politicas_agenda (tipo, dia_semana, situacao)',
        ],
      }),
    )

    // 3. contatos_confirmacao — estado do contato separado do estado da consulta
    const agendaItensId = app.findCollectionByNameOrId('agenda_itens').id
    app.save(
      new Collection({
        name: 'contatos_confirmacao',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          {
            name: 'agenda_item',
            type: 'relation',
            collectionId: agendaItensId,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'estado',
            type: 'select',
            values: [
              'pendente',
              'mensagem_enviada',
              'confirmou',
              'pediu_remarcacao',
              'cancelou',
              'sem_resposta',
              'em_lista_ligacao',
              'ligacao_sucesso',
              'ligacao_sem_sucesso',
            ],
            maxSelect: 1,
          },
          { name: 'responsavel', type: 'text' },
          { name: 'turno', type: 'text' },
          { name: 'versao_contato', type: 'number', onlyInt: true },
          { name: 'atualizado_por', type: 'text' },
          { name: 'atualizado_em', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_conf_contato_item ON contatos_confirmacao (agenda_item)',
        ],
      }),
    )

    // 4. mensagens_confirmacao — tentativas efetivamente enviadas (chave única)
    const contatosId = app.findCollectionByNameOrId('contatos_confirmacao').id
    app.save(
      new Collection({
        name: 'mensagens_confirmacao',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          {
            name: 'contato',
            type: 'relation',
            collectionId: contatosId,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'tentativa', type: 'number', onlyInt: true },
          { name: 'chave_evento', type: 'text', required: true },
          { name: 'enviada_em', type: 'text' },
          { name: 'registrada_por', type: 'text' },
          {
            name: 'canal',
            type: 'select',
            values: ['robo', 'manual'],
            maxSelect: 1,
          },
          {
            name: 'resultado',
            type: 'select',
            values: ['enviada', 'falhou'],
            maxSelect: 1,
            required: true,
          },
          { name: 'lote_origem', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_conf_msg_chave ON mensagens_confirmacao (chave_evento)',
        ],
      }),
    )

    // 5. ligacoes — prova da ligação sem sucesso (chave única)
    app.save(
      new Collection({
        name: 'ligacoes',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          {
            name: 'contato',
            type: 'relation',
            collectionId: contatosId,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'resultado',
            type: 'select',
            values: ['confirmou', 'pediu_remarcacao', 'cancelou', 'nao_atendeu', 'numero_invalido'],
            maxSelect: 1,
            required: true,
          },
          { name: 'crc', type: 'text' },
          { name: 'feita_em', type: 'text' },
          { name: 'chave_evento', type: 'text', required: true },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_conf_lig_chave ON ligacoes (chave_evento)'],
      }),
    )

    // 6. liberacoes — decisão de liberação (vaga só sai pela regra)
    app.save(
      new Collection({
        name: 'liberacoes',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          {
            name: 'agenda_item',
            type: 'relation',
            collectionId: agendaItensId,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'motivo',
            type: 'select',
            values: ['cancelamento', 'remarcacao', 'ligacao_sem_sucesso'],
            maxSelect: 1,
            required: true,
          },
          { name: 'decidida_por', type: 'text' },
          { name: 'decidida_em', type: 'text' },
          {
            name: 'situacao',
            type: 'select',
            values: ['decidida', 'liberada', 'em_oferta', 'preenchida', 'nao_preenchida'],
            maxSelect: 1,
          },
          { name: 'inicio', type: 'text' },
          { name: 'fim', type: 'text' },
          {
            name: 'profissional',
            type: 'relation',
            collectionId: profissionaisId,
            maxSelect: 1,
          },
          { name: 'tipo_agenda', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_conf_liberacao_item ON liberacoes (agenda_item)',
        ],
      }),
    )

    // 7. ofertas — oferta da vaga liberada (até 3; vencedor único). item_a_agendar
    // fica como referência textual até a coleção pacientes_a_agendar existir (SPEC-1-003).
    const liberacoesId = app.findCollectionByNameOrId('liberacoes').id
    app.save(
      new Collection({
        name: 'ofertas',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          {
            name: 'liberacao',
            type: 'relation',
            collectionId: liberacoesId,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'item_a_agendar', type: 'text' },
          { name: 'enviada_por', type: 'text' },
          { name: 'enviada_em', type: 'text' },
          {
            name: 'estado',
            type: 'select',
            values: [
              'enviada',
              'aceitou_vencedor',
              'aceitou_tarde',
              'recusou',
              'sem_resposta',
              'avisar_vaga_preenchida',
              'avisado',
            ],
            maxSelect: 1,
          },
          { name: 'planejamento', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    // oferta_vencedora em liberacoes (relação circular resolvida após criar ofertas)
    const liberacoes = app.findCollectionByNameOrId('liberacoes')
    if (!liberacoes.fields.getByName('oferta_vencedora')) {
      liberacoes.fields.add(
        new RelationField({
          name: 'oferta_vencedora',
          collectionId: app.findCollectionByNameOrId('ofertas').id,
          maxSelect: 1,
        }),
      )
      app.save(liberacoes)
    }

    // 8. Seeds das políticas específicas recebidas do dono (13/10/2026) — todas
    // PENDENTES até gestão vincular o ID real do profissional (nunca por nome).
    const politicas = app.findCollectionByNameOrId('politicas_agenda')
    const seeds = [
      { unidade: 'ITA', profissional_nome: 'Leonel', tipo: 'ordem_chegada', dia_semana: 3, turno_inicio: '16:00', turno_fim: '', limite_por_turno: 5, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 + db_horarios_profissionais (a partir das 16h)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 1, turno_inicio: '09:00', turno_fim: '13:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da manhã)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 1, turno_inicio: '14:00', turno_fim: '17:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da tarde)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 3, turno_inicio: '09:00', turno_fim: '13:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da manhã)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 3, turno_inicio: '14:00', turno_fim: '17:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da tarde)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 4, turno_inicio: '09:00', turno_fim: '13:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da manhã)' },
      { unidade: 'ITA', profissional_nome: 'Wesley', tipo: 'ordem_chegada', dia_semana: 4, turno_inicio: '14:00', turno_fim: '17:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da tarde)' },
      { unidade: 'ITA', profissional_nome: 'Pamella', tipo: 'ordem_chegada', dia_semana: 5, turno_inicio: '09:00', turno_fim: '13:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da manhã)' },
      { unidade: 'ITA', profissional_nome: 'Pamella', tipo: 'ordem_chegada', dia_semana: 5, turno_inicio: '14:00', turno_fim: '18:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da tarde)' },
      { unidade: 'ITA', profissional_nome: 'Pamella', tipo: 'ordem_chegada', dia_semana: 6, turno_inicio: '09:00', turno_fim: '13:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da manhã)' },
      { unidade: 'ITA', profissional_nome: 'Pamella', tipo: 'ordem_chegada', dia_semana: 6, turno_inicio: '14:00', turno_fim: '18:00', limite_por_turno: 20, escopo_limite: 'individual', regime_agenda: '', origem_regra: 'Resposta do dono 13/10/2026 (20 para cada; turno da tarde)' },
      { unidade: 'ALC', profissional_nome: 'Erika', tipo: 'horario_marcado', dia_semana: 6, turno_inicio: '08:00', turno_fim: '12:00', limite_por_horario: 2, escopo_limite: 'individual', regime_agenda: 'ortodontia', origem_regra: 'Resposta do dono 13/10/2026 (atende ortodontia; 2 por horário)' },
    ]
    for (const s of seeds) {
      // dedup por CONTEÚDO (origem_regra se repete em turnos/dias diferentes)
      const existentes = app.findRecordsByFilter(
        'politicas_agenda',
        'profissional_nome = "' +
          s.profissional_nome +
          '" && tipo = "' +
          s.tipo +
          '" && dia_semana = ' +
          s.dia_semana +
          ' && turno_inicio = "' +
          s.turno_inicio +
          '"',
        '',
        1,
        0,
      )
      if (existentes.length > 0) continue
      const registro = new Record(politicas)
      registro.set('unidade', s.unidade)
      registro.set('profissional_nome', s.profissional_nome)
      registro.set('tipo', s.tipo)
      registro.set('dia_semana', s.dia_semana)
      registro.set('turno_inicio', s.turno_inicio)
      registro.set('turno_fim', s.turno_fim)
      if (s.limite_por_turno) registro.set('limite_por_turno', s.limite_por_turno)
      if (s.limite_por_horario) registro.set('limite_por_horario', s.limite_por_horario)
      registro.set('escopo_limite', s.escopo_limite)
      registro.set('regime_agenda', s.regime_agenda)
      registro.set('origem_regra', s.origem_regra)
      registro.set('aprovado_por', 'Luiz (dono) — resposta 13/10/2026')
      registro.set('situacao', 'pendente')
      registro.set('versao', 1)
      app.save(registro)
    }
  },
  (app) => {
    try {
      const ofertas = app.findCollectionByNameOrId('ofertas')
      app.delete(ofertas)
    } catch (_) {}
    try {
      const liberacoes = app.findCollectionByNameOrId('liberacoes')
      app.delete(liberacoes)
    } catch (_) {}
    try {
      const ligacoes = app.findCollectionByNameOrId('ligacoes')
      app.delete(ligacoes)
    } catch (_) {}
    try {
      const mensagens = app.findCollectionByNameOrId('mensagens_confirmacao')
      app.delete(mensagens)
    } catch (_) {}
    try {
      const contatos = app.findCollectionByNameOrId('contatos_confirmacao')
      app.delete(contatos)
    } catch (_) {}
    try {
      const politicas = app.findCollectionByNameOrId('politicas_agenda')
      app.delete(politicas)
    } catch (_) {}
    try {
      const config = app.findCollectionByNameOrId('config_unidade')
      const nomes = [
        'confirmacao_dias_antes',
        'corte_confirmacao_hora',
        'limite_sobreposicao_avaliacao',
        'duracao_avaliacao_minutos',
        'limite_linhas_robo',
        'modelo_mensagem_confirmacao',
        'formato_telefone_robo',
      ]
      for (const n of nomes) {
        try {
          config.fields.removeByName(n)
        } catch (_) {}
      }
      app.save(config)
    } catch (_) {}
  },
)
