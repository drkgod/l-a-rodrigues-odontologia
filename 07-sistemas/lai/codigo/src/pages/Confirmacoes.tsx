import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  gerarListaDia,
  dividirSaidas,
  exportarXlsx,
  type LinhaConfirmacao,
  type ResultadoListaDia,
} from '@/services/confirmacao'

// Padrão da data local (input date) — data civil do dia-alvo
const hoje = () => {
  const d = new Date()
  const amanha = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  return amanha.toISOString().slice(0, 10)
}

const rotuloEstado: Record<string, string> = {
  pendente: 'Pendente',
  mensagem_enviada: 'Mensagem enviada',
  confirmou: 'Confirmou',
  pediu_remarcacao: 'Pediu remarcação',
  cancelou: 'Cancelou',
  sem_resposta: 'Sem resposta',
  em_lista_ligacao: 'Em lista de ligação',
  ligacao_sucesso: 'Ligação — sucesso',
  ligacao_sem_sucesso: 'Ligação — sem sucesso',
}

const Confirmacoes = () => {
  const { usuario } = useAuth()
  const [data, setData] = useState(hoje())
  const [resultado, setResultado] = useState<ResultadoListaDia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [exportando, setExportando] = useState(false)

  const carregar = useCallback(async (dataAlvo: string) => {
    setCarregando(true)
    setErro('')
    try {
      const r = await gerarListaDia(dataAlvo)
      setResultado(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gerar a lista.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saidas = resultado ? dividirSaidas(resultado.lista, resultado.limite_linhas_robo) : null

  const exportar = async () => {
    if (!saidas || saidas.xlsx.length === 0) return
    setExportando(true)
    try {
      const r = await exportarXlsx(saidas.xlsx, usuario?.email || 'gestão')
      toast.success('Planilha gerada: ' + r.nomeArquivo + ' (' + r.totalLinhas + ' linha(s)).')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar o arquivo.')
    } finally {
      setExportando(false)
    }
  }

  const linha = (l: LinhaConfirmacao) => (
    <TableRow key={l.contato_id}>
      <TableCell className="font-medium">
        {l.paciente}
        <span className="block text-xs text-muted-foreground">{l.hora}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell">{l.dentista}</TableCell>
      <TableCell>
        {l.telefone || <span className="text-destructive">telefone ausente</span>}
      </TableCell>
      <TableCell>
        <Badge variant={l.estado === 'confirmou' ? 'default' : 'secondary'}>
          {rotuloEstado[l.estado] || l.estado}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell max-w-xs">
        <span className="text-xs text-muted-foreground line-clamp-2">{l.mensagem}</span>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Confirmações</h1>
          <p className="text-sm text-muted-foreground">
            Lista de confirmação do dia-alvo no formato do robô. A central não envia mensagens nesta
            fase — exporte e use o robô.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="data-alvo">Dia-alvo</Label>
            <Input
              id="data-alvo"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={() => void carregar(data)} disabled={carregando}>
            {carregando ? 'Gerando…' : 'Gerar lista'}
          </Button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {!resultado && !carregando && !erro && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Escolha o dia-alvo e clique em “Gerar lista”.
          </CardContent>
        </Card>
      )}

      {resultado && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Lista do dia {resultado.data} ({resultado.total} consulta(s))
              </CardTitle>
              <CardDescription>
                Em ordem de horário · {resultado.contatos_criados} novo(s) contato(s) de confirmação
                criado(s) · limite do robô: {resultado.limite_linhas_robo} linha(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultado.total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma consulta no dia-alvo. Gere a lista de outro dia ou importe a agenda.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="hidden md:table-cell">Dentista</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{resultado.lista.map(linha)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {saidas && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Planilha do robô ({saidas.xlsx.length})
                  </CardTitle>
                  <CardDescription>
                    Até o limite de {resultado.limite_linhas_robo} linha(s). Exportar não conta como
                    envio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => void exportar()}
                    disabled={exportando || saidas.xlsx.length === 0}
                  >
                    {exportando ? 'Gerando arquivo…' : 'Exportar XLSX'}
                  </Button>
                  {saidas.xlsx.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nada a exportar — sem telefone válido dentro do limite.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Envio manual ({saidas.envioManual.length})
                  </CardTitle>
                  <CardDescription>
                    Excedente do limite do robô — enviar fora do robô.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {saidas.envioManual.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nada excedente.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {saidas.envioManual.map((l) => (
                        <li key={l.contato_id}>
                          {l.paciente} · {l.hora}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Corrigir telefone ({saidas.corrigirTelefone.length})
                  </CardTitle>
                  <CardDescription>
                    Telefone ausente ou inválido — corrigir na agenda antes de enviar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {saidas.corrigirTelefone.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum telefone a corrigir.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {saidas.corrigirTelefone.map((l) => (
                        <li key={l.contato_id}>
                          {l.paciente} · {l.hora}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Confirmacoes
