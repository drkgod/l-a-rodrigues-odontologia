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
import { useAuth } from '@/contexts/AuthContext'
import { listarAgendaDoDia, listarProfissionais, type ItemAgenda } from '@/services/agenda'
import {
  listarGruposAtivos,
  listarPlanejamentos,
  sugerirDuracao,
  type GrupoAtivo,
  type ItemPlanejamento,
  type Planejamento,
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
  const { usuario } = useAuth()
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
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [consultando, setConsultando] = useState(false)

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
      listarPlanejamentos()
        .then((todos) => setCasosSemRegra(todos.filter((p) => p.situacao === 'sem_regra')))
        .catch(() => {})
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar. Tente novamente.')
    } finally {
      setConsultando(false)
    }
  }

  const fmt = (min: number) =>
    String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0')

  const grupoEscolhido = grupos.find((g) => g.grupo_regra === grupo)
  const temSegundaVariavel = Boolean(grupoEscolhido?.variavel_2)

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
                    {vagas.map((v) => (
                      <Badge key={v.inicio} variant="secondary">
                        {v.inicio}–{v.fim}
                      </Badge>
                    ))}
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
          <CardTitle className="text-base">Casos sem regra</CardTitle>
          <CardDescription>
            Combinações sem tempo na tabela — a direção valida e a clínica cadastra a regra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {casosSemRegra.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caso sem regra até agora.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {casosSemRegra.slice(0, 20).map((p) => (
                <li key={p.id}>
                  {descreverItens(p.itens)}
                  {p.profissional ? ` · ${p.profissional}` : ''} ·{' '}
                  {new Date(p.created).toLocaleString('pt-BR')}
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

// PocketBase devolve campo JSON PARSEADO (array de objetos) — aceitar array ou texto.
function descreverItens(
  valor: Array<{ grupo_regra: string; quantidade: number }> | string,
): string {
  let itens: Array<{ grupo_regra: string; quantidade: number }>
  if (Array.isArray(valor)) {
    itens = valor
  } else {
    try {
      itens = JSON.parse(valor) as Array<{ grupo_regra: string; quantidade: number }>
    } catch {
      return String(valor)
    }
  }
  return itens.map((i) => `${i.quantidade}× ${i.grupo_regra}`).join(' + ')
}

export default Planejar
