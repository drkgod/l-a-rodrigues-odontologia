// Task 7805f88a — base da unidade piloto: papéis, catálogos, config e provas (SPEC-1-001)
migrate(
  (app) => {
    const regraLeitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const regraGestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"

    // 1. cadeiras
    app.save(
      new Collection({
        name: 'cadeiras',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'clinicorp_id', type: 'text' },
          {
            name: 'origem',
            type: 'select',
            values: ['fixture', 'manual', 'importacao'],
            maxSelect: 1,
            required: true,
          },
          { name: 'lote_id', type: 'text' },
          { name: 'nome', type: 'text', required: true },
          { name: 'tipo', type: 'select', values: ['avaliacao', 'tratamento'], maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    // 2. profissionais (referencia cadeiras)
    const cadeirasId = app.findCollectionByNameOrId('cadeiras').id
    app.save(
      new Collection({
        name: 'profissionais',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'clinicorp_id', type: 'text' },
          {
            name: 'origem',
            type: 'select',
            values: ['fixture', 'manual', 'importacao'],
            maxSelect: 1,
            required: true,
          },
          { name: 'lote_id', type: 'text' },
          { name: 'nome', type: 'text', required: true },
          { name: 'ativo', type: 'bool' },
          {
            name: 'cadeira_padrao',
            type: 'relation',
            collectionId: cadeirasId,
            maxSelect: 1,
          },
          {
            name: 'tipo_agenda',
            type: 'select',
            values: ['avaliacao', 'tratamento', 'ambos'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    // 3. users: papel, ativo e profissional + regras por função
    const profissionaisId = app.findCollectionByNameOrId('profissionais').id
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('papel')) {
      users.fields.add(
        new SelectField({
          name: 'papel',
          values: [
            'gestao',
            'crc_agendamento',
            'crc_confirmacao',
            'crc_comercial',
            'recepcao',
            'dentista',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('ativo')) {
      users.fields.add(new BoolField({ name: 'ativo' }))
    }
    if (!users.fields.getByName('profissional')) {
      users.fields.add(
        new RelationField({
          name: 'profissional',
          collectionId: profissionaisId,
          maxSelect: 1,
        }),
      )
    }
    users.listRule = "id = @request.auth.id || @request.auth.papel = 'gestao'"
    users.viewRule = "id = @request.auth.id || @request.auth.papel = 'gestao'"
    users.updateRule =
      "(id = @request.auth.id && @request.body.papel:changed = false && @request.body.ativo:changed = false && @request.body.profissional:changed = false) || @request.auth.papel = 'gestao'"
    users.createRule = regraGestao
    users.deleteRule = regraGestao
    app.save(users)

    // 4. config_unidade (registro único)
    app.save(
      new Collection({
        name: 'config_unidade',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'nome_unidade', type: 'text', required: true },
          { name: 'clinicorp_business_id', type: 'text' },
          {
            name: 'modo_dados',
            type: 'select',
            values: ['demonstracao', 'importado'],
            maxSelect: 1,
          },
          { name: 'integracoes_externas_habilitadas', type: 'bool' },
          { name: 'fuso', type: 'text' },
          { name: 'dias_passados_leitura', type: 'number', onlyInt: true },
          { name: 'dias_futuros_leitura', type: 'number', onlyInt: true },
          { name: 'arredondamento_min', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    // 5. provas_execucoes (somente gestão)
    app.save(
      new Collection({
        name: 'provas_execucoes',
        type: 'base',
        listRule: regraGestao,
        viewRule: regraGestao,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'spec', type: 'text', required: true },
          { name: 'cenario', type: 'text', required: true },
          { name: 'esperado', type: 'text' },
          { name: 'obtido', type: 'text' },
          { name: 'passou', type: 'bool' },
          { name: 'executado_por', type: 'text' },
          { name: 'executado_em', type: 'date' },
          { name: 'observacao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    // 6. seeds idempotentes: config da unidade de teste + usuário de gestão
    try {
      app.findFirstRecordByData('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
    } catch (_) {
      const config = app.findCollectionByNameOrId('config_unidade')
      const registro = new Record(config)
      registro.set('nome_unidade', 'UNIDADE-DEMO')
      registro.set('modo_dados', 'demonstracao')
      registro.set('integracoes_externas_habilitadas', false)
      registro.set('fuso', 'America/Sao_Paulo')
      registro.set('dias_passados_leitura', 7)
      registro.set('dias_futuros_leitura', 45)
      registro.set('arredondamento_min', 5)
      app.save(registro)
    }

    try {
      app.findAuthRecordByEmail('users', 'admin@lai.local')
    } catch (_) {
      const registro = new Record(users)
      registro.setEmail('admin@lai.local')
      registro.setPassword('Lai@2026adm')
      registro.setVerified(true)
      registro.set('name', 'Gestão Lai')
      registro.set('papel', 'gestao')
      registro.set('ativo', true)
      app.save(registro)
    }
  },
  (app) => {
    // down: desfaz na ordem inversa
    try {
      app.delete(app.findAuthRecordByEmail('users', 'admin@lai.local'))
    } catch (_) {}
    try {
      const cfg = app.findFirstRecordByData('config_unidade', 'nome_unidade', 'UNIDADE-DEMO')
      app.delete(cfg)
    } catch (_) {}

    const provas = app.findCollectionByNameOrId('provas_execucoes')
    app.delete(provas)
    const config = app.findCollectionByNameOrId('config_unidade')
    app.delete(config)

    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('profissional')
    users.fields.removeByName('ativo')
    users.fields.removeByName('papel')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    users.createRule = ''
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)

    const profissionais = app.findCollectionByNameOrId('profissionais')
    app.delete(profissionais)
    const cadeiras = app.findCollectionByNameOrId('cadeiras')
    app.delete(cadeiras)
  },
)
