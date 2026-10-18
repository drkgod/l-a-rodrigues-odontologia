// Task f79847a5 — conciliação de liberações com a leitura da agenda (SPEC-1-004, CA-1-22)
// Migration ADITIVA: 2 campos text em liberacoes (evidencia_desmarcacao, pendencia).
// Nenhum dado existente é alterado; down remove os campos.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('liberacoes')
    if (!col.fields.getByName('evidencia_desmarcacao')) {
      col.fields.add(new TextField({ name: 'evidencia_desmarcacao' }))
    }
    if (!col.fields.getByName('pendencia')) {
      col.fields.add(new TextField({ name: 'pendencia' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('liberacoes')
    col.fields.removeByName('evidencia_desmarcacao')
    col.fields.removeByName('pendencia')
    app.save(col)
  },
)
