// Emenda CA-SEQ-01 — quem pode validar o planejamento clínico (SPEC-1-003).
// users: + avaliador_habilitado (bool) — SÓ gestão alterna (updateRule trava o próprio).
// planos_tratamento: plano operacional por paciente (rascunho/aprovado/em_revisao/encerrado);
// decisão clínica só pelo dentista habilitado ATRIBUÍDO (avaliador). Escrita direta = null
// (só o hook grava — o avaliador decide por rota, nunca por CRUD).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('avaliador_habilitado')) {
      users.fields.add(new BoolField({ name: 'avaliador_habilitado' }))
    }
    // o próprio usuário NÃO pode se auto-habilitar (só gestão altera a flag)
    users.updateRule =
      "(id = @request.auth.id && @request.body.papel:changed = false && @request.body.ativo:changed = false && @request.body.profissional:changed = false && @request.body.avaliador_habilitado:changed = false) || @request.auth.papel = 'gestao'"
    app.save(users)

    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"
    const leituraPlano =
      "(@request.auth.papel = 'gestao' && @request.auth.ativo = true) || (@request.auth.avaliador_habilitado = true && @request.auth.ativo = true && avaliador = @request.auth.id)"
    app.save(
      new Collection({
        name: 'planos_tratamento',
        type: 'base',
        listRule: leituraPlano,
        viewRule: leituraPlano,
        createRule: null,
        updateRule: null,
        deleteRule: gestao,
        fields: [
          {
            name: 'paciente',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('pacientes').id,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'avaliador',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('users').id,
            maxSelect: 1,
          },
          { name: 'versao', type: 'number', onlyInt: true },
          {
            name: 'estado',
            type: 'select',
            values: ['rascunho', 'aprovado', 'em_revisao', 'encerrado'],
            maxSelect: 1,
          },
          { name: 'criado_por', type: 'text' },
          { name: 'criado_em', type: 'date' },
          { name: 'aprovado_por', type: 'text' },
          { name: 'aprovado_em', type: 'date' },
          { name: 'motivo', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_planos_paciente ON planos_tratamento (paciente)'],
      }),
    )
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('planos_tratamento'))
    const users = app.findCollectionByNameOrId('users')
    const f = users.fields.getByName('avaliador_habilitado')
    if (f) users.fields.removeByName('avaliador_habilitado')
    users.updateRule =
      "(id = @request.auth.id && @request.body.papel:changed = false && @request.body.ativo:changed = false && @request.body.profissional:changed = false) || @request.auth.papel = 'gestao'"
    app.save(users)
  },
)
