// Task 5b3fe9b6 — serviços dos horários dos dentistas e cadeiras (SPEC-1-001, CA-1-05).
// Cadastro manual e importação por CSV com validação linha a linha (mesmo padrão
// da agenda): nada é gravado sem prévia, e rejeição vem com motivo em PT-BR.
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface Horario {
  id: string
  profissional: string
  dia_semana: number
  inicio: string
  fim: string
}

export interface Cadeira {
  id: string
  nome: string
  tipo: string
}

export interface LinhaHorario {
  profissional: string
  dia_semana: string
  inicio: string
  fim: string
}

export interface PreviaHorarios {
  validas: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
  linhas: LinhaHorario[]
}

export const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

function horaValida(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

// Validação linha a linha: dia da semana por sigla, horas HH:MM, fim depois do início.
export function validarLinhasHorarios(linhas: LinhaHorario[]): PreviaHorarios {
  const validas: LinhaHorario[] = []
  const rejeitadas: Array<{ linha: number; motivos: string[] }> = []
  for (let i = 0; i < linhas.length; i++) {
    const r = linhas[i]
    const motivos: string[] = []
    if (!String(r.profissional || '').trim()) motivos.push('sem profissional')
    const dia = DIAS_SEMANA.indexOf(
      String(r.dia_semana || '')
        .trim()
        .toUpperCase(),
    )
    if (dia < 0) motivos.push('dia da semana inválido (use DOM, SEG, TER, QUA, QUI, SEX ou SAB)')
    if (!horaValida(r.inicio || '')) motivos.push('hora de início inválida (use HH:MM)')
    if (!horaValida(r.fim || '')) motivos.push('hora de fim inválida (use HH:MM)')
    if (horaValida(r.inicio || '') && horaValida(r.fim || '') && r.fim <= r.inicio) {
      motivos.push('fim deve ser depois do início')
    }
    if (motivos.length > 0) {
      rejeitadas.push({ linha: i + 1, motivos })
    } else {
      validas.push({ ...r, dia_semana: String(dia) })
    }
  }
  return { validas: validas.length, rejeitadas, linhas: validas }
}

function csvParaLinhasHorarios(texto: string): LinhaHorario[] {
  const linhas = texto
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.trim() !== '')
  if (linhas.length === 0) return []
  const separador =
    (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cabecalho = linhas[0].split(separador).map((h) => h.trim().toLowerCase())
  const indice = (nome: string) => cabecalho.indexOf(nome)
  const iProf = indice('profissional')
  const iDia = indice('dia_semana')
  const iIni = indice('inicio')
  const iFim = indice('fim')
  return linhas.slice(1).map((linha) => {
    const colunas = linha.split(separador).map((c) => c.trim())
    const valor = (i: number) => (i >= 0 && i < colunas.length ? colunas[i] : '')
    return {
      profissional: valor(iProf),
      dia_semana: valor(iDia),
      inicio: valor(iIni),
      fim: valor(iFim),
    }
  })
}

export async function importarArquivoHorarios(arquivo: File): Promise<PreviaHorarios> {
  if (arquivo.size > 2_000_000) {
    throw new Error('Arquivo muito grande (limite 2 MB).')
  }
  const texto = await arquivo.text()
  const linhas = csvParaLinhasHorarios(texto)
  if (linhas.length === 0) {
    throw new Error('O arquivo não tem linhas de dados (confira se é CSV com cabeçalho).')
  }
  return validarLinhasHorarios(linhas)
}

export interface ResultadoAplicacaoHorarios {
  gravados: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
}

// Aplica a prévia: um registro por bloco. Profissional é resolvido pelo nome
// (o CSV vem com nome, não com ID); linha sem profissional conhecido é rejeitada.
export async function aplicarHorarios(linhas: LinhaHorario[]): Promise<ResultadoAplicacaoHorarios> {
  const nomes = await pb.collection<{ id: string; nome: string }>('profissionais').getFullList()
  const porNome = new Map<string, string>()
  for (const p of nomes) porNome.set(p.nome.toLowerCase(), p.id)
  let gravados = 0
  const rejeitadas: Array<{ linha: number; motivos: string[] }> = []
  for (let i = 0; i < linhas.length; i++) {
    const r = linhas[i]
    const id = porNome.get(
      String(r.profissional || '')
        .trim()
        .toLowerCase(),
    )
    if (!id) {
      rejeitadas.push({
        linha: i + 1,
        motivos: ['profissional não encontrado: ' + r.profissional],
      })
      continue
    }
    try {
      await pb.collection('horarios_profissional').create({
        profissional: id,
        dia_semana: Number(r.dia_semana),
        inicio: r.inicio,
        fim: r.fim,
      })
      gravados++
    } catch (erro) {
      rejeitadas.push({ linha: i + 1, motivos: [getErrorMessage(erro) || 'erro ao gravar'] })
    }
  }
  return { gravados, rejeitadas }
}

export async function salvarHorario(
  profissionalId: string,
  dia_semana: number,
  inicio: string,
  fim: string,
): Promise<void> {
  if (!profissionalId) throw new Error('Escolha o profissional.')
  if (!horaValida(inicio) || !horaValida(fim)) {
    throw new Error('Preencha início e fim no formato HH:MM.')
  }
  if (fim <= inicio) {
    throw new Error('O fim deve ser depois do início.')
  }
  try {
    await pb
      .collection('horarios_profissional')
      .create({ profissional: profissionalId, dia_semana, inicio, fim })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar o horário.')
  }
}

export async function apagarHorario(id: string): Promise<void> {
  try {
    await pb.collection('horarios_profissional').delete(id)
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível apagar o horário.')
  }
}

export async function listarHorariosTodos(): Promise<Horario[]> {
  return pb.collection<Horario>('horarios_profissional').getFullList({
    sort: 'dia_semana,inicio',
  })
}

export async function salvarCadeira(nome: string, tipo: string): Promise<void> {
  if (!nome.trim()) throw new Error('Dê um nome para a cadeira.')
  try {
    await pb.collection('cadeiras').create({ nome: nome.trim(), origem: 'manual', tipo })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar a cadeira.')
  }
}

export async function apagarCadeira(id: string): Promise<void> {
  try {
    await pb.collection('cadeiras').delete(id)
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível apagar a cadeira.')
  }
}
