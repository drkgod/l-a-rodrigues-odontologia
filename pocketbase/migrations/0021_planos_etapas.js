// Emenda CA-SEQ-03 — etapas do plano do paciente (SPEC-1-003).
// planos_tratamento ganha `etapas` (json: [{chave, procedimento, ordem_visual,
// depende_de[], estado_etapa}]) + `motivo_ajuste` (adaptação do modelo com motivo).
// Etapas são CÓPIA independente (mudança no plano não mexe no modelo e vice-versa).
// Aditiva, com down.
migrate(
  (app) => {
    const planos = app.findCollectionByNameOrId('planos_tratamento')
    if (!planos.fields.getByName('etapas')) {
      planos.fields.add(new JSONField({ name: 'etapas' }))
    }
    if (!planos.fields.getByName('motivo_ajuste')) {
      planos.fields.add(new TextField({ name: 'motivo_ajuste' }))
    }
    app.save(planos)
  },
  (app) => {
    const planos = app.findCollectionByNameOrId('planos_tratamento')
    const e1 = planos.fields.getByName('etapas')
    if (e1) planos.fields.removeByName('etapas')
    const e2 = planos.fields.getByName('motivo_ajuste')
    if (e2) planos.fields.removeByName('motivo_ajuste')
    app.save(planos)
  },
)
