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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  gerarListaDia,
  dividirSaidas,
  exportarXlsx,
  criarMassaConfirmacao,
  limparMassaConfirmacaoDia,
  registrarResposta,
  moverNaoRespondentes,
  garantirTurnosPadrao,
  salvarTurno,
  type LinhaConfirmacao,
  type ResultadoListaDia,
  type ConfigTurno,
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

const turnoLabel = (turno: string) => (turno === 'manha' ? 'manhã' : 'tarde')

const Confirmacoes = () => {
  const { usuario } = useAuth()
  const [data, setData] = useState(hoje())
  const [resultado, setResultado] = useState<ResultadoListaDia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [exportando, setExportando] = useState(false)
  const [criandoMassa, setCriandoMassa] = useState(false)
  const [limpandoMassa, setLimpandoMassa] = useState(false)
  const [movendo, setMovendo] = useState(false)
  const [respondendoId, setRespondendoId] = useState('')
  const [turnos, setTurnos] = useState<ConfigTurno[]>([])

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

  const criarMassa = async () => {
    setCriandoMassa(true)
    setErro('')
    try {
      const r = await criarMassaConfirmacao(data)
      setResultado(r)
      toast.success('Massa de teste criada: 4 consultas no dia ' + data + '.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível criar a massa de teste.')
    } finally {
      setCriandoMassa(false)
    }
  }

  const limparMassa = async () => {
    setLimpandoMassa(true)
    setErro('')
    try {
      await limparMassaConfirmacaoDia(data)
      await carregar(data)
      toast.success('Massa de teste apagada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível limpar a massa de teste.')
    } finally {
      setLimpandoMassa(false)
    }
  }

  const mover = async () => {
    setMovendo(true)
    setErro('')
    try {
      const r = await moverNaoRespondentes(data)
      if (r.alerta_gestao) toast.warning(r.alerta_gestao)
      await carregar(data)
      await carregarTurnos()
      toast.success('Não respondentes movidos para a lista de ligação (' + r.movidos + ').')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível mover os não respondentes.')
    } finally {
      setMovendo(false)
    }
  }

  // Resposta do contato (CA-1-19) — a consulta continua agendada; muda só o estado.
  const responder = async (
    contatoId: string,
    resposta: 'confirmou' | 'pediu_remarcacao' | 'cancelou' | 'sem_resposta',
  ) => {
    setRespondendoId(contatoId)
    setErro('')
    try {
      await registrarResposta(contatoId, resposta)
      await carregar(data)
      toast.success('Resposta registrada: ' + rotuloEstado[resposta] + '.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar a resposta.')
    } finally {
      setRespondendoId('')
    }
  }

  const carregarTurnos = useCallback(async () => {
    try {
      // Cria os 2 registros padrão na 1ª vez (gestão) — sem isso o hook vira "a definir".
      const turnos = await garantirTurnosPadrao(usuario?.email || 'gestão')
      setTurnos(turnos)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível carregar a cobertura.')
    }
  }, [usuario?.email])

  const salvarTurnoRow = async (turnoId: string, responsavel: string) => {
    try {
      await salvarTurno(turnoId, responsavel, usuario?.email || 'gestão')
      await carregarTurnos()
      toast.success('Responsável da ' + turnoLabel(responsavel) + ' salvo.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o responsável.')
    }
  }

  useEffect(() => {
    void carregarTurnos()
  }, [carregarTurnos])

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
      <TableCell>
        {l.estado === 'mensagem_enviada' || l.estado === 'pendente' ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void responder(l.contato_id, 'confirmou')}
              disabled={respondendoId === l.contato_id}
            >
              Confirmou
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void responder(l.contato_id, 'sem_resposta')}
              disabled={respondendoId === l.contato_id}
            >
              Sem resposta
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={respondendoId === l.contato_id}>
                  Cancelou
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Registrar cancelamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A resposta "cancelou" será registrada. A consulta continua agendada — o
                    cancelamento da vaga exige confirmação no Clinicorp (fase 4).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void responder(l.contato_id, 'cancelou')}>
                    Confirmar cancelamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={respondendoId === l.contato_id}>
                  Remarcar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Registrar pedido de remarcação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A resposta "pediu_remarcação" será registrada. A consulta continua agendada — a
                    remarcação é tratada pela CRC.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void responder(l.contato_id, 'pediu_remarcacao')}
                  >
                    Confirmar remarcação
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {rotuloEstado[l.estado] || l.estado}
          </span>
        )}
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
          <Button
            variant="outline"
            onClick={() => void criarMassa()}
            disabled={criandoMassa || carregando}
          >
            {criandoMassa ? 'Criando…' : 'Criar massa de teste'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => void limparMassa()}
            disabled={limpandoMassa || carregando}
          >
            {limpandoMassa ? 'Apagando…' : 'Limpar massa de teste'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void mover()}
            disabled={movendo || carregando}
            title="Move os contatos 'Mensagem enviada' do dia-alvo para a lista de ligação, com o responsável do turno."
          >
            {movendo ? 'Movendo…' : 'Mover não respondentes'}
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
                <div className="text-sm text-muted-foreground">
                  <p>
                    Nenhuma consulta no dia-alvo. Use “Criar massa de teste” para experimentar o
                    fluxo completo, ou importe a agenda real.
                  </p>
                  <p className="mt-1">
                    A planilha só fica disponível quando a lista tem consultas com telefone válido.
                  </p>
                </div>
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
                    title={
                      saidas.xlsx.length === 0
                        ? 'A lista não tem consultas com telefone válido — crie a massa de teste ou importe a agenda.'
                        : undefined
                    }
                  >
                    {exportando ? 'Gerando arquivo…' : 'Exportar XLSX'}
                  </Button>
                  {saidas.xlsx.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nada a exportar — sem telefone válido dentro do limite. Use “Criar massa de
                      teste” para experimentar o download.
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

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lista de ligação</CardTitle>
                <CardDescription>
                  Quem não respondeu vai para cá, com o responsável do turno (manhã &lt; 12h, tarde
                  ≥ 12h).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resultado.lista.filter((l) => l.estado === 'em_lista_ligacao').length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ninguém em lista de ligação. Use “Mover não respondentes” depois das mensagens.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {resultado.lista
                      .filter((l) => l.estado === 'em_lista_ligacao')
                      .map((l) => (
                        <li key={l.contato_id}>
                          <span className="font-medium">{l.paciente}</span> · {l.hora} ·{' '}
                          <Badge variant="secondary">{l.turno ? turnoLabel(l.turno) : '—'}</Badge>{' '}
                          <span className="text-muted-foreground">
                            {l.responsavel || 'a definir'}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cobertura de ligação</CardTitle>
                <CardDescription>
                  Responsável por ligar em cada turno — só a gestão edita; sem cadastro, o sistema
                  marca “a definir” e alerta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {turnos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Carregando cobertura…</p>
                ) : (
                  turnos.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Label htmlFor={'resp-' + t.id} className="w-24">
                        {turnoLabel(t.turno)}
                      </Label>
                      <Input
                        id={'resp-' + t.id}
                        defaultValue={t.responsavel}
                        placeholder="Quem liga?"
                        className="flex-1"
                        onBlur={(e) => {
                          if (e.target.value !== t.responsavel) {
                            void salvarTurnoRow(t.id, e.target.value)
                          }
                        }}
                      />
                    </div>
                  ))
                )}
                {turnos.length > 0 && turnos.some((t) => !t.responsavel) && (
                  <p className="text-xs text-muted-foreground">
                    Turno sem responsável aparece como “a definir” na lista de ligação.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default Confirmacoes
