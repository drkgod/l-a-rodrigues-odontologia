// Task 1f4de19d — tabela de duração versionada (SPEC-1-002, CA-1-07)
migrate(
  (app) => {
    const regraLeitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const regraGestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"

    app.save(
      new Collection({
        name: 'tabela_duracao',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'versao', type: 'text', required: true },
          { name: 'arquivo_hash', type: 'text' },
          { name: 'nome_arquivo', type: 'text' },
          { name: 'importada_por', type: 'text' },
          { name: 'aprovada_por', type: 'text' },
          { name: 'aprovada_em', type: 'text' },
          { name: 'ativa', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    const tabelasId = app.findCollectionByNameOrId('tabela_duracao').id
    app.save(
      new Collection({
        name: 'regras_duracao',
        type: 'base',
        listRule: regraLeitura,
        viewRule: regraLeitura,
        createRule: regraGestao,
        updateRule: regraGestao,
        deleteRule: regraGestao,
        fields: [
          { name: 'tabela', type: 'relation', collectionId: tabelasId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'grupo_regra', type: 'text', required: true },
          { name: 'aplica_a', type: 'text' },
          { name: 'variavel_1', type: 'text' },
          { name: 'min_1', type: 'number', onlyInt: true },
          { name: 'max_1', type: 'number', onlyInt: true },
          { name: 'variavel_2', type: 'text' },
          { name: 'min_2', type: 'number', onlyInt: true },
          { name: 'max_2', type: 'number', onlyInt: true },
          { name: 'duracao_min', type: 'number', onlyInt: true },
          { name: 'procedimentos', type: 'text' },
          { name: 'observacao', type: 'text' },
          { name: 'origem', type: 'select', values: ['fixture', 'importacao'], maxSelect: 1, required: true },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )
  },
  (app) => {
    const regras = app.findCollectionByNameOrId('regras_duracao')
    app.delete(regras)
    const tabelas = app.findCollectionByNameOrId('tabela_duracao')
    app.delete(tabelas)
  },
)
