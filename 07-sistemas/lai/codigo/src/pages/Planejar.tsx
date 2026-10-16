import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { listarAgendaDoDia, listarProfissionais, type ItemAgenda } from '@/services/agenda'
import {
  agruparSemRegra,
  conciliarReservas,
  ligarReserva,
  listarDesvios,
  listarGruposAtivos,
  listarPlanejamentos,
  registrarMotivoDesvio,
  revisarDesvio,
  sugerirDuracao,
  validarCombinacao,
  type DesvioDuracao,
  type GrupoAtivo,
  type GrupoSemRegra,
  type Planejamento,
  type ResultadoConciliacao,
  type ResultadoSugestao,
} from '@/services/planejamento'

interface ProfissionalSimples {
  id: string
  nome: string
}

const hoje = () => new Date().toISOString().slice(0, 10)

function tempoEmMinutos(inicio: string): number {
  const [h, m] = inicio.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const Planejar = () => {
  const { usuario, eGestao } = useAuth()
  const [profissionais, setProfissionais] = useState<ProfissionalSimples[]>([])
  const [grupos, setGrupos] = useState<GrupoAtivo[]>([])
  const [profissional, setProfissional] = useState('')
  const [grupo, setGrupo] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [quantidade2, setQuantidade2] = useState('')
  const [data, setData] = useState(hoje())
  const [resultado, setResultado] = useState<ResultadoSugestao | null>(null)
  const [vagas, setVagas] = useState<Array<{ inicio: string; fim: string }>>([])
  const [casosSemRegra, setCasosSemRegra] = useState<Planejamento[]>([])
  const [validando, setValidando] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [consultando, setConsultando] = useState(false)
  // task fdca5fb0 — desvios e conciliação (CA-1-10/11)
  const [itensDia, setItensDia] = useState<ItemAgenda[]>([])
  const [ligando, setLigando] = useState('')
  const [desvioAberto, setDesvioAberto] = useState<DesvioDuracao | null>(null)
  const [motivoTipo, setMotivoTipo] = useState<'grade do profissional' | 'outro'>(
    'grade do profissional',
  )
  const [motivoTexto, setMotivoTexto] = useState('')
  const [salvandoMotivo, setSalvandoMotivo] = useState(false)
  const [desvios, setDesvios] = useState<DesvioDuracao[]>([])
  const [conciliacao, setConciliacao] = useState<ResultadoConciliacao | null>(null)
  const [conciliando, setConciliando] = useState(false)
  const [revisando, setRevisando] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [profs, grps] = await Promise.all([listarProfissionais(), listarGruposAtivos()])
      setProfissionais(profs)
      setGrupos(grps)
    } catch {
      setErro('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const carregarCasosSemRegra = () => {
    listarPlanejamentos()
      .then((todos) => setCasosSemRegra(todos.filter((p) => p.situacao === 'sem_regra')))
      .catch(() => {})
  }

  useEffect(() => {
    carregarCasosSemRegra()
  }, [])

  const consultar = async () => {
    setErro('')
    setResultado(null)
    setVagas([])
    const q1 = Number(quantidade)
    if (!profissional || !grupo || !Number.isFinite(q1) || q1 < 1) {
      setErro('Escolha o profissional, o procedimento e a quantidade (maior que 0).')
      return
    }
    setConsultando(true)
    try {
      const r = await sugerirDuracao(
        [
          {
            grupo_regra: grupo,
            quantidade: q1,
            ...(quantidade2 !== '' ? { quantidade2: Number(quantidade2) } : {}),
          },
        ],
        profissional,
        false,
      )
      setResultado(r)
      // vagas do dia onde o tempo sugerido cabe (referência quando sem política)
      if (r.situacao === 'ok' && r.minutos > 0) {
        const itens = await listarAgendaDoDia(data)
        const doProf = itens.filter((i) => i.profissional === profissional)
        const ocupados = doProf
          .map((i) => ({ ini: tempoEmMinutos(i.inicio), fim: tempoEmMinutos(i.fim) }))
          .sort((a, b) => a.ini - b.ini)
        // agenda do dia = compromissos; horários livres = buracos entre eles
        const livres: Array<{ inicio: string; fim: string }> = []
        let cursor = 8 * 60
        const fimDia = 18 * 60
        for (const o of ocupados) {
          if (o.ini - cursor >= r.minutos) {
            livres.push({
              inicio: fmt(cursor),
              fim: fmt(cursor + (o.ini - cursor)),
            })
          }
          cursor = Math.max(cursor, o.fim)
        }
        if (fimDia - cursor >= r.minutos) {
          livres.push({ inicio: fmt(cursor), fim: fmt(fimDia) })
        }
        setVagas(livres)
      }
      // casos sem regra (lista da gestão) — recarrega silencioso
      carregarCasosSemRegra()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar. Tente novamente.')
    } finally {
      setConsultando(false)
    }
  }

  const validar = async (g: GrupoSemRegra) => {
    setValidando(g.chave)
    try {
      await validarCombinacao(g.ids)
      toast.success('Combinação marcada como validada.')
      carregarCasosSemRegra()
    } catch {
      toast.error('Não foi possível validar. Tente novamente.')
    } finally {
      setValidando('')
    }
  }

  const fmt = (min: number) =>
    String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0')

  // ===== task fdca5fb0 — desvios e conciliação =====
  const carregarDesvios = useCallback(() => {
    listarDesvios()
      .then(setDesvios)
      .catch(() => {})
  }, [])

  useEffect(() => {
    carregarDesvios()
  }, [carregarDesvios])

  const carregarItensDia = useCallback(async (dia: string) => {
    try {
      setItensDia(await listarAgendaDoDia(dia))
    } catch {
      setItensDia([])
    }
  }, [])

  useEffect(() => {
    void carregarItensDia(data)
  }, [data, carregarItensDia])

  const ligar = async (item: ItemAgenda) => {
    if (!resultado?.planejamento_id) return
    setLigando(item.id)
    try {
      const r = await ligarReserva(resultado.planejamento_id, item.id)
      if (r.desvio_id) {
        toast.warning(
          'Reserva ligada com tempo diferente do sugerido (' +
            r.minutos_reservados +
            ' min × ' +
            resultado.minutos +
            ' min) — registre o motivo do desvio.',
        )
        carregarDesvios()
      } else {
        toast.success('Reserva ligada: ' + r.minutos_reservados + ' min (sem desvio).')
      }
      setResultado({ ...resultado, planejamento_id: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível ligar a reserva.')
    } finally {
      setLigando('')
    }
  }

  const abrirMotivo = (d: DesvioDuracao) => {
    setDesvioAberto(d)
    setMotivoTipo('grade do profissional')
    setMotivoTexto('')
  }

  const salvarMotivo = async () => {
    if (!desvioAberto) return
    if (!motivoTexto.trim()) {
      toast.error('O motivo é obrigatório para fechar o desvio.')
      return
    }
    setSalvandoMotivo(true)
    try {
      await registrarMotivoDesvio(desvioAberto.id, motivoTipo, motivoTexto.trim())
      toast.success('Motivo registrado — desvio justificado.')
      setDesvioAberto(null)
      carregarDesvios()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar o motivo.')
    } finally {
      setSalvandoMotivo(false)
    }
  }

  const revisar = async (d: DesvioDuracao) => {
    setRevisando(d.id)
    try {
      await revisarDesvio(d.id)
      toast.success('Desvio revisado.')
      carregarDesvios()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível revisar o desvio.')
    } finally {
      setRevisando('')
    }
  }

  const conciliar = async () => {
    setConciliando(true)
    try {
      const r = await conciliarReservas()
      setConciliacao(r)
      toast.success(
        'Conciliação: ' +
          r.reservas_sem_planejamento.length +
          ' reserva(s) sem planejamento · ' +
          r.reserva_nao_encontrada.length +
          ' planejamento(s) sem reserva.',
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível conciliar.')
    } finally {
      setConciliando(false)
    }
  }

  const desviosPendentes = desvios.filter((d) => d.situacao === 'sem_motivo')
  const desviosJustificados = desvios.filter((d) => d.situacao === 'justificado')
  const desviosRevisados = desvios.filter((d) => d.situacao === 'revisado')

  const grupoEscolhido = grupos.find((g) => g.grupo_regra === grupo)
  const temSegundaVariavel = Boolean(grupoEscolhido?.variavel_2)
  const gruposSemRegra = agruparSemRegra(casosSemRegra)

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planejar agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Tempo sugerido pela tabela da clínica — o sistema nunca inventa tempo.
        </p>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultar tempo</CardTitle>
          <CardDescription>
            Escolha o profissional e o procedimento; a central mostra o tempo da tabela e as vagas
            do dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profissional">Profissional</Label>
                <Select value={profissional} onValueChange={setProfissional}>
                  <SelectTrigger id="profissional" aria-label="Profissional">
                    <SelectValue placeholder="Escolha o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.nome}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedimento">Procedimento</Label>
                <Select value={grupo} onValueChange={setGrupo}>
                  <SelectTrigger id="procedimento" aria-label="Procedimento">
                    <SelectValue placeholder="Escolha o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.grupo_regra} value={g.grupo_regra}>
                        {g.aplica_a || g.grupo_regra}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  aria-label="Quantidade"
                />
              </div>
              {temSegundaVariavel && (
                <div className="space-y-2">
                  <Label htmlFor="quantidade2">{rotuloSegunda(grupoEscolhido?.variavel_2)}</Label>
                  <Input
                    id="quantidade2"
                    type="number"
                    min={0}
                    value={quantidade2}
                    onChange={(e) => setQuantidade2(e.target.value)}
                    aria-label={rotuloSegunda(grupoEscolhido?.variavel_2)}
                    placeholder="0"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="data">Dia das vagas</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  aria-label="Dia das vagas"
                />
              </div>
            </div>
          )}
          <Button onClick={consultar} disabled={consultando}>
            {consultando ? 'Consultando…' : 'Consultar tempo'}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card
          role="status"
          className={
            resultado.situacao === 'ok'
              ? 'border-2 border-green-600 bg-green-50'
              : 'border-2 border-amber-500 bg-amber-50'
          }
        >
          <CardContent className="py-4 space-y-2">
            {resultado.situacao === 'ok' ? (
              <>
                <p className="text-base font-bold text-green-800">
                  {resultado.minutos} min (regra: {rotuloRegra(resultado)})
                </p>
                {resultado.minutos !== resultado.minutos_brutos && (
                  <p className="text-xs text-muted-foreground">
                    Tabela: {resultado.minutos_brutos} min · arredondado para cima no múltiplo de{' '}
                    {resultado.arredondamento} min.
                  </p>
                )}
                <p className="text-sm">
                  Vagas compatíveis no dia {data}
                  {resultado.capacidade_validada ? '' : ' (referência)'}:
                </p>
                {vagas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum espaço livre para esse tempo neste dia.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {vagas.map((v) => {
                      // item real da agenda que ocupa esse intervalo (reserva simulada)
                      const item = itensDia.find(
                        (i) => i.inicio === v.inicio && i.profissional === profissional,
                      )
                      return (
                        <span key={v.inicio} className="flex items-center gap-1">
                          <Badge variant="secondary">
                            {v.inicio}–{v.fim}
                          </Badge>
                          {item && resultado.planejamento_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={ligando === item.id}
                              onClick={() => void ligar(item)}
                              title="Ligar este horário da agenda ao planejamento (reserva de demonstração)"
                            >
                              {ligando === item.id ? 'Ligando…' : 'Ligar reserva'}
                            </Button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                )}
                {!resultado.capacidade_validada && (
                  <p className="text-xs text-amber-700">
                    Capacidade: política de agenda pendente — vagas mostradas como referência, não
                    como oferta.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-bold text-amber-800">
                  Sem regra — validar com a direção
                </p>
                <p className="text-sm">{resultado.mensagem}</p>
                <p className="text-xs text-muted-foreground">
                  O caso foi registrado na lista "Casos sem regra" para a gestão.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Desvios de duração ({desviosPendentes.length} pendente(s))
          </CardTitle>
          <CardDescription>
            Reserva com tempo diferente do sugerido — sem motivo fica pendente da CRC; com motivo
            vai para a revisão da gestão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {desvios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum desvio até agora — desvios aparecem quando a reserva foge do tempo sugerido.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {desvios.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {d.minutos_reservados} min reservados × {d.minutos_sugeridos} min sugeridos (
                    {d.diferenca > 0 ? '+' : ''}
                    {d.diferenca}) ·{' '}
                    <Badge
                      variant={
                        d.situacao === 'sem_motivo'
                          ? 'destructive'
                          : d.situacao === 'justificado'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {d.situacao === 'sem_motivo'
                        ? 'Sem motivo'
                        : d.situacao === 'justificado'
                          ? 'Justificado'
                          : 'Revisado'}
                    </Badge>
                    {d.motivo ? ` · ${d.motivo_tipo}: ${d.motivo}` : ''}
                  </span>
                  <span className="flex gap-1">
                    {d.situacao === 'sem_motivo' && (
                      <Button variant="outline" size="sm" onClick={() => abrirMotivo(d)}>
                        Registrar motivo
                      </Button>
                    )}
                    {eGestao && d.situacao === 'justificado' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={revisando === d.id}>
                            {revisando === d.id ? 'Revisando…' : 'Revisar'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revisar desvio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Desvio de {d.minutos_reservados} min × {d.minutos_sugeridos} min com
                              motivo "{d.motivo}" ficará registrado como revisado com seu nome e a
                              data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void revisar(d)}>
                              Revisar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliação de reservas</CardTitle>
          <CardDescription>
            Reservas sem planejamento atrás e planejamentos que ficaram sem reserva até o fim do
            dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => void conciliar()} disabled={conciliando}>
            {conciliando ? 'Conciliando…' : 'Conciliar agora'}
          </Button>
          {conciliacao && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">
                  Reservas sem planejamento ({conciliacao.reservas_sem_planejamento.length})
                </p>
                {conciliacao.reservas_sem_planejamento.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Toda consulta tem planejamento ligado.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {conciliacao.reservas_sem_planejamento.map((r) => (
                      <li key={r.agenda_item_id}>
                        {r.paciente} · {r.data} {r.hora}
                        {r.teste ? ' · (teste)' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  Reserva não encontrada ({conciliacao.reserva_nao_encontrada.length})
                </p>
                {conciliacao.reserva_nao_encontrada.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum planejamento ficou sem reserva até o fim do dia.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {conciliacao.reserva_nao_encontrada.map((r) => (
                      <li key={r.planejamento_id}>
                        Planejado em {r.criado_em} — sem reserva
                        {r.teste ? ' · (teste)' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={desvioAberto !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setDesvioAberto(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar motivo do desvio</AlertDialogTitle>
            <AlertDialogDescription>
              {desvioAberto
                ? desvioAberto.minutos_reservados +
                  ' min reservados × ' +
                  desvioAberto.minutos_sugeridos +
                  ' min sugeridos. O motivo fecha a pendência da CRC e leva o desvio à revisão da gestão.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="motivo-tipo">Tipo de motivo</Label>
              <Select
                value={motivoTipo}
                onValueChange={(v) => setMotivoTipo(v as 'grade do profissional' | 'outro')}
              >
                <SelectTrigger id="motivo-tipo" aria-label="Tipo de motivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade do profissional">Grade do profissional</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo-texto">Motivo (obrigatório)</Label>
              <Input
                id="motivo-texto"
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                aria-label="Motivo"
                placeholder="Ex.: agenda do dentista só tem bloco de 60 min"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void salvarMotivo()}
              disabled={salvandoMotivo || !motivoTexto.trim()}
            >
              {salvandoMotivo ? 'Salvando…' : 'Registrar motivo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Casos sem regra</CardTitle>
          <CardDescription>
            Combinações sem tempo na tabela — a direção valida e a clínica cadastra a regra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gruposSemRegra.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caso sem regra até agora.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {gruposSemRegra.map((g) => (
                <li key={g.chave} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {g.descricao}
                    {g.profissional ? ` · ${g.profissional}` : ''} ·{' '}
                    <Badge variant="secondary">
                      {g.ocorrencias === 1 ? '1 ocorrência' : `${g.ocorrencias} ocorrências`}
                    </Badge>{' '}
                    · última {new Date(g.ultima).toLocaleString('pt-BR')}
                  </span>
                  {eGestao && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={validando === g.chave}>
                          {validando === g.chave ? 'Validando…' : 'Marcar como validado'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Marcar como validado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {g.ocorrencias} ocorrência(s) de "{g.descricao}
                            {g.profissional ? ` · ${g.profissional}` : ''}" saem da lista de
                            pendentes e ficam no histórico com seu nome e a data. O motor continua
                            exigindo regra cadastrada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void validar(g)}>
                            Validar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              ))}
            </ul>
          )}
          {usuario?.email && casosSemRegra.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Consultas registradas por {casosSemRegra[0]?.crc || '—'}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function rotuloRegra(r: ResultadoSugestao): string {
  if (!r.regra_aplicada) return '—'
  const parts = [r.regra_aplicada.aplica_a || r.regra_aplicada.grupo_regra]
  if (r.regra_aplicada.faixa_1) parts.push(r.regra_aplicada.faixa_1)
  if (r.regra_aplicada.faixa_2) parts.push(r.regra_aplicada.faixa_2)
  if (r.regra_aplicada.profissional) parts.push(r.regra_aplicada.profissional)
  return parts.join(', ')
}

function rotuloSegunda(v: string | undefined): string {
  if (!v) return 'Quantidade 2'
  const mapa: Record<string, string> = {
    qtd_exodontias: 'Exodontias',
    dente_anterior: 'Dentes anteriores',
    protocolo_duplo: 'Protocolo duplo',
  }
  return mapa[v] || v
}

export default Planejar