// Emenda CA-SEQ-02 — catálogo de modelos de sequência (gestão organiza;
// avaliador habilitado aprova o conteúdo clínico). Padrão lista + dialog.
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  aprovarModelo,
  arquivarModelo,
  listarModelos,
  salvarModelo,
  type EtapaModelo,
  type ModeloSequencia,
} from '@/services/modelos'

const rotuloEstado = (estado: string): string =>
  estado === 'rascunho'
    ? 'Rascunho'
    : estado === 'aprovado'
      ? 'Aprovado'
      : estado === 'arquivado'
        ? 'Arquivado'
        : estado || '—'

const etapasResumo = (etapas: EtapaModelo[]): string => {
  if (!etapas.length) return '—'
  return etapas
    .slice()
    .sort((a, b) => a.ordem_visual - b.ordem_visual)
    .map((t) => {
      const deps = t.depende_de.length > 0 ? ' (após ' + t.depende_de.join(', ') + ')' : ''
      return t.chave + ': ' + t.procedimento + deps
    })
    .join(' · ')
}

const Modelos = () => {
  const { usuario } = useAuth()
  const ehGestao = usuario?.papel === 'gestao' && usuario?.ativo === true
  const ehAvaliador =
    usuario?.papel === 'dentista' &&
    usuario?.ativo === true &&
    usuario?.avaliador_habilitado === true

  const [modelos, setModelos] = useState<ModeloSequencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [trabalhando, setTrabalhando] = useState('')

  const [dialogAberto, setDialogAberto] = useState(false)
  const [editandoId, setEditandoId] = useState('')
  const [nome, setNome] = useState('')
  const [etapas, setEtapas] = useState<EtapaModelo[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setModelos(await listarModelos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os modelos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const abrirNovo = () => {
    setEditandoId('')
    setNome('')
    setEtapas([{ chave: 'A', procedimento: '', ordem_visual: 1, depende_de: [] }])
    setErroForm('')
    setDialogAberto(true)
  }

  const abrirEdicao = (m: ModeloSequencia) => {
    setEditandoId(m.id)
    setNome(m.nome)
    setEtapas(
      m.etapas.length > 0
        ? m.etapas.map((t) => ({ ...t, depende_de: [...t.depende_de] }))
        : [{ chave: 'A', procedimento: '', ordem_visual: 1, depende_de: [] }],
    )
    setErroForm('')
    setDialogAberto(true)
  }

  const mudarEtapa = (i: number, campo: keyof EtapaModelo, valor: string) => {
    setEtapas((atuais) =>
      atuais.map((t, j) => {
        if (j !== i) return t
        if (campo === 'ordem_visual') return { ...t, ordem_visual: Number(valor) || j + 1 }
        return { ...t, [campo]: valor }
      }),
    )
  }

  const mudarDep = (i: number, chaveDep: string, marcado: boolean) => {
    setEtapas((atuais) =>
      atuais.map((t, j) => {
        if (j !== i) return t
        if (marcado) {
          if (t.depende_de.indexOf(chaveDep) >= 0) return t
          return { ...t, depende_de: [...t.depende_de, chaveDep] }
        }
        return { ...t, depende_de: t.depende_de.filter((d) => d !== chaveDep) }
      }),
    )
  }

  const salvar = async () => {
    if (!nome.trim()) {
      setErroForm('Dê um nome ao modelo.')
      return
    }
    if (etapas.length === 0) {
      setErroForm('Cadastre ao menos uma etapa.')
      return
    }
    for (const t of etapas) {
      if (!t.chave.trim() || !t.procedimento.trim()) {
        setErroForm('Toda etapa precisa de chave e procedimento.')
        return
      }
    }
    setErroForm('')
    setSalvando(true)
    try {
      const r = await salvarModelo({
        modelo_id: editandoId || undefined,
        nome: nome.trim(),
        etapas,
      })
      setDialogAberto(false)
      setAviso(
        r.nova_versao
          ? 'Modelo aprovado não muda: criei a versão ' + r.versao + ' como rascunho.'
          : 'Modelo salvo.',
      )
      await carregar()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Não foi possível salvar o modelo.')
    } finally {
      setSalvando(false)
    }
  }

  const aprovar = async (m: ModeloSequencia) => {
    setTrabalhando(m.id)
    setErro('')
    try {
      await aprovarModelo(m.id)
      setAviso('Modelo aprovado.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível aprovar o modelo.')
    } finally {
      setTrabalhando('')
    }
  }

  const arquivar = async (m: ModeloSequencia) => {
    setTrabalhando(m.id)
    setErro('')
    try {
      await arquivarModelo(m.id)
      setAviso('Modelo arquivado.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível arquivar o modelo.')
    } finally {
      setTrabalhando('')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modelos de sequência</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo opcional. Copiar um modelo pra um paciente cria cópia própria — mudar o modelo
            não altera pacientes.
          </p>
        </div>
        <Button onClick={abrirNovo}>Novo modelo</Button>
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
          <CardTitle className="text-base">Catálogo ({modelos.length})</CardTitle>
          <CardDescription>
            Aprovação clínica é do avaliador habilitado. Gestão organiza (arquivar) sem mexer na
            aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum modelo ainda. Crie o primeiro com "Novo modelo".
            </p>
          ) : (
            <ul className="space-y-3">
              {modelos.map((m) => (
                <li key={m.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{m.nome}</p>
                      <Badge variant="secondary">v{m.versao}</Badge>
                      <Badge
                        variant={
                          m.estado === 'aprovado'
                            ? 'default'
                            : m.estado === 'arquivado'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {rotuloEstado(m.estado)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {m.estado !== 'arquivado' && (ehGestao || ehAvaliador) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirEdicao(m)}
                          disabled={trabalhando === m.id}
                        >
                          Editar
                        </Button>
                      )}
                      {m.estado === 'rascunho' && ehAvaliador && (
                        <Button
                          size="sm"
                          onClick={() => void aprovar(m)}
                          disabled={trabalhando === m.id}
                        >
                          Aprovar
                        </Button>
                      )}
                      {m.estado !== 'arquivado' && ehGestao && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" disabled={trabalhando === m.id}>
                              Arquivar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Arquivar modelo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {m.nome} (v{m.versao}) sai do uso — não dá mais pra editar nem
                                copiar. O histórico fica guardado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void arquivar(m)}>
                                Arquivar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{etapasResumo(m.etapas)}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.autor ? 'Autor: ' + m.autor : ''}
                    {m.aprovado_por ? ' · Aprovado por: ' + m.aprovado_por : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
            <DialogDescription>
              Etapas com dependências entre elas. Duas etapas sem dependência rodam em paralelo.
            </DialogDescription>
          </DialogHeader>
          {erroForm && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erroForm}
            </p>
          )}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="modelo-nome">Nome do modelo *</Label>
              <Input
                id="modelo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Implante unitário"
              />
            </div>
            <div className="space-y-2">
              {etapas.map((t, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor={'etapa-chave-' + i}>Chave *</Label>
                      <Input
                        id={'etapa-chave-' + i}
                        value={t.chave}
                        onChange={(e) => mudarEtapa(i, 'chave', e.target.value)}
                        placeholder="A"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={'etapa-proc-' + i}>Procedimento *</Label>
                      <Input
                        id={'etapa-proc-' + i}
                        value={t.procedimento}
                        onChange={(e) => mudarEtapa(i, 'procedimento', e.target.value)}
                        placeholder="ex.: Cirurgia de implante"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Depende de</Label>
                    {etapas.filter((_, j) => j !== i && etapas[j].chave.trim()).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma outra etapa — esta roda em paralelo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {etapas.map((outra, j) =>
                          j === i || !outra.chave.trim() ? null : (
                            <label
                              key={outra.chave + j}
                              className="flex items-center gap-1 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={t.depende_de.indexOf(outra.chave) >= 0}
                                onChange={(e) => mudarDep(i, outra.chave, e.target.checked)}
                                aria-label={'Depende de ' + outra.chave}
                              />
                              {outra.chave}
                            </label>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  {etapas.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEtapas((at) => at.filter((_, j) => j !== i))}
                      aria-label={'Remover etapa ' + (t.chave || i + 1)}
                    >
                      Remover etapa
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEtapas((at) => [
                  ...at,
                  {
                    chave: String.fromCharCode(65 + at.length),
                    procedimento: '',
                    ordem_visual: at.length + 1,
                    depende_de: [],
                  },
                ])
              }
            >
              Adicionar etapa
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Modelos
