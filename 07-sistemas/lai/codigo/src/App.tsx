/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import SemAcesso from './pages/SemAcesso'
import Provas from './pages/Provas'
import Importar from './pages/Importar'
import Agenda from './pages/Agenda'
import TabelaDuracao from './pages/TabelaDuracao'
import Planejar from './pages/Planejar'
import Horarios from './pages/Horarios'
import Layout from './components/Layout'
import { AuthProvider, Protegido, SomenteGestao } from '@/contexts/AuthContext'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sem-acesso" element={<SemAcesso />} />
          <Route
            element={
              <Protegido>
                <Layout />
              </Protegido>
            }
          >
            <Route path="/" element={<Index />} />
            <Route
              path="/provas"
              element={
                <SomenteGestao>
                  <Provas />
                </SomenteGestao>
              }
            />
            <Route
              path="/importar"
              element={
                <SomenteGestao>
                  <Importar />
                </SomenteGestao>
              }
            />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/planejar" element={<Planejar />} />
            <Route
              path="/horarios"
              element={
                <SomenteGestao>
                  <Horarios />
                </SomenteGestao>
              }
            />
            <Route
              path="/tabela-duracao"
              element={
                <SomenteGestao>
                  <TabelaDuracao />
                </SomenteGestao>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
