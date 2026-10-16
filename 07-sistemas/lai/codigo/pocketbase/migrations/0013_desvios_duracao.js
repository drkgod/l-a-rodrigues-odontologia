// Task fdca5fb0 — desvios de duração + vínculo planejamento↔reserva (SPEC-1-002, CA-1-10/11)
// Migration ADITIVA: coleção desvios_duracao nova + campos novos em planejamentos
// (paciente, agenda_item, minutos_reservados, criado_por, valores novos de situacao).
// situacao atual (sugerido/sem_regra) preservada — valores somados ao select.
migrate(
  (app) => {
    const leitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"
    app.save(
      new Collection({
        name: 'desvios_duracao',
        type: 'base',
        listRule: leitura,
        viewRule: leitura,
        createRule: gestao,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          { name: 'planejamento', type: 'relation', collectionId: 'pbc_324442087', maxSelect: 1, required: true },
          { name: 'minutos_sugeridos', type: 'number', onlyInt: true },
          { name: 'minutos_reservados', type: 'number', onlyInt: true },
          { name: 'diferenca', type: 'number', onlyInt: true },
          {
            name: 'motivo_tipo',
            type: 'select',
            values: ['grade do profissional', 'outro'],
            maxSelect: 1,
          },
          { name: 'motivo', type: 'text' },
          {
            name: 'situacao',
            type: 'select',
            values: ['sem_motivo', 'justificado', 'revisado'],
            maxSelect: 1,
          },
          { name: 'crc', type: 'text' },
          { name: 'revisado_por', type: 'text' },
          { name: 'revisado_em', type: 'date' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )
    const pl = app.findCollectionByNameOrId('planejamentos')
    if (!pl.fields.getByName('paciente_nome')) {
      pl.fields.add(new TextField({ name: 'paciente_nome' }))
    }
    if (!pl.fields.getByName('paciente_telefone')) {
      pl.fields.add(new TextField({ name: 'paciente_telefone' }))
    }
    if (!pl.fields.getByName('agenda_item')) {
      pl.fields.add(
        new RelationField({
          name: 'agenda_item',
          collectionId: 'pbc_3449006614',
          maxSelect: 1,
        }),
      )
    }
    if (!pl.fields.getByName('minutos_reservados')) {
      pl.fields.add(new NumberField({ name: 'minutos_reservados', onlyInt: true }))
    }
    if (!pl.fields.getByName('criado_por')) {
      pl.fields.add(new TextField({ name: 'criado_por' }))
    }
    const situacao = pl.fields.getByName('situacao')
    if (situacao && situacao.values.indexOf('planejado') < 0) {
      situacao.values = situacao.values.concat([
        'planejado',
        'reservado',
        'reserva_nao_encontrada',
        'cancelado',
      ])
    }
    app.save(pl)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('desvios_duracao'))
    const pl = app.findCollectionByNameOrId('planejamentos')
    for (const nome of ['paciente_nome', 'paciente_telefone', 'agenda_item', 'minutos_reservados', 'criado_por']) {
      const f = pl.fields.getByName(nome)
      if (f) pl.fields.removeByName(nome)
    }
    app.save(pl)
  },
)