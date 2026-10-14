import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  DIAS_SEMANA,
  apagarCadeira,
  apagarHorario,
  aplicarHorarios,
  importarArquivoHorarios,
  listarHorariosTodos,
  salvarCadeira,
  salvarHorario,
  type Cadeira,
  type Horario,
  type PreviaHorarios,
} from '@/services/horarios'
import { listarCadeiras, listarProfissionais, type Profissional } from '@/services/agenda'

const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const Horarios = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [profissionalId, setProfissionalId] = useState('')
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cadeiras, setCadeiras] = useState<Cadeira[]>([])
  const [dia, setDia] = useState('1')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [nomeCadeira, setNomeCadeira] = useState('')
  const [tipoCadeira, setTipoCadeira] = useState('tratamento')
  const [previa, setPrevia] = useState<PreviaHorarios | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [profs, hrs, cds] = await Promise.all([
        listarProfissionais(),
        listarHorariosTodos(),
        listarCadeiras(),
      ])
      setProfissionais(profs)
      setHorarios(hrs)
      setCadeiras(cds)
      setProfissionalId((atual) => atual || (profs[0]?.id ?? ''))
    } catch {
      setErro('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const doProfissional = useMemo(
    () => horarios.filter((h) => h.profissional === profissionalId),
    [horarios, profissionalId],
  )

  const salvar = async () => {
    setErro('')
    setAviso('')
    setSalvando(true)
    try {
      await salvarHorario(profissionalId, Number(dia), inicio, fim)
      setInicio('')
      setFim('')
      setAviso('Horário salvo.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o horário.')
    } finally {
      setSalvando(false)
    }
  }

  const apagar = async (id: string) => {
    setErro('')
    setAviso('')
    try {
      await apagarHorario(id)
      setAviso('Horário apagado.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar o horário.')
    }
  }

  const escolherArquivo = async (arquivo: File | undefined) => {
    setErro('')
    setAviso('')
    setPrevia(null)
    if (!arquivo) return
    try {
      setPrevia(await importarArquivoHorarios(arquivo))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  const aplicar = async () => {
    if (!previa) return
    setErro('')
    setSalvando(true)
    try {
      const r = await aplicarHorarios(previa.linhas)
      setPrevia(null)
      setAviso(
        `Importação aplicada: ${r.gravados} horário(s) gravado(s)` +
          (r.rejeitadas.length > 0 ? `, ${r.rejeitadas.length} rejeitada(s).` : '.'),
      )
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível aplicar a importação.')
    } finally {
      setSalvando(false)
    }
  }

  const gravarCadeira = async () => {
    setErro('')
    setAviso('')
    setSalvando(true)
    try {
      await salvarCadeira(nomeCadeira, tipoCadeira)
      setNomeCadeira('')
      setAviso('Cadeira salva.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a cadeira.')
    } finally {
      setSalvando(false)
    }
  }

  const removerCadeira = async (id: string) => {
    setErro('')
    setAviso('')
    try {
      await apagarCadeira(id)
      setAviso('Cadeira apagada.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar a cadeira.')
    }
  }

  const nomeProfissional = profissionais.find((p) => p.id === profissionalId)?.nome || ''

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horários dos dentistas</h1>
        <p className="text-sm text-muted-foreground">
          Jornada de cada dentista por dia da semana. A agenda do dia usa estes blocos para mostrar
          as vagas livres.
        </p>
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

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horários de {nomeProfissional || '…'}</CardTitle>
              <CardDescription>
                Almoço vira dois blocos (ex.: 09:00–13:00 e 14:00–18:00). Sem horário cadastrado, a
                agenda mostra “horário não cadastrado”.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="prof-horario">Dentista</Label>
                  <select
                    id="prof-horario"
                    value={profissionalId}
                    onChange={(e) => setProfissionalId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dia">Dia da semana</Label>
                  <select
                    id="dia"
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {DIAS_SEMANA.map((sigla, i) => (
                      <option key={sigla} value={String(i)}>
                        {NOMES_DIA[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inicio">Início</Label>
                  <Input
                    id="inicio"
                    type="time"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fim">Fim</Label>
                  <Input
                    id="fim"
                    type="time"
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={salvar} disabled={salvando || !profissionalId}>
                {salvando ? 'Salvando…' : 'Adicionar horário'}
              </Button>

              {doProfissional.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum horário cadastrado para este dentista ainda.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {doProfissional.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <span>
                        <span className="font-medium">{NOMES_DIA[h.dia_semana]}</span> · {h.inicio}–
                        {h.fim}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Apagar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar este horário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O bloco {NOMES_DIA[h.dia_semana]} das {h.inicio} às {h.fim} de{' '}
                              {nomeProfissional} será apagado. Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void apagar(h.id)}>
                              Apagar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar horários por CSV</CardTitle>
              <CardDescription>
                Cabeçalho: profissional; dia_semana; inicio; fim — dia como SEG, TER, QUA… e horas
                HH:MM. A prévia mostra rejeições antes de gravar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void escolherArquivo(e.target.files?.[0])}
                className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
              />
              {previa && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Prévia: {previa.validas} linha(s) válida(s) · {previa.rejeitadas.length}{' '}
                    rejeitada(s)
                  </p>
                  {previa.rejeitadas.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {previa.rejeitadas.slice(0, 10).map((r) => (
                        <li key={r.linha}>
                          Linha {r.linha}: {r.motivos.join('; ')}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={aplicar} disabled={salvando || previa.validas === 0}>
                      {salvando ? 'Aplicando…' : 'Aplicar importação'}
                    </Button>
                    <Button variant="outline" onClick={() => setPrevia(null)} disabled={salvando}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadeiras da unidade</CardTitle>
              <CardDescription>
                Usadas no filtro da agenda. Cadastre as cadeiras reais da clínica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="nome-cadeira">Nome</Label>
                  <Input
                    id="nome-cadeira"
                    value={nomeCadeira}
                    onChange={(e) => setNomeCadeira(e.target.value)}
                    placeholder="ex.: Cadeira 1"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tipo-cadeira">Tipo</Label>
                  <select
                    id="tipo-cadeira"
                    value={tipoCadeira}
                    onChange={(e) => setTipoCadeira(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="avaliacao">Avaliação</option>
                    <option value="tratamento">Tratamento</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={gravarCadeira} disabled={salvando}>
                    {salvando ? 'Salvando…' : 'Adicionar cadeira'}
                  </Button>
                </div>
              </div>
              {cadeiras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cadeira cadastrada ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cadeiras.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-2">
                      {c.nome}
                      {c.tipo ? ` · ${c.tipo === 'avaliacao' ? 'avaliação' : 'tratamento'}` : ''}
                      <button
                        type="button"
                        onClick={() => void removerCadeira(c.id)}
                        aria-label={`Apagar cadeira ${c.nome}`}
                        className="text-destructive hover:underline"
                      >
                        apagar
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default Horarios
