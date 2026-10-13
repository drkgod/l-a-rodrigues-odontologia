// Task f4982b80 — dimensão "por dentista" da tabela de duração (SPEC-1-002)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('regras_duracao')
    if (!col.fields.getByName('profissional')) {
      // vazio = regra de grupo (vale para todos); preenchido = específica do profissional
      col.fields.add(new TextField({ name: 'profissional' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('regras_duracao')
    col.fields.removeByName('profissional')
    app.save(col)
  },
)
