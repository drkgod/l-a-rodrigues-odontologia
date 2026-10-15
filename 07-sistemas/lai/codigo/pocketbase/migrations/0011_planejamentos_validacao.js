// Task 6d5de2f5 — campos de validação da direção nos casos sem regra (SPEC-1-002, CA-1-09)
// Aditiva: gestão marca "Marcar como validado" → grava quem validou e quando.
// Enquanto validado_em vazio, o planejamento continua devolvendo "sem regra" (motor intacto).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('planejamentos')
    if (!col.fields.getByName('validado_por')) {
      col.fields.add(new TextField({ name: 'validado_por', max: 200 }))
    }
    if (!col.fields.getByName('validado_em')) {
      col.fields.add(new DateField({ name: 'validado_em' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('planejamentos')
    col.fields.removeByName('validado_por')
    col.fields.removeByName('validado_em')
    app.save(col)
  },
)
