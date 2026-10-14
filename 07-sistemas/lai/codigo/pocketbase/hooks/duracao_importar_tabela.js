// Task 1f4de19d — importa tabela de duração (cria versão RASCUNHO; gestão aprova depois)
routerAdd(
  'POST',
  '/backend/v1/duracao/importar-tabela',
  (e) => {
    const body = e.requestInfo().body || {}
    const regras = body.regras
    if (!Array.isArray(regras) || regras.length === 0) {
      throw new BadRequestError('Envie "regras" como array não vazio.', null)
    }
    const hashArquivo = String(body.arquivo_hash || '')
    const nomeArquivo = String(body.nome_arquivo || '')

    // Reimport idêntico não duplica: mesmo hash já importado devolve a versão anterior.
    if (hashArquivo) {
      const anteriores = $app.findRecordsByFilter(
        'tabela_duracao',
        'arquivo_hash = "' + hashArquivo + '"',
        '-created',
        1,
        0,
      )
      if (anteriores.length > 0) {
        return e.json(200, {
          ja_aplicado: true,
          tabela_id: anteriores[0].id,
          versao: anteriores[0].getString('versao'),
          regras_gravadas: 0,
          rejeitadas: 0,
        })
      }
    }

    const VARS_VALIDAS = [
      'qtd_implantes',
      'qtd_exodontias',
      'qtd_elementos',
      'qtd_restauracoes',
      'dente_anterior',
      'qtd_lentes',
      'protocolo_duplo',
      'qtd_sisos_consulta',
      'sempre',
    ]

    const validas = []
    const rejeitadas = []
    for (let i = 0; i < regras.length; i++) {
      const r = regras[i] || {}
      const motivo = []
      const grupo = String(r.grupo_regra || '').trim()
      if (!grupo) motivo.push('sem grupo_regra')
      const v1 = String(r.variavel_1 || '').trim()
      if (!v1) motivo.push('sem variavel_1')
      else if (VARS_VALIDAS.indexOf(v1) < 0) motivo.push('variável desconhecida: ' + v1)
      const min1 = r.min_1
      if (min1 === '' || min1 === null || min1 === undefined) motivo.push('min_1 vazio')
      else if (Number(min1) < 0) motivo.push('min_1 negativo')
      const max1 = r.max_1
      if (max1 !== '' && max1 !== null && max1 !== undefined && Number(max1) < Number(min1)) {
        motivo.push('faixa_1 invertida (min > max)')
      }
      const v2 = String(r.variavel_2 || '').trim()
      if (v2 && VARS_VALIDAS.indexOf(v2) < 0) motivo.push('variável_2 desconhecida: ' + v2)
      const profissional = String(r.profissional || '').trim()
      // regra por dentista SEM duração não existe: ou tem tempo, ou não é regra
      if (
        profissional &&
        (r.duracao_min === '' || r.duracao_min === null || r.duracao_min === undefined)
      ) {
        motivo.push('regra por profissional exige duração')
      }
      const min2 = r.min_2
      const max2 = r.max_2
      if (v2 && (min2 === '' || min2 === null || min2 === undefined)) motivo.push('min_2 vazio')
      if (v2 && max2 !== '' && max2 !== null && max2 !== undefined && Number(max2) < Number(min2)) {
        motivo.push('faixa_2 invertida (min > max)')
      }
      const dur = r.duracao_min
      // vazio = regra sem duração (vira "sem regra" no cálculo — nunca inventar)
      if (dur !== '' && dur !== null && dur !== undefined) {
        if (!Number.isFinite(Number(dur)) || Number(dur) <= 0) {
          motivo.push('duração deve ser um número positivo ou vazia')
        }
      }
      for (const [nome, valor] of [
        ['min_1', min1],
        ['max_1', max1],
        ['min_2', min2],
        ['max_2', max2],
      ]) {
        if (
          valor !== '' &&
          valor !== null &&
          valor !== undefined &&
          !Number.isFinite(Number(valor))
        ) {
          motivo.push(nome + ' deve ser número ou vazio')
        }
      }

      if (motivo.length > 0) {
        rejeitadas.push({ linha: i + 1, motivos: motivo })
      } else {
        validas.push({
          grupo_regra: grupo,
          aplica_a: String(r.aplica_a || ''),
          variavel_1: v1,
          min_1: Number(min1),
          max_1: max1 === '' || max1 === null || max1 === undefined ? 0 : Number(max1),
          variavel_2: v2,
          min_2: min2 === '' || min2 === null || min2 === undefined ? 0 : Number(min2),
          max_2: max2 === '' || max2 === null || max2 === undefined ? 0 : Number(max2),
          duracao_min: dur === '' || dur === null || dur === undefined ? 0 : Number(dur),
          procedimentos: String(r.procedimentos || ''),
          observacao: String(r.observacao || ''),
          profissional: profissional,
        })
      }
    }

    if (validas.length === 0) {
      throw new BadRequestError(
        'Nenhuma regra válida no arquivo (' + rejeitadas.length + ' rejeitada(s)).',
        null,
      )
    }

    // Versão nova (rascunho): numeração sequencial por contagem de versões
    const totalAnteriores = $app.countRecords('tabela_duracao')
    const versao = 'v' + (totalAnteriores + 1)
    const agora = new Date().toISOString()

    const colTabela = $app.findCollectionByNameOrId('tabela_duracao')
    const tabela = new Record(colTabela)
    tabela.set('versao', versao)
    tabela.set('arquivo_hash', hashArquivo)
    tabela.set('nome_arquivo', nomeArquivo)
    tabela.set('importada_por', e.auth ? String(e.auth.getString('email') || '') : '')
    tabela.set('ativa', false)
    // prova: tabela de teste (teste=true) nunca é aprovada — a real segue ativa
    tabela.set('teste', body.teste === true)
    $app.save(tabela)

    const colRegras = $app.findCollectionByNameOrId('regras_duracao')
    let gravadas = 0
    for (let i = 0; i < validas.length; i++) {
      const r = validas[i]
      const registro = new Record(colRegras)
      registro.set('tabela', tabela.id)
      registro.set('grupo_regra', r.grupo_regra)
      registro.set('aplica_a', r.aplica_a)
      registro.set('variavel_1', r.variavel_1)
      registro.set('min_1', r.min_1)
      registro.set('max_1', r.max_1)
      registro.set('variavel_2', r.variavel_2)
      registro.set('min_2', r.min_2)
      registro.set('max_2', r.max_2)
      registro.set('duracao_min', r.duracao_min)
      registro.set('procedimentos', r.procedimentos)
      registro.set('observacao', r.observacao)
      registro.set('profissional', r.profissional)
      registro.set('origem', 'importacao')
      registro.set('teste', body.teste === true)
      $app.save(registro)
      gravadas++
    }

    return e.json(200, {
      ja_aplicado: false,
      tabela_id: tabela.id,
      versao: versao,
      regras_gravadas: gravadas,
      rejeitadas: rejeitadas,
    })
  },
  $apis.requireAuth(),
)
