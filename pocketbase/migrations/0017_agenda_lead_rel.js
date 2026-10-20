// Task d03a15ee — CA-1-17: vínculo lead↔consulta na agenda. Relação opcional
// agenda_itens.lead (maxSelect 1) para o hook leads_acompanhamento preencher por
// telefone. Down remove o campo.
migrate(
  (app) => {
    const agendaItens = app.findCollectionByNameOrId('agenda_itens')
    if (!agendaItens.fields.getByName('lead')) {
      agendaItens.fields.add(
        new RelationField({
          name: 'lead',
          collectionId: app.findCollectionByNameOrId('leads').id,
          maxSelect: 1,
        }),
      )
      app.save(agendaItens)
    }
  },
  (app) => {
    const agendaItens = app.findCollectionByNameOrId('agenda_itens')
    agendaItens.fields.removeByName('lead')
    app.save(agendaItens)
  },
)
