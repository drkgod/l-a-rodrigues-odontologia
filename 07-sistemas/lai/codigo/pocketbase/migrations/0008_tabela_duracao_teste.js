// Task 097ff6ce — campo teste em tabela_duracao (SPEC-1-002, provas P2)
// Tabela de teste das provas é marcada teste=true e NUNCA é aprovada;
// a tabela real segue ativa. Aditivo — sem risco de dados.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tabela_duracao')
    if (!col.fields.getByName('teste')) {
      col.fields.add(new BoolField({ name: 'teste' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('tabela_duracao')
    col.fields.removeByName('teste')
    app.save(col)
  },
)
