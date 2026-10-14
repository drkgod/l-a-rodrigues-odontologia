// Task 8d76cea5 — coleções de leads, campanhas e ficha (SPEC-1-003, CA-1-12/13)
// PARTE 1: coleções sem relação cruzada (leads↔pacientes referenciam uma à outra —
// a relação é adicionada na migration 0010, depois que ambas existem).
// Regras da matriz da SPEC-1-001: leitura para qualquer papel ativo EXCETO dentista;
// escrita de leads/fichas = gestão + 3 CRCs; campanhas/origens = gestão;
// eventos append-only (createRule null — só o hook grava; nem gestão edita/apaga).
migrate(
  (app) => {
    const leituraSemDentista =
      "@request.auth.id != '' && @request.auth.papel != '' && @request.auth.ativo = true && @request.auth.papel != 'dentista'"
    const escLeads =
      "@request.auth.papel != '' && @request.auth.ativo = true && (@request.auth.papel = 'gestao' || @request.auth.papel = 'crc_agendamento' || @request.auth.papel = 'crc_confirmacao' || @request.auth.papel = 'crc_comercial')"
    const gestao = "@request.auth.papel = 'gestao' && @request.auth.ativo = true"

    app.save(
      new Collection({
        name: 'campanhas',
        type: 'base',
        listRule: leituraSemDentista,
        viewRule: leituraSemDentista,
        createRule: gestao,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'criativo', type: 'text' },
          { name: 'ativa', type: 'bool' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_campanhas_codigo ON campanhas (codigo)'],
      }),
    )

    app.save(
      new Collection({
        name: 'origens_manuais',
        type: 'base',
        listRule: leituraSemDentista,
        viewRule: leituraSemDentista,
        createRule: gestao,
        updateRule: gestao,
        deleteRule: gestao,
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'ativa', type: 'bool' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    app.save(
      new Collection({
        name: 'leads',
        type: 'base',
        listRule: leituraSemDentista,
        viewRule: leituraSemDentista,
        createRule: escLeads,
        updateRule: escLeads,
        deleteRule: gestao,
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'telefone', type: 'text', required: true },
          {
            name: 'origem_tipo',
            type: 'select',
            values: ['campanha', 'manual', 'desconhecida'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'campanha',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('campanhas').id,
            maxSelect: 1,
          },
          {
            name: 'origem_manual',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('origens_manuais').id,
            maxSelect: 1,
          },
          { name: 'origem_texto_original', type: 'text' },
          { name: 'id_app_crc', type: 'text' },
          {
            name: 'etapa',
            type: 'select',
            values: [
              'novo',
              'em_atendimento',
              'aguardando_retorno',
              'agendado',
              'confirmado',
              'compareceu',
              'faltou',
              'desqualificado',
            ],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'motivo_desqualificacao',
            type: 'select',
            values: ['distancia', 'sus', 'convenio', 'outro'],
            maxSelect: 1,
          },
          { name: 'responsavel', type: 'text' },
          { name: 'entrada_em', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_leads_telefone ON leads (telefone)'],
      }),
    )

    app.save(
      new Collection({
        name: 'pacientes',
        type: 'base',
        listRule: leituraSemDentista,
        viewRule: leituraSemDentista,
        createRule: escLeads,
        updateRule: escLeads,
        deleteRule: gestao,
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'telefone', type: 'text' },
          { name: 'paciente_clinicorp_id', type: 'text' },
          { name: 'responsavel', type: 'text' },
          { name: 'proxima_acao', type: 'text' },
          { name: 'proxima_acao_prazo', type: 'date' },
          { name: 'proxima_acao_responsavel', type: 'text' },
          { name: 'teste', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )

    app.save(
      new Collection({
        name: 'eventos',
        type: 'base',
        listRule: leituraSemDentista,
        viewRule: leituraSemDentista,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'paciente', type: 'text' },
          { name: 'lead', type: 'text' },
          {
            name: 'tipo',
            type: 'select',
            values: [
              'contato',
              'resultado_contato',
              'mudanca_etapa',
              'nota',
              'combinado_avaliacao',
              'falta',
              'chegada',
              'liberacao',
              'oferta',
              'importacao',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'descricao', type: 'text', required: true },
          { name: 'autor', type: 'text' },
          { name: 'criado_em', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'teste', type: 'bool' },
        ],
      }),
    )

    // seeds das origens manuais (SPEC: começa com "indicação" e "outra — descrever")
    const col = app.findCollectionByNameOrId('origens_manuais')
    const seed = ['Indicação', 'Outra — descrever']
    for (const nome of seed) {
      const r = new Record(col)
      r.set('nome', nome)
      r.set('ativa', true)
      r.set('teste', false)
      app.save(r)
    }
  },
  (app) => {
    for (const nome of ['eventos', 'pacientes', 'leads', 'origens_manuais', 'campanhas']) {
      const col = app.findCollectionByNameOrId(nome)
      app.delete(col)
    }
  },
)