import { useCallback, useEffect, useState } from 'react'
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
  csvParaLinhasAppCrc,
  importarLeadsAppCrc,
  listarCampanhas,
  listarOrigensManuais,
  listarLeads,
  mudarEtapa,
  salvarCampanha,
  salvarOrigemManual,
  type Campanha,
  type Lead,
  type OrigemManual,
  type ResultadoImportacao,
} from '@/services/leads'

const ROTULO_ETAPA: Record<string, string> = {
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  aguardando_retorno: 'Aguardando retorno',
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  compareceu: 'Compareceu',
  faltou: 'Faltou',
  desqualificado: 'Desqualificado',
}

const ROTULO_ORIGEM: Record<string, string> = {
  campanha: 'Campanha',
  manual: 'Manual',
  desconhecida: 'Desconhecida',
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [origens, setOrigens] = useState<OrigemManual[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [origemManualId, setOrigemManualId] = useState('')
  const [dupAviso, setDupAviso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [previa, setPrevia] = useState<Array<{
    id_app_crc: string
    nome: string
    telefone: string
    origem: string
  }> | null>(null)
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportacao | null>(null)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [ls, cs, os] = await Promise.all([
        listarLeads(),
        listarCampanhas(),
        listarOrigensManuais(),
      ])
      setLeads(ls)
      setCampanhas(cs)
      setOrigens(os)
    } catch {
      setErro('Não foi possível carregar os dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const criar = async (confirmar: boolean) => {
    setErro('')
    setAviso('')
    setDupAviso('')
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preencha nome e telefone do lead.')
      return
    }
    setSalvando(true)
    try {
      const r = await criarLead(nome, telefone, codigo, origemManualId, confirmar)
      if (r.criado) {
        setAviso(
          'Lead criado' +
            (r.origem_tipo === 'campanha'
              ? ' com campanha.'
              : r.origem_tipo === 'manual'
                ? ' com origem manual.'
                : ' com origem desconhecida.') +
            (r.aviso ? ' ' + r.aviso : ''),
        )
        setNome('')
        setTelefone('')
        setCodigo('')
        setOrigemManualId('')
        await carregar()
      } else if (r.aviso_duplicado) {
        setDupAviso(r.mensagem || 'Telefone já cadastrado.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o lead.')
    } finally {
      setSalvando(false)
    }
  }

  const trocarEtapa = async (leadId: string, etapa: string) => {
    setErro('')
    setAviso('')
    try {
      await mudarEtapa(leadId, etapa)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar a etapa.')
    }
  }

  const desqualificar = async (leadId: string) => {
    setErro('')
    setAviso('')
    try {
      await mudarEtapa(leadId, 'desqualificado', 'outro')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desqualificar.')
    }
  }

  const escolherArquivo = async (arquivo: File | undefined) => {
    setErro('')
    setAviso('')
    setPrevia(null)
    setResultadoImport(null)
    if (!arquivo) return
    try {
      const linhas = csvParaLinhasAppCrc(await arquivo.text())
      if (linhas.length === 0) throw new Error('O arquivo não tem linhas de dados.')
      setPrevia(linhas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  const importar = async () => {
    if (!previa) return
    setErro('')
    setSalvando(true)
    try {
      const r = await importarLeadsAppCrc(previa)
      setResultadoImport(r)
      setPrevia(null)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar.')
    } finally {
      setSalvando(false)
    }
  }

  const novaCampanha = async () => {
    const el = document.getElementById('nova-campanha-nome') as HTMLInputElement | null
    const elCod = document.getElementById('nova-campanha-codigo') as HTMLInputElement | null
    if (!el || !elCod) return
    setErro('')
    setAviso('')
    setSalvando(true)
    try {
      await salvarCampanha(elCod.value, el.value, '')
      el.value = ''
      elCod.value = ''
      setAviso('Campanha salva.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a campanha.')
    } finally {
      setSalvando(false)
    }
  }

  const novaOrigem = async () => {
    const el = document.getElementById('nova-origem-nome') as HTMLInputElement | null
    if (!el) return
    setErro('')
    setAviso('')
    setSalvando(true)
    try {
      await salvarOrigemManual(el.value)
      el.value = ''
      setAviso('Origem manual salva.')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a origem.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Cada lead com a origem dele. A origem nunca é preenchida por suposição.
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
      {dupAviso && (
        <Card className="border-2 border-amber-500 bg-amber-50">
          <CardContent className="py-3 space-y-2">
            <p className="text-sm font-bold text-amber-800">Possível duplicado</p>
            <p className="text-sm">{dupAviso}</p>
            <p className="text-xs text-muted-foreground">
              As fichas não se juntam sozinhas — decida se cria outra ficha ou cancela.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void criar(true)} disabled={salvando}>
                Criar outra ficha
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDupAviso('')}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo lead</CardTitle>
          <CardDescription>
            Código de campanha: só vale se existir em Campanhas. Sem código, a origem fica
            desconhecida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="lead-nome">Nome</Label>
              <Input id="lead-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-tel">Telefone</Label>
              <Input
                id="lead-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="21999999999"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-codigo">Código da campanha</Label>
              <Input id="lead-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-origem">Origem manual</Label>
              <select
                id="lead-origem"
                value={origemManualId}
                onChange={(e) => setOrigemManualId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {origens.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={() => void criar(false)} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Cadastrar lead'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads cadastrados ({leads.length})</CardTitle>
          <CardDescription>Etapa atualizada pela CRC enquanto conversa.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lead ainda. Cadastre o primeiro acima.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {leads.map((l) => (
                <li key={l.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.nome}</span>
                    <span className="text-muted-foreground">{l.telefone}</span>
                    <Badge
                      variant={
                        l.origem_tipo === 'campanha'
                          ? 'default'
                          : l.origem_tipo === 'manual'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {ROTULO_ORIGEM[l.origem_tipo] || l.origem_tipo}
                    </Badge>
                    <Badge variant="secondary">{ROTULO_ETAPA[l.etapa] || l.etapa}</Badge>
                    {l.origem_texto_original && (
                      <span className="text-xs text-muted-foreground">
                        origem informada: {l.origem_texto_original}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {l.etapa === 'novo' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void trocarEtapa(l.id, 'em_atendimento')}
                      >
                        Iniciar atendimento
                      </Button>
                    )}
                    {l.etapa === 'em_atendimento' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void trocarEtapa(l.id, 'aguardando_retorno')}
                      >
                        Aguardando retorno
                      </Button>
                    )}
                    {l.etapa !== 'desqualificado' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            Desqualificar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desqualificar este lead?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O lead de {l.nome} será encerrado com o motivo "outro". Isso não pode
                              ser desfeito (a correção é um novo evento).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void desqualificar(l.id)}>
                              Desqualificar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar leads do APP CRC</CardTitle>
          <CardDescription>
            CSV com cabeçalho: Id Lead/Paciente, Nome, Telefone, Status do lead, Origem, Telefone de
            entrada. Linha sem telefone é rejeitada; reimport não duplica.
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
              <p className="text-sm">Prévia: {previa.length} linha(s) lida(s).</p>
              <div className="flex gap-2">
                <Button onClick={importar} disabled={salvando}>
                  {salvando ? 'Importando…' : 'Importar'}
                </Button>
                <Button variant="outline" onClick={() => setPrevia(null)} disabled={salvando}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {resultadoImport && (
            <p role="status" className="text-sm font-medium">
              Importação: {resultadoImport.gravados} gravado(s), {resultadoImport.duplicados}{' '}
              duplicado(s) pulado(s)
              {resultadoImport.rejeitadas.length > 0 &&
                ` · ${resultadoImport.rejeitadas.length} rejeitada(s): ` +
                  resultadoImport.rejeitadas
                    .map((x) => `linha ${x.linha} (${x.motivos.join('; ')}`)
                    .join(' · ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campanhas e origens (gestão)</CardTitle>
          <CardDescription>
            Códigos combinados com a agência. Origens manuais: indicação e outra — descrever.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="nova-campanha-codigo">Código</Label>
              <Input id="nova-campanha-codigo" placeholder="ex.: carga-imediata-out26" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nova-campanha-nome">Nome</Label>
              <Input id="nova-campanha-nome" placeholder="ex.: Carga imediata out/26" />
            </div>
            <div className="flex items-end">
              <Button onClick={novaCampanha} disabled={salvando}>
                Adicionar campanha
              </Button>
            </div>
          </div>
          {campanhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma campanha ainda — os códigos vêm da agência.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {campanhas.map((c) => (
                <Badge key={c.id} variant={c.ativa ? 'default' : 'secondary'}>
                  {c.codigo} · {c.nome}
                </Badge>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="nova-origem-nome">Nova origem manual</Label>
              <Input id="nova-origem-nome" />
            </div>
            <div className="flex items-end">
              <Button onClick={novaOrigem} disabled={salvando}>
                Adicionar origem
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {origens.map((o) => (
              <Badge key={o.id} variant="secondary">
                {o.nome}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Leads