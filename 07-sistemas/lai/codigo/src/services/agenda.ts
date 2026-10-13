import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface ItemAgenda {
  id: string
  item_tipo: 'APPOINTMENT' | 'ASSIGN' | 'EVENT'
  clinicorp_id: string
  data: string
  inicio: string
  fim: string
  profissional: string
  cadeira: string
  paciente_nome: string
  paciente_telefone: string
  status: string
  cancelado: boolean
  excluido: boolean
  origem: 'fixture' | 'manual' | 'importacao'
  ausente_na_ultima_leitura: boolean
  alerta: string
  teste: boolean
}

export interface Profissional {
  id: string
  nome: string
  ativo: boolean
  tipo_agenda: string
}

export interface Cadeira {
  id: string
  nome: string
  tipo: string
}

export interface LinhaAgenda {
  item_tipo?: string
  clinicorp_id: string
  data: string
  inicio: string
  fim: string
  profissional: string
  cadeira?: string
  paciente_nome?: string
  paciente_telefone?: string
  status?: string
  cancelado?: boolean
  teste?: boolean
}

export interface PreviaLote {
  validas: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
  linhas: LinhaAgenda[]
}

export interface ResultadoLote {
  situacao: 'ok' | 'parcial'
  itens_lidos: number
  itens_gravados: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
  ja_aplicado: boolean
  lote_id: string
}

export interface Lote {
  id: string
  situacao: string
  itens_lidos: number
  itens_gravados: number
  contagem_rejeitada: number
  disparada_por: string
  periodo_coberto: string
  origem: string
  created: string
}

function csvParaLinhas(texto: string): LinhaAgenda[] {
  const linhas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (linhas.length === 0) return []
  const separador = (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cabecalho = linhas[0].split(separador).map((h) => h.trim().toLowerCase())
  const indice = (nome: string) => cabecalho.indexOf(nome)
  const iTipo = indice('item_tipo')
  const iId = indice('clinicorp_id')
  const iData = indice('data')
  const iInicio = indice('inicio')
  const iFim = indice('fim')
  const iProf = indice('profissional')
  const iCadeira = indice('cadeira')
  const iPaciente = indice('paciente_nome')
  const iTel = indice('paciente_telefone')
  const iStatus = indice('status')
  const iCancelado = indice('cancelado')

  return linhas.slice(1).map((linha) => {
    const colunas = linha.split(separador).map((c) => c.trim())
    const valor = (i: number) => (i >= 0 && i < colunas.length ? colunas[i] : '')
    return {
      item_tipo: valor(iTipo) || 'APPOINTMENT',
      clinicorp_id: valor(iId),
      data: valor(iData),
      inicio: valor(iInicio),
      fim: valor(iFim),
      profissional: valor(iProf),
      cadeira: valor(iCadeira),
      paciente_nome: valor(iPaciente),
      paciente_telefone: valor(iTel),
      status: valor(iStatus),
      cancelado: valor(iCancelado).toLowerCase() === 'true' || valor(iCancelado) === '1',
    }
  })
}

export async function validarLote(linhas: LinhaAgenda[]): Promise<PreviaLote> {
  try {
    return await pb.send('/backend/v1/dados/validar-lote', {
      method: 'POST',
      body: { linhas },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível validar o lote.')
  }
}

export async function aplicarLote(
  linhas: LinhaAgenda[],
  origem: string,
  hashArquivo: string,
  periodoCoberto: string,
): Promise<ResultadoLote> {
  try {
    return await pb.send('/backend/v1/dados/aplicar-lote', {
      method: 'POST',
      body: { linhas, origem, arquivo_hash: hashArquivo, periodo_coberto: periodoCoberto },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível aplicar o lote.')
  }
}

export async function importarArquivoAgenda(
  arquivo: File,
  origem: string,
): Promise<PreviaLote> {
  if (arquivo.size > 2_000_000) {
    throw new Error('Arquivo muito grande (limite 2 MB). Exporte um período menor.')
  }
  const texto = await arquivo.text()
  const linhas = csvParaLinhas(texto)
  if (linhas.length === 0) {
    throw new Error('O arquivo não tem linhas de dados (confira se é CSV com cabeçalho).')
  }
  return validarLote(linhas)
}

export async function listarAgendaDoDia(data: string): Promise<ItemAgenda[]> {
  return pb
    .collection<ItemAgenda>('agenda_itens')
    .getFullList({
      filter: pb.filter('data = {:data} && cancelado != true && excluido != true', { data }),
      sort: 'inicio',
    })
}

export async function listarProfissionais(): Promise<Profissional[]> {
  return pb.collection<Profissional>('profissionais').getFullList({ filter: 'ativo = true', sort: 'nome' })
}

export async function listarCadeiras(): Promise<Cadeira[]> {
  return pb.collection<Cadeira>('cadeiras').getFullList({ sort: 'nome' })
}

export async function listarLotes(): Promise<Lote[]> {
  return pb.collection<Lote>('sincronizacoes').getFullList({ sort: '-created' })
}

export async function listarHorarios(profissionalId: string): Promise<Array<{ dia_semana: number; inicio: string; fim: string }>> {
  return pb
    .collection<{ dia_semana: number; inicio: string; fim: string }>('horarios_profissional')
    .getFullList({ filter: pb.filter('profissional = {:id}', { id: profissionalId }), sort: 'dia_semana' })
}

export interface StatusClinicorp {
  id: string
  descricao: string
  tipo: string
}

export async function listarStatus(): Promise<StatusClinicorp[]> {
  return pb.collection<StatusClinicorp>('status_clinicorp').getFullList({ sort: 'descricao' })
}
