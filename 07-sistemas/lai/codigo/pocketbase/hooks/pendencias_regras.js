// Task 55a359b0 — regras das pendências (SPEC-1-003, CA-1-14/15)
// Rotas server-side: importar CSV (linha a linha, rejeita com motivo),
// mudar estado (executada/aguardando_condicao) e verificar agendamento futuro.
// Toda lógica INLINE no callback (lição JSVM).
routerAdd(
  'POST',
  '/backend/v1/pendencias/importar',
  (e) => {
    const body = e.requestInfo().body || {}
    const csv = String(body.csv || '')
    const nomeArquivo = String(body.nome_arquivo || 'arquivo').slice(0, 200)
    const teste = body.teste === true
    if (!csv.trim()) throw new BadRequestError('Envie o conteúdo do arquivo.', null)

    const col = $app.findCollectionByNameOrId('pendencias')
    const linhas = csv.split(/\r?\n/)
    let lidas = 0
    let gravadas = 0
    let duplicadas = 0
    const rejeitadas = []
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim()
      if (!linha) continue
      lidas++
      const campos = linha.split(';').map(function (c) {
        return c.trim()
      })
      const paciente = campos[0] || ''
      const telefone = (campos[1] || '').replace(/\D/g, '')
      const procedimento = campos[2] || ''
      const profissional = campos[3] || ''
      const situacao = (campos[4] || 'a_agendar').toLowerCase()
      const motivos = []
      if (!paciente) motivos.push('linha sem paciente')
      if (!procedimento) motivos.push('linha sem procedimento')
      const situacoesValidas = ['a_agendar', 'executada', 'aguardando_condicao']
      if (situacoesValidas.indexOf(situacao) < 0) motivos.push('situação inválida: ' + situacao)
      if (motivos.length > 0) {
        rejeitadas.push({ linha: i + 1, motivos: motivos })
        continue
      }
      // dedup: mesmo paciente + procedimento + profissional já importado do MESMO arquivo
      const filtro =
        'paciente_nome = "' +
        paciente.replace(/"/g, '') +
        '" && procedimento = "' +
        procedimento.replace(/"/g, '') +
        '" && profissional = "' +
        profissional.replace(/"/g, '') +
        '" && origem_arquivo = "' +
        nomeArquivo.replace(/"/g, '') +
        '"'
      const dup = $app.findRecordsByFilter('pendencias', filtro, '', 1, 0)
      if (dup.length > 0) {
        duplicadas++
        continue
      }
      const registro = new Record(col)
      registro.set('paciente_nome', paciente)
      registro.set('telefone', telefone)
      registro.set('procedimento', procedimento)
      registro.set('profissional', profissional)
      registro.set('situacao_execucao', situacao)
      registro.set('agendamento_futuro_verificado', false)
      registro.set('prontidao', 'aguardando_condicao')
      registro.set('motivo_revisao', '')
      registro.set('origem', 'arquivo')
      registro.set('origem_arquivo', nomeArquivo)
      registro.set('teste', teste)
      $app.save(registro)
      gravadas++
    }
    return e.json(200, {
      lidas: lidas,
      gravadas: gravadas,
      duplicadas: duplicadas,
      rejeitadas: rejeitadas,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pendencias/estado',
  (e) => {
    const body = e.requestInfo().body || {}
    const id = String(body.id || '')
    const situacao = String(body.situacao || '').trim()
    const motivo = String(body.motivo || '').trim()
    if (!id) throw new BadRequestError('Envie a pendência.', null)
    const validas = ['a_agendar', 'executada', 'aguardando_condicao']
    if (validas.indexOf(situacao) < 0) throw new BadRequestError('Situação inválida.', null)
    if (situacao === 'aguardando_condicao' && !motivo) {
      throw new BadRequestError('Aguardando condição exige o motivo.', null)
    }
    const registro = $app.findRecordById('pendencias', id)
    registro.set('situacao_execucao', situacao)
    registro.set('motivo_condicao', situacao === 'aguardando_condicao' ? motivo : '')
    if (situacao === 'aguardando_condicao') {
      registro.set('prontidao', 'aguardando_condicao')
      registro.set('motivo_revisao', motivo)
    }
    $app.save(registro)
    return e.json(200, { ok: true, situacao: situacao })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pendencias/verificar-agendamento',
  (e) => {
    const body = e.requestInfo().body || {}
    const id = String(body.id || '')
    if (!id) throw new BadRequestError('Envie a pendência.', null)
    const registro = $app.findRecordById('pendencias', id)
    const hoje = new Date().toISOString().slice(0, 10)
    const nome = String(registro.getString('paciente_nome') || '').trim()
    const prof = String(registro.getString('profissional') || '').trim()
    // cruza com a agenda: mesmo paciente (nome) com item futuro não cancelado;
    // quando a pendência indica profissional, exige o mesmo profissional
    let filtro =
      'paciente_nome = "' +
      nome.replace(/"/g, '') +
      '" && data > "' +
      hoje +
      '" && cancelado != true'
    if (prof) {
      // BUG FIX (teste humano P3-05, 16/10): pendencias.profissional é TEXTO (nome)
      // e agenda_itens.profissional é RELAÇÃO (id) — comparar nome com id nunca casa.
      // Resolve o nome para ids; nome que não casa com ninguém NÃO esconde horário
      // futuro: verifica só pelo paciente (grafia do CSV não pode esconder agenda).
      const pros = $app.findRecordsByFilter(
        'profissionais',
        'nome = "' + prof.replace(/"/g, '') + '"',
        '',
        20,
        0,
      )
      if (pros.length > 0) {
        const partes = []
        for (let i = 0; i < pros.length; i++) {
          partes.push('profissional = "' + pros[i].id + '"')
        }
        filtro = filtro + ' && (' + partes.join(' || ') + ')'
      }
    }
    const itens = $app.findRecordsByFilter('agenda_itens', filtro, 'data', 1, 0)
    const temFuturo = itens.length > 0
    registro.set('agendamento_futuro_verificado', temFuturo)
    $app.save(registro)
    return e.json(200, { ok: true, agendamento_futuro: temFuturo })
  },
  $apis.requireAuth(),
)