# Patch da tela Planejar.tsx — seção agrupada + validar (rascunho 6d5de2f5)

## 1. Imports — acrescentar
```tsx
import { toast } from 'sonner'
import { agruparSemRegra, validarCombinacao, type GrupoSemRegra } from '@/services/planejamento'
```
(AlertDialog: acrescentar `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` de '@/components/ui/alert-dialog'.)

## 2. Estado novo (junto dos outros useState)
```tsx
const [validando, setValidando] = useState('')
```

## 3. Handler novo (após `consultar`)
```tsx
const validar = async (g: GrupoSemRegra) => {
  setValidando(g.chave)
  try {
    await validarCombinacao(g.ids)
    toast.success('Combinação marcada como validada.')
    const todos = await listarPlanejamentos()
    setCasosSemRegra(todos.filter((p) => p.situacao === 'sem_regra'))
  } catch {
    toast.error('Não foi possível validar. Tente novamente.')
  } finally {
    setValidando('')
  }
}
```

## 4. Card "Casos sem regra" — trocar a `<ul>` pelo agrupamento
```tsx
const gruposSemRegra = agruparSemRegra(casosSemRegra)
```
Render (no lugar da lista atual):
```tsx
{gruposSemRegra.length === 0 ? (
  <p className="text-sm text-muted-foreground">Nenhum caso sem regra até agora.</p>
) : (
  <ul className="space-y-2 text-sm">
    {gruposSemRegra.map((g) => (
      <li key={g.chave} className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {g.descricao}
          {g.profissional ? ` · ${g.profissional}` : ''} ·{' '}
          <Badge variant="secondary">{g.ocorrencias === 1 ? '1 ocorrência' : `${g.ocorrencias} ocorrências`}</Badge>{' '}
          · última {new Date(g.ultima).toLocaleString('pt-BR')}
        </span>
        {usuario?.papel === 'gestao' && (
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
                  {g.profissional ? ` · ${g.profissional}` : ''}" saem da lista de pendentes e ficam
                  no histórico com seu nome e a data. O motor continua exigindo regra cadastrada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void validar(g)}>Validar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </li>
    ))}
  </ul>
)}
```
- Remover a função local `descreverItens` do fim do arquivo e importar do serviço.
- `usuario?.papel` — conferir o campo no AuthContext (se não existir, usar o mesmo critério das outras telas de gestão).
- Permissão real no servidor: updateRule da coleção já é só gestão — esconder botão é só UX.

## 5. Ficha de tela (resumo)
- Quem usa: gestão, no computador e no celular.
- Ação primária: "Marcar como validado" (com confirmação).
- Estados: vazio ("Nenhum caso sem regra"), sucesso (toast + lista recarrega), erro (toast), carregando (herda da tela).
- Celular: lista empilha (flex-wrap), alvos de toque do Button padrão.
- Acessibilidade: AlertDialog com título/descrição; badge com TEXTO (não só cor).
