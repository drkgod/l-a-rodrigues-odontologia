// Emenda CA-SEQ-01 — tela de avaliadores habilitados (gestão designa quem valida
// o planejamento clínico). A atribuição POR PACIENTE fica na ficha do paciente.
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { alternarHabilitacao, listarDentistas, type AvaliadorHabilitado } from '@/services/tratamento'

const Avaliadores = () => {
  const [dentistas, setDentistas] = useState<AvaliadorHabilitado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [trabalhando, setTrabalhando] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setDentistas(await listarDentistas())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dentistas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const alternar = async (d: AvaliadorHabilitado) => {
    setTrabalhando(d.id)
    setErro('')
    try {
      await alternarHabilitacao(d.id, !d.avaliador_habilitado)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível alterar a habilitação.')
    } finally {
      setTrabalhando('')
    }
  }

  const habilitados = dentistas.filter((d) => d.avaliador_habilitado && d.ativo).length

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Avaliadores habilitados</h1>
        <p className="text-sm text-muted-foreground">
          Só quem está habilitado pode validar o planejamento clínico — e só nos pacientes
          atribuídos a ele. A atribuição por paciente fica na ficha.
        </p>
      </div>
      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dentistas ({habilitados} habilitado(s))</CardTitle>
          <CardDescription>Alterne a habilitação de cada dentista da unidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : dentistas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dentista cadastrado ainda. Cadastre o usuário com função Dentista (gestão).
            </p>
          ) : (
            <ul className="space-y-2">
              {dentistas.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{d.name || d.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.email}
                      {!d.ativo && ' · inativo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.avaliador_habilitado ? (
                      <Badge>
                        <span aria-hidden>✓</span> Habilitado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Não habilitado</Badge>
                    )}
                    <Switch
                      checked={d.avaliador_habilitado}
                      onCheckedChange={() => void alternar(d)}
                      disabled={trabalhando === d.id}
                      aria-label={'Habilitar avaliador ' + (d.name || d.email)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Avaliadores
