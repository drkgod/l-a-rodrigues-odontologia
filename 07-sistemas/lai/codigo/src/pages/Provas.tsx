import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useAuth } from '@/contexts/AuthContext'
import {
  executarProvaP2_01,
  executarProvaP2_02,
  executarProvaP2_03,
  executarProvaP2_04,
  executarProvaP2_05,
  executarProvaP2_05b,
  executarProvaP2_06,
  executarProvaP1_01,
  executarProvaP1_02,
  executarProvaP1_03,
  executarProvaP1_04,
  executarProvaP1_05,
  executarProvaP1_06,
  executarProvaP1_07,
  executarProvaP1_08,
  executarProvaP2_07,
  executarProvaP2_08,
  executarProvaP4_01,
  executarProvaP4_02,
  executarProvaP4_03,
  executarProvaP4_03b,
  executarProvaP4_04,
  executarProvaP4_05,
  executarProvaP4_06,
  executarProvaP4_12,
  executarProvaP4_13,
  executarProvaP4_14,
  executarProvaP4_15,
  executarProvaP4_07,
  executarProvaP3_01,
  executarProvaP3_02,
  executarProvaP3_03,
  executarProvaP3_04,
  executarProvaP3_05,
  executarProvaP3_06,
  executarProvaP3_09a,
  executarProvaP3_09b,
  executarProvaP3_11,
  limparExecucoes,
  listarExecucoes,
  type ExecucaoProva,
  type ResultadoProva,
} from '@/services/provas'

const SPEC = 'SPEC-1-001'

const Provas = () => {
  const { usuario } = useAuth()
  const [execucoes, setExecucoes] = useState<ExecucaoProva[]>([])
  const [ultimo, setUltimo] = useState<ResultadoProva | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [executando, setExecutando] = useState(false)
  const [limpando, setLimpando] = useState(false)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [da001, da004, da003] = await Promise.all([
        listarExecucoes('SPEC-1-001'),
        listarExecucoes('SPEC-1-004'),
        listarExecucoes('SPEC-1-003'),
      ])
      setExecucoes(da001.concat(da004).concat(da003))
    } catch {
      setErro('Não foi possível carregar as execuções. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const registrar = async (resultado: ResultadoProva, spec = SPEC) => {
    const { registrarExecucao } = await import('@/services/provas')
    await registrarExecucao(resultado, spec)
    await carregar()
  }

  const executar = async (fn: () => Promise<ResultadoProva>, spec = SPEC) => {
    setExecutando(true)
    setErro('')
    try {
      const resultado = await fn()
      await registrar(resultado, spec)
      setUltimo(resultado)
    } catch {
      setErro('A prova não pôde ser executada. Tente novamente.')
    } finally {
      setExecutando(false)
    }
  }

  const executarP1_01 = async () => {
    await executar(executarProvaP1_01)
  }

  const limpar = async () => {
    setLimpando(true)
    setErro('')
    try {
      await limparExecucoes('SPEC-1-001')
      await limparExecucoes('SPEC-1-004')
      await limparExecucoes('SPEC-1-003')
      await carregar()
    } catch {
      setErro('Não foi possível limpar as execuções. Tente novamente.')
    } finally {
      setLimpando(false)
    }
  }
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provas da fase 1</h1>
          <p className="text-sm text-muted-foreground">
            Executa os cenários contra o sistema real e grava o resultado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={executarP1_01} disabled={executando}>
            {executando ? 'Executando…' : 'Executar prova P1-01'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_02)}
            disabled={executando}
          >
            P1-02 (fixture 20)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_03)}
            disabled={executando}
          >
            P1-03 (reimportação)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_04)}
            disabled={executando}
          >
            P1-04 (linha inválida)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_05)}
            disabled={executando}
          >
            P1-05 (bloqueio)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_06)}
            disabled={executando}
          >
            P1-06 (visita dividida)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_07)}
            disabled={executando}
          >
            P1-07 (leitura parcial)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP1_08)}
            disabled={executando}
          >
            P1-08 (namespaces)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_07)}
            disabled={executando}
          >
            P2-07 (importar tabela)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_08)}
            disabled={executando}
          >
            P2-08 (reimport + aprovar)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_01, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-01 (2 coroas)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_02, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-02 (4 coroas)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_03, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-03 (dentista B)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_04, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-04 (sem regra)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_05, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-05 (agrupar/validar)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_05b, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-05b (desvio/motivo)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP2_06, 'SPEC-1-002')}
            disabled={executando}
          >
            P2-06 (conciliação)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_01, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-01 (código → campanha)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_02, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-02 (sem código)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_03, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-03 (duplicado)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_04, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-04 (pendência)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_05, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-05 (agendado)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_06, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-06 (revisão)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_11, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-11 (sem plano)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_09a, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-09a (ficha: evento + prazo)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP3_09b, 'SPEC-1-003')}
            disabled={executando}
          >
            P3-09b (dentista sem acesso)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_01, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-01 (lista do dia)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_02, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-02 (exportação)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_03, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-03 (resposta)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_03b, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-03b (lista de ligação)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_04, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-04 (recusa silêncio)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_05, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-05 (corte 17h)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_06, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-06 (conciliação)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_12, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-12 (leitura parcial)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_07, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-07 (capacidade)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_13, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-13 (Leonel 5)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_14, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-14 (Wesley 20)
          </Button>
          <Button
            variant="outline"
            onClick={() => void executar(executarProvaP4_15, 'SPEC-1-004')}
            disabled={executando}
          >
            P4-15 (Erika 2/sáb)
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={limpando || execucoes.length === 0}>
                {limpando ? 'Limpando…' : 'Limpar execuções'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar execuções de provas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os {execucoes.length} registros de execução (SPEC-1-001 e SPEC-1-004) serão
                  apagados. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={limpar}>Limpar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {ultimo && (
        <Card
          className={
            ultimo.passou
              ? 'border-2 border-green-600 bg-green-50'
              : 'border-2 border-destructive bg-red-50'
          }
        >
          <CardContent className="py-4">
            <p
              className={`text-base font-bold ${
                ultimo.passou ? 'text-green-800' : 'text-destructive'
              }`}
            >
              {ultimo.passou ? '✓ PASSOU — ' : '✗ FALHOU — '}
              {ultimo.cenario}
            </p>
            <p className="mt-1 text-sm">Esperado: {ultimo.esperado}</p>
            <p className="text-sm">Obtido: {ultimo.obtido}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execuções registradas</CardTitle>
          <CardDescription>
            {execucoes.length > 0
              ? `${execucoes.length} execução(ões) registradas (SPEC-1-001, SPEC-1-002 e SPEC-1-004).`
              : 'Nenhuma execução ainda.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : execucoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma execução ainda. Use “Executar prova P1-01” para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cenário</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="hidden md:table-cell">Esperado × obtido</TableHead>
                  <TableHead className="hidden lg:table-cell">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execucoes.map((execucao) => (
                  <TableRow key={execucao.id}>
                    <TableCell className="font-medium">{execucao.cenario}</TableCell>
                    <TableCell>
                      {execucao.passou ? (
                        <Badge>
                          <span aria-hidden>✓</span> Passou
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <span aria-hidden>✗</span> Falhou
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-md">
                      <p className="text-xs text-muted-foreground">Esperado: {execucao.esperado}</p>
                      <p className="text-xs">Obtido: {execucao.obtido}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {execucao.executado_em
                        ? new Date(execucao.executado_em).toLocaleString('pt-BR')
                        : '—'}
                      {usuario?.email ? ` · ${execucao.executado_por || usuario.email}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Provas
