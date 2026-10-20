// Task d03a15ee — correção do relatório de origem: entrada_em é autodate
// (ignora escrita via API), então a data real de entrada do APP CRC vai em
// data_entrada (date). Relatório usa data_entrada com fallback pra entrada_em.
migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('data_entrada')) {
      leads.fields.add(new DateField({ name: 'data_entrada' }))
    }
    app.save(leads)
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    const f = leads.fields.getByName('data_entrada')
    if (f) leads.fields.removeByName('data_entrada')
    app.save(leads)
  },
)
