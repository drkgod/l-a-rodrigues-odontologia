// Task eec75533 — marca leads importados do APP CRC (rastreio de origem).
migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('importado_app_crc')) {
      leads.fields.add(new BoolField({ name: 'importado_app_crc' }))
    }
    app.save(leads)
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    const f = leads.fields.getByName('importado_app_crc')
    if (f) leads.fields.removeByName('importado_app_crc')
    app.save(leads)
  },
)
