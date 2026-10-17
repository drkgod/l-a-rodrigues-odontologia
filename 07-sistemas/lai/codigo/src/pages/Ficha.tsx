// Task 35bff70c — tela Ficha do paciente (SPEC-1-003, CA-1-16): histórico em ordem,
// responsável/próxima ação com prazo (vencido destacado), acesso por função
// (dentista não vê; recepção lê; CRC/gestão gravam). Padrão DETALHE + busca.
import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  ROTULO_EVENTO,
  buscarPaciente,
  listarEventos,
  listarPacientes,
  podeGravarFicha,
  prazoVencido,
  registrarEvento,
  salvarProximaAcao,
  type EventoFicha,
  type PacienteFicha,
} from '@/services/ficha'

const dataCurta = (iso: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear() +
    ' ' +
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  )
}

const Ficha = () => {
  const { id } = useParams()
  const { usuario } = useAuth()
  const podeGravar = podeGravarFicha(usuario?.papel ?? '')

  const [busca, setBusca] = useState('')
  const [pacientes, setPacientes] = useState<PacienteFicha[]>([])
  const [paciente, setPaciente] = useState<PacienteFicha | null>(null)
  const [eventos, setEventos] = useState<EventoFicha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  // formulário de evento
  const [tipoEvento, setTipoEvento] = useState('contato')
  const [descricaoEvento, setDescricaoEvento] = useState('')
  const [dialogEvento, setDialogEvento] = useState(false)

  // formulário de próxima ação
  const [acao, setAcao] = useState('')
  const [prazo, setPrazo] = useState('')
  const [respAcao, setRespAcao] = useState('')
  const [dialogAcao, setDialogAcao] = useState(false)

  const carregarLista = useCallback(async (q: string) => {
    setCarregando(true)
    setErro('')
    try {
      setPacientes(await listarPacientes(q))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as fichas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  const carregarFicha = useCallback(async (pacienteId: string) => {
    setErro('')
    setAviso('')
    try {
      const p = await buscarPaciente(pacienteId)
      setPaciente(p)
      setAcao(p.proxima_acao || '')
      setPrazo(p.proxima_acao_prazo ? p.proxima_acao_prazo.slice(0, 10) : '')
      setRespAcao(p.proxima_acao_responsavel || '')
      setEventos(await listarEventos(pacienteId))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a ficha.')
    }
  }, [])

  useEffect(() => {
    if (id) void carregarFicha(id)
    else {
      setPaciente(null)
      void carregarLista(busca)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const gravarEvento = async () => {
    if (!paciente) return
    if (!descricaoEvento.trim()) {
      setErro('Descreva o evento.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      await registrarEvento({
        paciente: paciente.id,
        lead: paciente.lead || '',
        tipo: tipoEvento,
        descricao: descricaoEvento.trim(),
      })
      setDescricaoEvento('')
      setDialogEvento(false)
      setAviso('Evento registrado.')
      await carregarFicha(paciente.id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar o evento.')
    } finally {
      setSalvando(false)
    }
  }

  const gravarProximaAcao = async () => {
    if (!paciente) return
    if (!acao.trim()) {
      setErro('Descreva a próxima ação.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      await salvarProximaAcao(paciente.id, acao.trim(), prazo, respAcao.trim())
      setDialogAcao(false)
      setAviso('Próxima ação salva.')
      await carregarFicha(paciente.id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a próxima ação.')
    } finally {
      setSalvando(false)
    }
  }

  // Sem id: lista de busca de fichas
  if (!id) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fichas</h1>
          <p className="text-sm text-muted-foreground">
            Abra a ficha do paciente para ver o histórico e a próxima ação.
          </p>
        </div>
        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar paciente</CardTitle>
            <CardDescription>Por nome ou telefone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="ficha-busca" className="sr-only">
                  Buscar paciente
                </Label>
                <Input
                  id="ficha-busca"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="nome ou telefone"
                />
              </div>
              <Button onClick={() => void carregarLista(busca)} disabled={carregando}>
                Buscar
              </Button>
            </div>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : pacientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma ficha encontrada. Fichas são criadas ao cadastrar um lead ou importar
                pacientes.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pacientes.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{p.nome}</span>{' '}
                      <span className="text-muted-foreground">{p.telefone}</span>
                      {p.proxima_acao && (
                        <p className="text-xs text-muted-foreground truncate">
                          Próxima ação: {p.proxima_acao}
                          {p.proxima_acao_prazo &&
                            (prazoVencido(p.proxima_acao_prazo) ? (
                              <span className="text-destructive font-medium">
                                {' '}
                                · prazo vencido ({p.proxima_acao_prazo.slice(0, 10)})
                              </span>
                            ) : (
                              <span> · prazo {p.proxima_acao_prazo.slice(0, 10)}</span>
                            ))}
                        </p>
                      )}
                    </div>
                    <Link to={`/ficha/${p.id}`}>
                      <Button size="sm" variant="outline">
                        Abrir
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ficha aberta
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ficha">
          <Button variant="ghost" size="sm">
            ← Fichas
          </Button>
        </Link>
      </div>
      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm font-medium">
          {aviso}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{paciente?.nome ?? 'Carregando…'}</CardTitle>
          <CardDescription>
            {paciente?.telefone || '—'}
            {paciente?.paciente_clinicorp_id
              ? ' · Clinicorp ' + paciente.paciente_clinicorp_id
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Responsável pela ficha:</span>{' '}
            {paciente?.responsavel || '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próxima ação</CardTitle>
          <CardDescription>O que falta fazer e até quando.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!paciente?.proxima_acao ? (
            <p className="text-muted-foreground">
              Nenhuma próxima ação definida.
              {podeGravar && ' Use "Definir próxima ação".'}
            </p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{paciente.proxima_acao}</p>
              <p>
                <span className="text-muted-foreground">Prazo:</span>{' '}
                {paciente.proxima_acao_prazo ? (
                  prazoVencido(paciente.proxima_acao_prazo) ? (
                    <Badge variant="destructive">
                      VENCIDO — {paciente.proxima_acao_prazo.slice(0, 10)}
                    </Badge>
                  ) : (
                    paciente.proxima_acao_prazo.slice(0, 10)
                  )
                ) : (
                  'sem prazo'
                )}
              </p>
              <p className="text-muted-foreground">
                Responsável: {paciente.proxima_acao_responsavel || '—'}
              </p>
            </div>
          )}
          {podeGravar && paciente && (
            <Dialog open={dialogAcao} onOpenChange={setDialogAcao}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {paciente.proxima_acao ? 'Editar próxima ação' : 'Definir próxima ação'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Próxima ação</DialogTitle>
                  <DialogDescription>
                    O que falta fazer com este paciente e até quando.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ficha-acao">Ação *</Label>
                    <Textarea
                      id="ficha-acao"
                      value={acao}
                      onChange={(e) => setAcao(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="ficha-prazo">Prazo</Label>
                      <Input
                        id="ficha-prazo"
                        type="date"
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ficha-resp">Responsável da ação</Label>
                      <Input
                        id="ficha-resp"
                        value={respAcao}
                        onChange={(e) => setRespAcao(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogAcao(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void gravarProximaAcao()} disabled={salvando}>
                    {salvando ? 'Salvando…' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico ({eventos.length})</CardTitle>
          <CardDescription>
            Em ordem, do mais recente pro mais antigo. Evento não é editado nem apagado — correção é
            um evento novo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum evento ainda.{' '}
              {podeGravar ? 'Registre o primeiro contato.' : 'A equipe registra os contatos aqui.'}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {eventos.map((ev) => (
                <li key={ev.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{ROTULO_EVENTO[ev.tipo] || ev.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {dataCurta(ev.criado_em)} · {ev.autor || '—'}
                    </span>
                  </div>
                  <p>{ev.descricao}</p>
                </li>
              ))}
            </ul>
          )}
          {podeGravar && paciente && (
            <Dialog open={dialogEvento} onOpenChange={setDialogEvento}>
              <DialogTrigger asChild>
                <Button size="sm">Registrar evento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar evento</DialogTitle>
                  <DialogDescription>
                    Contato, resultado, nota ou combinado da avaliação. Fica no histórico.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Tipo do evento *</Label>
                    <Select value={tipoEvento} onValueChange={setTipoEvento}>
                      <SelectTrigger aria-label="Tipo do evento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROTULO_EVENTO).map(([valor, rotulo]) => (
                          <SelectItem key={valor} value={valor}>
                            {rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ficha-desc">Descrição *</Label>
                    <Textarea
                      id="ficha-desc"
                      value={descricaoEvento}
                      onChange={(e) => setDescricaoEvento(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogEvento(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void gravarEvento()} disabled={salvando}>
                    {salvando ? 'Salvando…' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etapas do tratamento</CardTitle>
          <CardDescription>
            Sequência definida pelo avaliador habilitado — decisão clínica não é editada aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aguarda sequência/liberação do avaliador. Quando houver plano aprovado, as etapas
            aparecem nesta aba.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Ficha
