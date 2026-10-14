import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth, sairDaConta } from '@/contexts/AuthContext'
import { rotuloPapel } from '@/services/auth'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { usuario, eGestao } = useAuth()
  const local = useLocation()

  const itens: Array<{ para: string; rotulo: string; visivel: boolean }> = [
    { para: '/', rotulo: 'Início', visivel: true },
    { para: '/agenda', rotulo: 'Agenda', visivel: true },
    { para: '/planejar', rotulo: 'Planejar agendamento', visivel: true },
    { para: '/horarios', rotulo: 'Horários', visivel: eGestao },
    { para: '/tabela-duracao', rotulo: 'Tabela de duração', visivel: eGestao },
    { para: '/importar', rotulo: 'Importar', visivel: eGestao },
    { para: '/provas', rotulo: 'Provas', visivel: eGestao },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Lai</span>
            <nav aria-label="Menu principal" className="flex items-center gap-1">
              {itens
                .filter((item) => item.visivel)
                .map((item) => (
                  <Link
                    key={item.para}
                    to={item.para}
                    aria-current={
                      (
                        item.para === '/'
                          ? local.pathname === '/'
                          : local.pathname.startsWith(item.para)
                      )
                        ? 'page'
                        : undefined
                    }
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm hover:bg-accent',
                      (
                        item.para === '/'
                          ? local.pathname === '/'
                          : local.pathname.startsWith(item.para)
                      )
                        ? 'bg-accent font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    {item.rotulo}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground">
              {usuario?.email} · {rotuloPapel(usuario?.papel ?? '')}
            </span>
            <Button variant="ghost" size="sm" onClick={sairDaConta}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
