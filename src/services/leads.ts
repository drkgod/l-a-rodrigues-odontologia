// Task 8d76cea5 — serviços de leads/campanhas (SPEC-1-003, CA-1-12/13).
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface Campanha {
  id: string
  codigo: string
  nome: string
  criativo: string
  ativa: boolean
  teste: boolean
}

export interface OrigemManual {
  id: string
  nome: string
  ativa: boolean
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  origem_tipo: 'campanha' | 'manual' | 'desconhecida'
  campanha: string
  origem_manual: string
  origem_texto_original: string
  etapa: string
  motivo_desqualificacao: string
  responsavel: string
  entrada_em: string
  teste: boolean
  created: string
}

export interface ResultadoCriacao {
  criado: boolean
  lead_id?: string
  origem_tipo?: string
  aviso?: string
  aviso_duplicado?: boolean
  onde?: string
  mensagem?: string
}

export interface ResultadoEtapa {
  ok: boolean
  etapa: string
  anterior: string
}

export interface ResultadoImportacao {
  lidas: number
  gravados: number
  duplicados: number
  rejeitadas: Array<{ linha: number; motivos: string[] }>
}

export async function criarLead(
  nome: string,
  telefone: string,
  codigoCampanha: string,
  origemManual: string,
  confirmarDuplicado = false,
): Promise<ResultadoCriacao> {
  try {
    return await pb.send('/backend/v1/leads/criar', {
      method: 'POST',
      body: {
        nome,
        telefone,
        codigo_campanha: codigoCampanha,
        origem_manual: origemManual,
        confirmar_duplicado: confirmarDuplicado,
      },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível criar o lead.')
  }
}

export async function mudarEtapa(
  leadId: string,
  etapa: string,
  motivoDesqualificacao = '',
): Promise<ResultadoEtapa> {
  try {
    return await pb.send('/backend/v1/leads/etapa', {
      method: 'POST',
      body: { lead: leadId, etapa, motivo_desqualificacao: motivoDesqualificacao },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível mudar a etapa.')
  }
}

export async function importarLeadsAppCrc(
  linhas: Array<{ id_app_crc: string; nome: string; telefone: string; origem: string }>,
): Promise<ResultadoImportacao> {
  try {
    return await pb.send('/backend/v1/leads/importar-app-crc', {
      method: 'POST',
      body: { linhas },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível importar os leads.')
  }
}

export async function listarLeads(): Promise<Lead[]> {
  return pb.collection<Lead>('leads').getFullList({ sort: '-created' })
}

export async function listarCampanhas(): Promise<Campanha[]> {
  return pb.collection<Campanha>('campanhas').getFullList({ sort: '-created' })
}

export async function listarOrigensManuais(): Promise<OrigemManual[]> {
  return pb.collection<OrigemManual>('origens_manuais').getFullList({ sort: 'nome' })
}

export async function salvarCampanha(
  codigo: string,
  nome: string,
  criativo: string,
): Promise<void> {
  if (!codigo.trim()) throw new Error('Informe o código da campanha (combinado com a agência).')
  if (!nome.trim()) throw new Error('Dê um nome para a campanha.')
  try {
    await pb.collection('campanhas').create({
      codigo: codigo.trim(),
      nome: nome.trim(),
      criativo: criativo.trim(),
      ativa: true,
    })
  } catch (erro) {
    const msg = getErrorMessage(erro)
    if (/unique|constraint/i.test(msg)) {
      throw new Error('Já existe uma campanha com este código.')
    }
    throw new Error(msg || 'Não foi possível salvar a campanha.')
  }
}

export async function salvarOrigemManual(nome: string): Promise<void> {
  if (!nome.trim()) throw new Error('Dê um nome para a origem manual.')
  try {
    await pb.collection('origens_manuais').create({ nome: nome.trim(), ativa: true })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível salvar a origem manual.')
  }
}

// Parser do export do APP CRC: colunas esperadas Id Lead/Paciente, Nome, Telefone,
// Status do lead, Origem, Telefone de entrada (aceita ; ou ,).
// Task eec75533 — lê XLSX do APP CRC (aba "Dados", colunas Nome/Telefone/Origem/
// Fase/Data registro/Etiquetas) e devolve as linhas no formato do importador.
export async function xlsxParaLinhasAppCrc(arquivo: File): Promise<
  Array<{ id_app_crc: string; nome: string; telefone: string; origem: string; fase: string; entrada_em: string }>
> {
  const XLSX = await import('xlsx')
  const buf = await arquivo.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  return rows
    .map((r) => {
      const pega = (...nomes: string[]) => {
        for (const n of nomes) {
          const chave = Object.keys(r).find((k) => k.trim().toLowerCase() === n)
          if (chave && r[chave] != null) return String(r[chave]).trim()
        }
        return ''
      }
      return {
        id_app_crc: pega('Etiquetas'),
        nome: pega('Nome'),
        telefone: pega('Telefone'),
        origem: pega('Origem'),
        fase: pega('Fase'),
        entrada_em: pega('Data registro'),
      }
    })
    .filter((l) => l.nome || l.telefone)
}

export function csvParaLinhasAppCrc(texto: string): Array<{
  id_app_crc: string
  nome: string
  telefone: string
  origem: string
}> {
  const linhas = texto
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.trim() !== '')
  if (linhas.length === 0) return []
  const separador =
    (linhas[0].match(/;/g)?.length ?? 0) > (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cabecalho = linhas[0].split(separador).map((h) => h.trim().toLowerCase())
  const indice = (nome: string) => cabecalho.indexOf(nome)
  const iId = indice('id lead/paciente')
  const iNome = indice('nome')
  const iTel = indice('telefone')
  const iOrigem = indice('origem')
  return linhas.slice(1).map((linha) => {
    const colunas = linha.split(separador).map((c) => c.trim())
    const valor = (i: number) => (i >= 0 && i < colunas.length ? colunas[i] : '')
    return {
      id_app_crc: valor(iId),
      nome: valor(iNome),
      telefone: valor(iTel),
      origem: valor(iOrigem),
    }
  })
}
// ===== Task d03a15ee — CA-1-17: chegada (compareceu/faltou) + relatório de origem =====
export async function registrarChegada(
  leadId: string,
  resultado: 'compareceu' | 'faltou',
): Promise<{ ok: boolean; etapa: string; anterior: string }> {
  try {
    return await pb.send('/backend/v1/leads/registrar-chegada', {
      method: 'POST',
      body: { lead: leadId, resultado },
    })
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível registrar a chegada.')
  }
}

export interface LinhaRelatorioOrigem {
  origem: string
  leads: number
  agendados: number
  confirmados: number
  compareceram: number
  faltaram: number
}

export interface RelatorioOrigem {
  de: string
  ate: string
  linhas: LinhaRelatorioOrigem[]
  totais: {
    leads: number
    agendados: number
    confirmados: number
    compareceram: number
    faltaram: number
  }
}

export async function relatorioOrigem(de: string, ate: string): Promise<RelatorioOrigem> {
  try {
    return await pb.send(
      '/backend/v1/leads/relatorio-origem?de=' +
        encodeURIComponent(de) +
        '&ate=' +
        encodeURIComponent(ate),
    )
  } catch (erro) {
    throw new Error(getErrorMessage(erro) || 'Não foi possível gerar o relatório.')
  }
}
