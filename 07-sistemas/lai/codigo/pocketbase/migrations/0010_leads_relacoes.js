// Task 8d76cea5 — PARTE 2: relações cruzadas leads↔pacientes (coleções já existem
// pela 0009) e eventos com relação real. Down remove os campos adicionados.
migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('paciente')) {
      leads.fields.add(
        new RelationField({
          name: 'paciente',
          collectionId: app.findCollectionByNameOrId('pacientes').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(leads)

    const pacientes = app.findCollectionByNameOrId('pacientes')
    if (!pacientes.fields.getByName('lead')) {
      pacientes.fields.add(
        new RelationField({
          name: 'lead',
          collectionId: app.findCollectionByNameOrId('leads').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(pacientes)

    // eventos: troca texto por relação real (append-only, sem dado migrado — coleção nova)
    const eventos = app.findCollectionByNameOrId('eventos')
    if (!eventos.fields.getByName('lead_rel')) {
      eventos.fields.add(
        new RelationField({
          name: 'lead_rel',
          collectionId: app.findCollectionByNameOrId('leads').id,
          maxSelect: 1,
        }),
      )
      eventos.fields.add(
        new RelationField({
          name: 'paciente_rel',
          collectionId: app.findCollectionByNameOrId('pacientes').id,
          maxSelect: 1,
        }),
      )
      app.save(eventos)
    }
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    leads.fields.removeByName('paciente')
    app.save(leads)
    const pacientes = app.findCollectionByNameOrId('pacientes')
    pacientes.fields.removeByName('lead')
    app.save(pacientes)
    const eventos = app.findCollectionByNameOrId('eventos')
    eventos.fields.removeByName('lead_rel')
    eventos.fields.removeByName('paciente_rel')
    app.save(eventos)
  },
)