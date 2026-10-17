// Task f124df8f — cobertura de ligação por turno (SPEC-1-004, CA-1-19)
// Migration ADITIVA: coleção config_turno_ligacao nova (2 registros: manhã e tarde).
// O hook RN-04 (mover-nao-respondentes) já lê esta coleção com try/catch — sem ela,
// o responsável vira "a definir" + alerta; com ela, a gestão define quem liga.
// Escrita = gestão; leitura = qualquer papel ativo (CRCs e recepção consultam).
migrate(
  (app) => {
    const leitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"
    app.save(
      new Collection({
        name: 'config_turno_ligacao',
        type: 'base',
        listRule: leitura,
        viewRule: leitura,
        createRule: gestao,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          {
            name: 'turno',
            type: 'select',
            values: ['manha', 'tarde'],
            maxSelect: 1,
            required: true,
          },
          { name: 'responsavel', type: 'text' },
          { name: 'atualizado_por', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_config_turno ON config_turno_ligacao (turno)'],
      }),
    )
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('config_turno_ligacao'))
  },
)
