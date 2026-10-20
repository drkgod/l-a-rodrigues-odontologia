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
  criarFicha,
  listarEventos,
  listarPacientes,
  podeGravarFicha,
  prazoVencido,
  registrarEvento,
  salvarProximaAcao,
  type EventoFicha,
  type PacienteFicha,
} from '@/services/ficha'
import {
  atribuirAvaliador,
  listarDentistas,
  obterPlano,
  type AvaliadorHabilitado,
  type PlanoProjetado,
} from '@/services/tratamento'

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

const rotuloEstadoPlano = (estado: string): string =>
  estado === 'rascunho'
    ? 'Rascunho'
    : estado === 'aprovado'
      ? 'Aprovado'
      : estado === 'em_revisao'
        ? 'Em revisão'
        : estado === 'encerrado'
          ? 'Encerrado'
          : estado || '—'

const Ficha = () => {
  const { id } = useParams()
  const { usuario, eGestao } = useAuth()
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
  const [dialogNova, setDialogNova] = useState(false)
  const [novaNome, setNovaNome] = useState('')
  const [novaTelefone, setNovaTelefone] = useState('')
  const [novaAviso, setNovaAviso] = useState('')
  const [novaSalvando, setNovaSalvando] = useState(false)

  // Emenda CA-SEQ-01 — avaliador do plano de tratamento (status operacional)
  const [plano, setPlano] = useState<PlanoProjetado | null>(null)
  const [carregandoPlano, setCarregandoPlano] = useState(false)
  const [planoErro, setPlanoErro] = useState('')
  const [dialogAvaliador, setDialogAvaliador] = useState(false)
  const [avaliadorEscolhido, setAvaliadorEscolhido] = useState('')
  const [salvandoAvaliador, setSalvandoAvaliador] = useState(false)
  const [dentistasHabilitados, setDentistasHabilitados] = useState<AvaliadorHabilitado[]>([])

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

  const criarNovaFicha = useCallback(
    async (confirmar: boolean) => {
      setNovaSalvando(true)
      setNovaAviso('')
      try {
        const r = await criarFicha(novaNome, novaTelefone, confirmar)
        if (r.aviso_duplicado) {
          setNovaAviso(r.mensagem || 'Telefone já cadastrado em outra ficha.')
          return
        }
        setDialogNova(false)
        setNovaNome('')
        setNovaTelefone('')
        await carregarLista(novaNome)
      } catch (e) {
        setNovaAviso(e instanceof Error ? e.message : 'Não foi possível criar a ficha.')
      } finally {
        setNovaSalvando(false)
      }
    },
    [novaNome, novaTelefone, carregarLista],
  )

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
      setCarregandoPlano(true)
      setPlanoErro('')
      try {
        setPlano(await obterPlano(pacienteId))
      } catch (e2) {
        setPlanoErro(e2 instanceof Error ? e2.message : 'Não foi possível consultar o plano.')
      } finally {
        setCarregandoPlano(false)
      }
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

  // Emenda CA-SEQ-01 — designar avaliador (só gestão; rota do hook valida no servidor)
  const carregarDentistas = useCallback(async () => {
    try {
      const todos = await listarDentistas()
      setDentistasHabilitados(todos.filter((d) => d.avaliador_habilitado && d.ativo))
    } catch (e) {
      setPlanoErro(e instanceof Error ? e.message : 'Não foi possível carregar os avaliadores.')
    }
  }, [])

  const gravarAvaliador = async () => {
    if (!paciente) return
    if (!avaliadorEscolhido) {
      setPlanoErro('Escolha o avaliador.')
      return
    }
    setPlanoErro('')
    setSalvandoAvaliador(true)
    try {
      await atribuirAvaliador(paciente.id, avaliadorEscolhido, plano?.versao)
      setDialogAvaliador(false)
      setAviso('Avaliador designado.')
      await carregarFicha(paciente.id)
    } catch (e) {
      setPlanoErro(e instanceof Error ? e.message : 'Não foi possível designar o avaliador.')
    } finally {
      setSalvandoAvaliador(false)
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
              <Button variant="outline" onClick={() => setDialogNova(true)}>
                Nova ficha
              </Button>
            </div>
            <Dialog
              open={dialogNova}
              onOpenChange={(aberto) => {
                setDialogNova(aberto)
                if (!aberto) setNovaAviso('')
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova ficha de paciente</DialogTitle>
                  <DialogDescription>
                    Cria a ficha com nome e telefone (DDD + número).
                  </DialogDescription>
                </DialogHeader>
                {novaAviso && (
                  <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
                    {novaAviso}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="nova-nome">Nome</Label>
                    <Input
                      id="nova-nome"
                      value={novaNome}
                      onChange={(e) => setNovaNome(e.target.value)}
                      placeholder="nome do paciente"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nova-telefone">Telefone</Label>
                    <Input
                      id="nova-telefone"
                      value={novaTelefone}
                      onChange={(e) => setNovaTelefone(e.target.value)}
                      placeholder="DDD + número"
                    />
                  </div>
                </div>
                <DialogFooter>
                  {novaAviso ? (
                    <>
                      <Button onClick={() => void criarNovaFicha(true)} disabled={novaSalvando}>
                        Criar outra ficha
                      </Button>
                      <Button variant="outline" onClick={() => setDialogNova(false)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => void criarNovaFicha(false)}
                        disabled={novaSalvando || !novaNome.trim()}
                      >
                        Criar ficha
                      </Button>
                      <Button variant="outline" onClick={() => setDialogNova(false)}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : pacientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma ficha encontrada. Use “Nova ficha” para cadastrar — ou cadastre um lead na
                tela Leads: a ficha do paciente é criada junto.
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
        <CardContent className="space-y-2 text-sm">
          {carregandoPlano ? (
            <p className="text-muted-foreground">Consultando plano…</p>
          ) : planoErro ? (
            <p className="text-destructive">{planoErro}</p>
          ) : !plano || !plano.tem_plano ? (
            <p className="text-muted-foreground">
              Sem plano de tratamento ainda.{' '}
              {eGestao
                ? 'Designar avaliador habilitado para começar.'
                : 'Aguarda avaliador designado.'}
            </p>
          ) : (
            <div className="space-y-1">
              <p>
                <span className="text-muted-foreground">Avaliador:</span>{' '}
                {plano.avaliador_nome || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Estado do plano:</span>{' '}
                <Badge variant="secondary">{rotuloEstadoPlano(plano.estado || '')}</Badge>
              </p>
              <p className="text-muted-foreground">
                As etapas aparecem aqui quando o avaliador aprovar o plano.
              </p>
            </div>
          )}
          {eGestao && paciente && (
            <Dialog open={dialogAvaliador} onOpenChange={(aberto) => {
              setDialogAvaliador(aberto)
              if (aberto) void carregarDentistas()
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {plano?.tem_plano ? 'Trocar avaliador' : 'Designar avaliador'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Avaliador do paciente</DialogTitle>
                  <DialogDescription>
                    Só a gestão designa. O dentista precisa estar habilitado na tela Avaliadores.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Avaliador habilitado *</Label>
                    <Select value={avaliadorEscolhido} onValueChange={setAvaliadorEscolhido}>
                      <SelectTrigger aria-label="Avaliador habilitado">
                        <SelectValue placeholder="Escolha o dentista" />
                      </SelectTrigger>
                      <SelectContent>
                        {dentistasHabilitados.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name || d.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogAvaliador(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void gravarAvaliador()} disabled={salvandoAvaliador}>
                    {salvandoAvaliador ? 'Salvando…' : 'Designar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Ficha