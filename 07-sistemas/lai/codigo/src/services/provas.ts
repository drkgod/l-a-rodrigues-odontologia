import { BaseAuthStore } from 'pocketbase'
import PocketBase from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { aplicarLote, validarLote } from '@/services/agenda'
import { aprovarTabelaDuracao, importarTabelaDuracao } from '@/services/duracao'
import {
  agruparSemRegra,
  conciliarReservas,
  ligarReserva,
  limparPlanejamentosTeste,
  listarDesvios,
  revisarDesvio,
  registrarMotivoDesvio,
  sugerirDuracao,
  validarCombinacao,
  type Planejamento,
} from '@/services/planejamento'
import {
  importarPendencias,
  listarPendencias,
  montarLista,
  mudarEstadoPendencia,
  verificarAgendamentoFuturo,
  type Pendencia,
} from '@/services/pendencias'
import { criarLead } from '@/services/lead