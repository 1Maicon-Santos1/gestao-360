// ─── Summary Builder ─────────────────────────────────────────────────
// Builds WhatsApp-ready text messages from real app data.
// Each function returns a formatted string ready to send to the group.
// ─────────────────────────────────────────────────────────────────────

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from './formatters'
import type { DashboardData } from '@/hooks/useDashboard'
import type { Client } from '@/hooks/useClients'

function stamp(): string {
  return format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function monthLabel(): string {
  const m = format(new Date(), 'MMMM', { locale: ptBR })
  const y = format(new Date(), 'yyyy')
  return `${m.charAt(0).toUpperCase()}${m.slice(1)}/${y}`
}

// ─── A) Teste ──────────────────────────────────────────────────────────
export function buildTestMessage(): string {
  return [
    '✅ *FinanceHub*',
    '',
    'Teste de envio realizado com sucesso.',
    `Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`,
    `Hora: ${format(new Date(), 'HH:mm', { locale: ptBR })}`,
  ].join('\n')
}

// ─── B) Saldo de hoje ─────────────────────────────────────────────────
export function buildBalanceMessage(data: DashboardData): string {
  const lines = [
    `💰 *FinanceHub | Saldo de hoje*`,
    '',
    `Saldo total: ${formatCurrency(data.totalBalance)}`,
  ]
  if (data.personalBalance !== 0) lines.push(`  • Pessoal: ${formatCurrency(data.personalBalance)}`)
  if (data.businessBalance !== 0) lines.push(`  • Empresa: ${formatCurrency(data.businessBalance)}`)
  lines.push('', `_Atualizado em ${stamp()}_`)
  return lines.join('\n')
}

// ─── C) Caixinha PJ ───────────────────────────────────────────────────
export function buildPJCashMessage(data: DashboardData, pjAccountName: string): string {
  const keyword = (pjAccountName || 'PJ').toLowerCase()
  const pjAccount = data.accountBalances.find(a => a.name.toLowerCase().includes(keyword))
  const balance = pjAccount ? pjAccount.balance : data.businessBalance
  const label = pjAccount ? pjAccount.name : `Total empresa (conta PJ não encontrada: "${pjAccountName}")`

  return [
    `💼 *FinanceHub | Caixa PJ*`,
    '',
    `Conta: ${label}`,
    `Valor disponível: *${formatCurrency(balance)}*`,
    '',
    `_Atualizado em ${stamp()}_`,
  ].join('\n')
}

// ─── D) Fluxo de caixa ────────────────────────────────────────────────
export function buildCashFlowMessage(data: DashboardData): string {
  const result = data.monthProfit >= 0 ? '✅' : '⚠️'
  return [
    `📈 *FinanceHub | Fluxo de caixa*`,
    '',
    `Período: ${monthLabel()}`,
    `Entradas: ${formatCurrency(data.monthIncome)}`,
    `Saídas: ${formatCurrency(data.monthExpense)}`,
    `${result} Resultado: *${formatCurrency(data.monthProfit)}*`,
    '',
    `A receber (pendente): ${formatCurrency(data.totalReceivable)}`,
    `A pagar (pendente): ${formatCurrency(data.totalPayable)}`,
    ...(data.overdueReceivable > 0 ? [`⚠️ Em atraso (receber): ${formatCurrency(data.overdueReceivable)}`] : []),
    ...(data.overduePayable > 0 ? [`⚠️ Em atraso (pagar): ${formatCurrency(data.overduePayable)}`] : []),
    '',
    `_Atualizado em ${stamp()}_`,
  ].join('\n')
}

// ─── E) Clientes ativos ───────────────────────────────────────────────
export function buildActiveClientsMessage(clients: Client[]): string {
  const active = clients.filter(c => c.status === 'active')
  const list = active.slice(0, 10).map(c => `• ${c.name}`).join('\n')
  const extra = active.length > 10 ? `\n...e mais ${active.length - 10} cliente${active.length - 10 !== 1 ? 's' : ''}` : ''

  return [
    `👥 *FinanceHub | Clientes ativos*`,
    '',
    `Total: *${active.length}* cliente${active.length !== 1 ? 's' : ''}`,
    '',
    ...(active.length > 0 ? [list + extra] : ['Nenhum cliente ativo cadastrado.']),
    '',
    `_Atualizado em ${stamp()}_`,
  ].join('\n')
}

// ─── F) Vencimentos de clientes ───────────────────────────────────────
export function buildUpcomingDuesMessage(data: DashboardData): string {
  const receivables = data.upcomingReceivables.slice(0, 10)

  if (receivables.length === 0) {
    return [
      `📅 *FinanceHub | Próximos vencimentos*`,
      '',
      'Nenhum recebimento pendente nos próximos dias.',
      '',
      `_Atualizado em ${stamp()}_`,
    ].join('\n')
  }

  const list = receivables.map(t => {
    const date = t.due_date
      ? format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })
      : '—'
    return `• ${date} — ${t.description} — ${formatCurrency(t.amount)}`
  }).join('\n')

  return [
    `📅 *FinanceHub | Próximos vencimentos*`,
    '',
    list,
    '',
    `_Atualizado em ${stamp()}_`,
  ].join('\n')
}

// ─── G) Resumo geral completo ─────────────────────────────────────────
export function buildFullSummaryMessage(
  data: DashboardData,
  clients: Client[],
  pjAccountName: string,
): string {
  const active = clients.filter(c => c.status === 'active')
  const keyword = (pjAccountName || 'PJ').toLowerCase()
  const pjAccount = data.accountBalances.find(a => a.name.toLowerCase().includes(keyword))
  const pjBalance = pjAccount ? pjAccount.balance : data.businessBalance

  const nextDues = data.upcomingReceivables.slice(0, 5).map(t => {
    const date = t.due_date
      ? format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })
      : '—'
    return `  • ${date} — ${t.description} — ${formatCurrency(t.amount)}`
  })

  const resultIcon = data.monthProfit >= 0 ? '✅' : '⚠️'

  return [
    `📌 *FinanceHub | Resumo geral*`,
    '',
    `💰 Saldo total: *${formatCurrency(data.totalBalance)}*`,
    `💼 Caixa PJ: *${formatCurrency(pjBalance)}*`,
    '',
    `📈 *${monthLabel()}*`,
    `Entradas: ${formatCurrency(data.monthIncome)}`,
    `Saídas: ${formatCurrency(data.monthExpense)}`,
    `${resultIcon} Resultado: *${formatCurrency(data.monthProfit)}*`,
    '',
    `📋 *Pendentes*`,
    `A receber: ${formatCurrency(data.totalReceivable)}`,
    `A pagar: ${formatCurrency(data.totalPayable)}`,
    ...(data.overdueReceivable > 0 ? [`⚠️ Atrasados (receber): ${formatCurrency(data.overdueReceivable)}`] : []),
    ...(data.overduePayable > 0 ? [`⚠️ Atrasados (pagar): ${formatCurrency(data.overduePayable)}`] : []),
    '',
    `👥 Clientes ativos: *${active.length}*`,
    ...(nextDues.length > 0 ? ['', `📅 *Próximos vencimentos*`, ...nextDues] : []),
    '',
    `_Gerado em ${stamp()}_`,
  ].join('\n')
}
