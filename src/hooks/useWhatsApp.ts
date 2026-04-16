import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sendWhatsAppText, getWppConfig, validateConfig } from '@/lib/whatsapp'
import {
  buildTestMessage,
  buildBalanceMessage,
  buildPJCashMessage,
  buildCashFlowMessage,
  buildActiveClientsMessage,
  buildUpcomingDuesMessage,
  buildFullSummaryMessage,
} from '@/lib/summaryBuilder'
import { useDashboard } from './useDashboard'
import { useClients } from './useClients'

function useSend(type: string, label: string, build: () => string) {
  return useMutation({
    mutationFn: async () => {
      const msg = build()
      await sendWhatsAppText(type, label, msg)
      return msg
    },
    onSuccess: () => toast.success(`${label} enviado para o grupo!`),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useWhatsApp() {
  const { data: dash } = useDashboard()
  const { data: clients } = useClients()
  const config = getWppConfig()
  const pjName = config?.pj_account_name || 'PJ'

  const ready = {
    dash: !!dash,
    clients: !!clients,
  }

  const sendTest = useSend('test', '✅ Teste', buildTestMessage)

  const sendBalance = useSend('balance', '💰 Saldo', () => {
    if (!dash) throw new Error('Dados do dashboard ainda carregando.')
    return buildBalanceMessage(dash)
  })

  const sendPJCash = useSend('pj_cash', '💼 Caixa PJ', () => {
    if (!dash) throw new Error('Dados do dashboard ainda carregando.')
    return buildPJCashMessage(dash, pjName)
  })

  const sendCashFlow = useSend('cash_flow', '📈 Fluxo de Caixa', () => {
    if (!dash) throw new Error('Dados do dashboard ainda carregando.')
    return buildCashFlowMessage(dash)
  })

  const sendActiveClients = useSend('clients', '👥 Clientes', () => {
    if (!clients) throw new Error('Dados de clientes ainda carregando.')
    return buildActiveClientsMessage(clients)
  })

  const sendUpcomingDues = useSend('dues', '📅 Vencimentos', () => {
    if (!dash) throw new Error('Dados do dashboard ainda carregando.')
    return buildUpcomingDuesMessage(dash)
  })

  const sendFullSummary = useSend('summary', '📌 Resumo Geral', () => {
    if (!dash || !clients) throw new Error('Dados ainda carregando. Aguarde.')
    return buildFullSummaryMessage(dash, clients, pjName)
  })

  return {
    config,
    isConfigured: validateConfig(config).valid,
    ready,
    sendTest,
    sendBalance,
    sendPJCash,
    sendCashFlow,
    sendActiveClients,
    sendUpcomingDues,
    sendFullSummary,
  }
}
