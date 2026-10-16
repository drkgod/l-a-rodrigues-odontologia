import { useCallback, useEffect, useRef, useState } from 'react'
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
  importarPendencias,
  listarPendencias,
  montarLista,
  mudarEstadoPendencia,
  atualizarPendencia,
  verificarAgendamentoFuturo,
  type Pendencia,
} from '@/services/pendencias'
import { listarLeads, type Lead } from '@/services/leads'

const PacientesAgendar = () => {
  const { eGestao } = useAuth()
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [importando, setImportando] = useState(false)
  const [trabalhando, setTrabalhando] = useState('')
  const [previa, setPrevia] = useState<{ nome: string; csv: string } | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [ps, ls] = await Promise.all([listarPendencias(), listarLeads()])
      setPendencias(ps)
      setLeads(ls)
    } catch {
      setErro('Não foi possível carregar a lista. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setImportando(true)
    setErro('')
    try {
      const texto = await arquivo.text()
      setPrevia({ nome: arquivo.name, csv: texto })
    } catch {
      setErro('Não foi possível ler o arquivo.')
    } finally {
      setImportando(false)
      if (arquivoRef.current) arquivoRef.current.value = ''
    }
  }

  const confirmarImportacao = async () => {
    if (!previa) return
    setImportando(true)
    try {
      const r = await importarPendencias(previa.csv, previa.nome)
      toast.success(
        `Importação: ${r.gravadas} gravada(s), ${r.duplicadas} duplicada(s), ${r.rejeitadas.length} rejeitada(s).`,
      )
      setPrevia(null)
      await carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação.')
    } finally {
      setImportando(false)
    }
  }

  const marcarExecutada = async (p: Pendencia) => {
    setTrabalhando(p.id)
    try {
      await mudarEstadoPendencia(p.id, 'executada')
      toast.success('Procedimento marcado como executado — sai da lista.')
      await carregar()
    } catch {
      toast.error('Não foi possível marcar. Tente novamente.')
    } finally {
      setTrabalhando('')
    }
  }

  const aguardandoCondicao = async (p: Pendencia) => {
    setTrabalhando(p.id)
    try {
      await mudarEstadoPendencia(
        p.id,
        'aguardando_condicao',
        'aguardando condição informada pela clínica',
      )
      toast.success('Marcada como aguardando condição — vai para revisão.')
      await carregar()
    } catch {
      toast.error('Não foi possível marcar. Tente novamente.')
    } finally {
      setTrabalhando('')
    }
  }

  const verificar = async (p: Pendencia) => {
    setTrabalhando(p.id)
    try {
      const temFuturo = await verificarAgendamentoFuturo(p.id)
      toast.success(
        temFuturo
          ? 'Agendamento futuro verificado — item vai para "Agendado".'
          : 'Nenhum agendamento futuro encontrado — continua pendente.',
      )
      await carregar()
    } catch {
      toast.error('Não foi possível verificar. Tente novamente.')
    } finally {
      setTrabalhando('')
    }
  }

  const salvarDisponibilidade = async (
    p: Pendencia,
    campo: 'disponibilidade_1' | 'disponibilidade_2',
    valor: string,
  ) => {
    setTrabalhando(p.id)
    try {
      await atualizarPendencia(p.id, { [campo]: valor })
      await carregar()
    } catch {
      toast.error('Não foi possível salvar a disponibilidade.')
    } finally {
      setTrabalhando('')
    }
  }

  const salvarProntidao = async (p: Pendencia, prontidao: 'pronto' | 'aguardando_condicao') => {
    setTrabalhando(p.id)
    try {
      await atualizarPendencia(p.id, {
        prontidao,
        motivo_revisao: prontidao === 'pronto' ? '' : 'aguardando condição informada pela clínica',
      })
      toast.success(
        prontidao === 'pronto' ? 'Paciente pronto para agendar.' : 'Marcado para revisão.',
      )
      await carregar()
    } catch {
      toast.error('Não foi possível salvar a prontidão.')
    } finally {
      setTrabalhando('')
    }
  }

  const lista = montarLista(pendencias)
  const aguardandoHorario = leads.filter(
    (l) => l.etapa === 'em_atendimento' || l.etapa === 'aguardando_retorno',
  )
  const faltas = leads.filter((l) => l.etapa === 'faltou')

  const linhaPendencia = (p: Pendencia) => (
    <TableRow key={p.id}>
      <TableCell className="font-medium">
        {p.paciente_nome}
        {p.telefone ? (
          <span className="block text-xs text-muted-foreground">{p.telefone}</span>
        ) : null}
      </TableCell>
      <TableCell>
        {p.procedimento}
        {p.profissional ? (
          <span className="block text-xs text-muted-foreground">{p.profissional}</span>
        ) : null}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Input
          defaultValue={p.disponibilidade_1}
          placeholder="1ª opção"
          className="h-8 w-28"
          onBlur={(e) => {
            if (e.target.value !== p.disponibilidade_1)
              void salvarDisponibilidade(p, 'disponibilidade_1', e.target.value)
          }}
          aria-label={`1ª opção de ${p.paciente_nome}`}
        />
        <Input
          defaultValue={p.disponibilidade_2}
          placeholder="2ª opção"
          className="mt-1 h-8 w-28"
          onBlur={(e) => {
            if (e.target.value !== p.disponibilidade_2)
              void salvarDisponibilidade(p, 'disponibilidade_2', e.target.value)
          }}
          aria-label={`2ª opção de ${p.paciente_nome}`}
        />
      </TableCell>
      <TableCell>
        {p.prontidao === 'pronto' ? (
          <Badge>Pronto</Badge>
        ) : (
          <Badge variant="secondary">Aguardando condição</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={trabalhando === p.id}
            onClick={() => void verificar(p)}
          >
            Verificar agenda
          </Button>
          {eGestao && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={trabalhando === p.id}
                onClick={() =>
                  void salvarProntidao(
                    p,
                    p.prontidao === 'pronto' ? 'aguardando_condicao' : 'pronto',
                  )
                }
              >
                {p.prontidao === 'pronto' ? 'Marcar p/ revisão' : 'Marcar pronto'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={trabalhando === p.id}>
                    Executada
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Marcar como executado?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {p.paciente_nome} — {p.procedimento} sai da lista de pendentes. Essa ação
                      registra que o procedimento foi executado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void marcarExecutada(p)}>
                      Executada
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes a agendar</h1>
          <p className="text-sm text-muted-foreground">
            Pendências de tratamento, leads aguardando horário e faltas — com disponibilidade e
            prontidão.
          </p>
        </div>
        <div>
          <input
            ref={arquivoRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void escolherArquivo(e.target.files?.[0])}
          />
          <Button onClick={() => arquivoRef.current?.click()} disabled={importando}>
            {importando ? 'Lendo…' : 'Importar pendências (CSV)'}
          </Button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {previa && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prévia da importação — {previa.nome}</CardTitle>
            <CardDescription>
              Confira antes de gravar. Formato: paciente;telefone;procedimento;profissional;situacao
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {previa.csv.slice(0, 2000)}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void confirmarImportacao()} disabled={importando}>
                {importando ? 'Importando…' : 'Confirmar importação'}
              </Button>
              <Button variant="outline" onClick={() => setPrevia(null)} disabled={importando}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">A agendar ({lista.aAgendar.length})</CardTitle>
          <CardDescription>
            Pendências prontas, leads aguardando horário e faltas a reagendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <>
              {lista.aAgendar.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead className="hidden md:table-cell">Disponibilidade</TableHead>
                      <TableHead>Prontidão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{lista.aAgendar.map(linhaPendencia)}</TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma pendência pronta.</p>
              )}

              {aguardandoHorario.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Leads aguardando horário ({aguardandoHorario.length})
                  </p>
                  <ul className="space-y-1 text-sm">
                    {aguardandoHorario.map((l) => (
                      <li key={l.id}>
                        {l.nome}
                        {l.telefone ? ` · ${l.telefone}` : ''} ·{' '}
                        <Badge variant="secondary">{l.origem_tipo}</Badge> · etapa {l.etapa}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {faltas.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Faltas a reagendar ({faltas.length})</p>
                  <ul className="space-y-1 text-sm">
                    {faltas.map((l) => (
                      <li key={l.id}>
                        {l.nome}
                        {l.telefone ? ` · ${l.telefone}` : ''} · faltou — ligar para reagendar
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lista.aAgendar.length === 0 &&
                aguardandoHorario.length === 0 &&
                faltas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nada a agendar agora. Importe o arquivo de pendências ou cadastre leads.
                  </p>
                )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Agendado — verificado ({lista.agendado.length})
          </CardTitle>
          <CardDescription>
            Pendência com agendamento futuro verificado na agenda — sai dos pendentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.agendado.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item verificado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.agendado.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.paciente_nome}</TableCell>
                    <TableCell>
                      {p.procedimento}
                      {p.profissional ? (
                        <span className="block text-xs text-muted-foreground">
                          {p.profissional}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={trabalhando === p.id}
                        onClick={() => void verificar(p)}
                      >
                        Re-verificar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Para revisão ({lista.paraRevisao.length})</CardTitle>
          <CardDescription>
            Não elegíveis para encaixe até resolver o motivo — inclui tratamentos que aguardam
            sequência/liberação do avaliador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.paraRevisao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada em revisão.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lista.paraRevisao.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {p.paciente_nome} — {p.procedimento}
                    {p.profissional ? ` · ${p.profissional}` : ''} ·{' '}
                    <Badge variant="secondary">{p.motivo_revisao || 'aguarda revisão'}</Badge>
                  </span>
                  {eGestao && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={trabalhando === p.id}
                      onClick={() => void salvarProntidao(p, 'pronto')}
                    >
                      Marcar pronto
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PacientesAgendar
