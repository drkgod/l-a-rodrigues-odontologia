import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  aplicarLote,
  importarArquivoAgenda,
  listarLotes,
  type Lote,
  type PreviaLote,
} from '@/services/agenda'
import { conciliarLiberacoes } from '@/services/confirmacao'
import { toast } from 'sonner'

async function hashTexto(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const Importar = () => {
  const [previa, setPrevia] = useState<PreviaLote | null>(null)
  const [hashArquivo, setHashArquivo] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<string>('')
  const [lotes, setLotes] = useState<Lote[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const carregarLotes = useCallback(async () => {
    try {
      setLotes(await listarLotes())
    } catch {
      // histórico é secundário; falha aparece quando salvar lote novo
    }
  }, [])

  const escolherArquivo = async (arquivo: File | undefined) => {
    setErro('')
    setResultado('')
    setPrevia(null)
    if (!arquivo) return
    setCarregando(true)
    try {
      const previaLote = await importarArquivoAgenda(arquivo, 'importacao')
      setPrevia(previaLote)
      setHashArquivo(await hashTexto(await arquivo.text()))
      const datas = new Set(previaLote.linhas.map((l) => l.data))
      const ordenadas = Array.from(datas).sort()
      setPeriodo(ordenadas.length > 0 ? `${ordenadas[0]} a ${ordenadas[ordenadas.length - 1]}` : '')
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível ler o arquivo.')
    } finally {
      setCarregando(false)
    }
  }

  const aplicar = async () => {
    if (!previa) return
    setAplicando(true)
    setErro('')
    try {
      const resultadoLote = await aplicarLote(previa.linhas, 'importacao', hashArquivo, periodo)
      setResultado(
        resultadoLote.ja_aplicado
          ? 'Este arquivo já foi importado antes — nada foi duplicado.'
          : `Lote aplicado: ${resultadoLote.itens_gravados} de ${resultadoLote.itens_lidos} itens gravados.`,
      )
      setPrevia(null)
      if (inputRef.current) inputRef.current.value = ''
      await carregarLotes()
      // Task f79847a5 — concilia liberações após cada importação validada (CA-1-22).
      if (!resultadoLote.ja_aplicado) {
        try {
          const r = await conciliarLiberacoes()
          if (r.liberadas > 0 || r.incertas > 0) {
            toast.success(
              'Liberações conciliadas: ' +
                r.liberadas +
                ' liberada(s)' +
                (r.incertas > 0 ? ', ' + r.incertas + ' incerta(s) — conferir no Clinicorp' : '') +
                '.',
            )
          }
        } catch {
          // conciliação é auxiliar: falha não invalida o lote; o painel permite conciliar depois
        }
      }
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível aplicar o lote.')
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar agenda</h1>
        <p className="text-sm text-muted-foreground">
          Arquivo exportado do Clinicorp (CSV). Nada é lido do Clinicorp direto — sem sincronização.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Escolher arquivo</CardTitle>
          <CardDescription>
            CSV com cabeçalho: clinicorp_id, data, inicio, fim, profissional, paciente_nome, status…
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void escolherArquivo(e.target.files?.[0])}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
          />
          {carregando && <p className="text-sm text-muted-foreground">Lendo arquivo…</p>}
          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
        </CardContent>
      </Card>

      {previa && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Prévia do lote</CardTitle>
            <CardDescription>
              {previa.validas} linha(s) válida(s) · {previa.rejeitadas.length} rejeitada(s)
              {periodo && ` · período ${periodo}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previa.rejeitadas.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Linhas rejeitadas (com motivo):</p>
                <ul className="text-sm space-y-1">
                  {previa.rejeitadas.slice(0, 10).map((r) => (
                    <li key={r.linha} className="text-muted-foreground">
                      Linha {r.linha}: {r.motivos.join('; ')}
                    </li>
                  ))}
                  {previa.rejeitadas.length > 10 && (
                    <li className="text-muted-foreground">
                      … e mais {previa.rejeitadas.length - 10} rejeitada(s).
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={aplicar} disabled={aplicando || previa.validas === 0}>
                {aplicando ? 'Aplicando…' : 'Aplicar lote'}
              </Button>
              <Button variant="outline" onClick={() => setPrevia(null)} disabled={aplicando}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <p role="status" className="text-sm font-medium">
          {resultado}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de lotes</CardTitle>
          <CardDescription>Todo importe fica registrado com autor e contagens.</CardDescription>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote importado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Lidos</TableHead>
                  <TableHead>Gravados</TableHead>
                  <TableHead className="hidden md:table-cell">Rejeitados</TableHead>
                  <TableHead className="hidden lg:table-cell">Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell className="text-xs">
                      {new Date(lote.created).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lote.situacao === 'ok' ? 'default' : 'secondary'}>
                        {lote.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell>{lote.itens_lidos}</TableCell>
                    <TableCell>{lote.itens_gravados}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {lote.contagem_rejeitada}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {lote.disparada_por || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Importar
