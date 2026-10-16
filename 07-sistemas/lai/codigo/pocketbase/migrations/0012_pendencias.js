// Task 55a359b0 — pendências de tratamento + período (SPEC-1-003, CA-1-14/15)
// Pendências = procedimentos aprovados e não executados (arquivo autorizado ou
// cadastro manual — zero API externa). Prontidão default "aguardando_condicao":
// sem plano aprovado, tratamento fica em "para revisão" (emenda CA-SEQ-03).
migrate(
  (app) => {
    const leitura =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true"
    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"
    app.save(
      new Collection({
        name: 'pendencias',
        type: 'base',
        listRule: leitura,
        viewRule: leitura,
        createRule: gestao,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          { name: 'paciente_nome', type: 'text', required: true },
          { name: 'telefone', type: 'text' },
          { name: 'procedimento', type: 'text', required: true },
          { name: 'profissional', type: 'text' },
          {
            name: 'situacao_execucao',
            type: 'select',
            values: ['a_agendar', 'executada', 'aguardando_condicao'],
            maxSelect: 1,
          },
          { name: 'motivo_condicao', type: 'text' },
          { name: 'agendamento_futuro_verificado', type: 'bool' },
          { name: 'disponibilidade_1', type: 'text' },
          { name: 'disponibilidade_2', type: 'text' },
          {
            name: 'prontidao',
            type: 'select',
            values: ['pronto', 'aguardando_condicao'],
            maxSelect: 1,
          },
          { name: 'motivo_revisao', type: 'text' },
          {
            name: 'origem',
            type: 'select',
            values: ['arquivo', 'manual', 'fixture'],
            maxSelect: 1,
          },
          { name: 'origem_arquivo', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )
    const cfg = app.findCollectionByNameOrId('config_unidade')
    if (!cfg.fields.getByName('pendencias_desde')) {
      cfg.fields.add(new DateField({ name: 'pendencias_desde' }))
      app.save(cfg)
    }
  },
  (app) => {
    const cfg = app.findCollectionByNameOrId('config_unidade')
    cfg.fields.removeByName('pendencias_desde')
    app.save(cfg)
    app.delete(app.findCollectionByNameOrId('pendencias'))
  },
)
