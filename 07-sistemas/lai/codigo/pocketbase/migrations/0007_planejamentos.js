// Task 097ff6ce — coleção planejamentos (SPEC-1-002, CA-1-08/09)
// Histórico das consultas de tempo sugerido. Sem dado pessoal: grava só
// profissional, itens consultados, minutos e a regra aplicada.
// Escrita só pelo hook (createRule null); gestão edita/apaga; leitura autenticada.
migrate(
  (app) => {
    const leitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"
    app.save(
      new Collection({
        name: 'planejamentos',
        type: 'base',
        listRule: leitura,
        viewRule: leitura,
        createRule: null,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          // snapshot textual do profissional consultado (nome); id pode sumir com limpeza de prova
          { name: 'profissional', type: 'text' },
          // itens consultados: [{ grupo_regra, quantidade }]
          { name: 'itens', type: 'json' },
          { name: 'minutos_sugeridos', type: 'number', onlyInt: true },
          { name: 'minutos_brutos', type: 'number', onlyInt: true },
          { name: 'situacao', type: 'select', values: ['sugerido', 'sem_regra'], maxSelect: 1 },
          // regra aplicada: { grupo_regra, aplica_a, faixa_1, faixa_2, profissional, observacao }
          { name: 'regra_aplicada', type: 'json' },
          { name: 'crc', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )
  },
  (app) => {
    const col = app.findCollectionByNameOrId('planejamentos')
    app.delete(col)
  },
)
