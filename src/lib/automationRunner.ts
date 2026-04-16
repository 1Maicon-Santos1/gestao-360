// ─── Automation Runner ────────────────────────────────────────────────
// Fetches financial data from Supabase, builds messages, sends to WhatsApp.
// All state (rules + runs) stored in localStorage — no SQL migration needed.
// ─────────────────────────────────────────────────────────────────────

import { format, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from './supabase'
import { FIXED_USER_ID } from './constants'
import { sendWhatsAppText, getWppConfig } from './whatsapp'
import { formatCurrency } from './formatters'
import {
  getRules, updateRule, appendRun, computeNextRunAt,
  type AutomationRule, type AutomationRun,
} from '@/hooks/useAutomations'

// ─── Helpers ──────────────────────────────────────────────────────────

function stamp() { return format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) }
function monthLabel() {
  const m = format(new Date(), 'MMMM', { locale: ptBR })
  return `${m[0].toUpperCase()}${m.slice(1)}/${format(new Date(), 'yyyy')}`
}

// ─── Data fetchers ────────────────────────────────────────────────────

async function fetchData() {
  const now = new Date()
  const ms  = format(startOfMonth(now), 'yyyy-MM-dd')
  const me  = format(endOfMonth(now), 'yyyy-MM-dd')

  const [accRes, txRes, upRes] = await Promise.all([
    supabase.from('financial_accounts').select('name,current_balance,color,context_type,is_active').eq('user_id', FIXED_USER_ID).eq('is_active', true),
    supabase.from('financial_transactions').select('transaction_type,status,amount,context_type,due_date,description,competency_date,id').eq('user_id', FIXED_USER_ID).eq('is_deleted', false).gte('competency_date', ms).lte('competency_date', me),
    supabase.from('financial_transactions').select('id,description,amount,due_date,competency_date,status,transaction_type').eq('user_id', FIXED_USER_ID).eq('is_deleted', false).in('status', ['pending', 'overdue']).order('due_date', { ascending: true }).limit(30),
  ])

  if (accRes.error) throw new Error(`Contas: ${accRes.error.message}`)
  if (txRes.error)  throw new Error(`Transações: ${txRes.error.message}`)
  return { accounts: accRes.data ?? [], transactions: txRes.data ?? [], upcoming: upRes.data ?? [] }
}

async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('id,name,status,total_received').eq('user_id', FIXED_USER_ID).eq('status', 'active').order('name', { ascending: true })
  if (error) throw new Error(`Clientes: ${error.message}`)
  return data ?? []
}

// ─── Message builders ─────────────────────────────────────────────────

function buildDaily(accounts: any[], transactions: any[], upcoming: any[], clients: any[], cfg: Record<string, any>, pjName: string): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  const total = accounts.reduce((s: number, a: any) => s + (a.current_balance || 0), 0)
  const personal = accounts.filter((a: any) => a.context_type === 'personal').reduce((s: number, a: any) => s + (a.current_balance || 0), 0)
  const business = accounts.filter((a: any) => a.context_type === 'business').reduce((s: number, a: any) => s + (a.current_balance || 0), 0)
  const settled = transactions.filter((t: any) => ['paid', 'received'].includes(t.status))
  const income  = settled.filter((t: any) => t.transaction_type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const expense = settled.filter((t: any) => t.transaction_type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)
  const profit  = income - expense
  const pending = transactions.filter((t: any) => t.status === 'pending')
  const recv    = pending.filter((t: any) => t.transaction_type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const pay     = pending.filter((t: any) => t.transaction_type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)
  const ovRecv  = upcoming.filter((t: any) => t.transaction_type === 'income'  && t.due_date && t.due_date < today).reduce((s: number, t: any) => s + t.amount, 0)
  const ovPay   = upcoming.filter((t: any) => t.transaction_type === 'expense' && t.due_date && t.due_date < today).reduce((s: number, t: any) => s + t.amount, 0)
  const pjAcc   = accounts.find((a: any) => a.name.toLowerCase().includes((pjName || 'PJ').toLowerCase()))
  const pjBal   = pjAcc ? pjAcc.current_balance : business
  const weekday = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })

  const L: string[] = [`📊 *Gestão 360 | Resumo Diário*`, `_${weekday}_`, '']

  if (cfg.include_balance !== false) {
    L.push(`💰 *Saldo total:* ${formatCurrency(total)}`)
    if (personal !== 0) L.push(`  • Pessoal: ${formatCurrency(personal)}`)
    if (business !== 0) L.push(`  • Empresa: ${formatCurrency(business)}`)
    L.push('')
  }
  if (cfg.include_pj !== false && pjAcc) { L.push(`💼 *Caixa PJ (${pjAcc.name}):* ${formatCurrency(pjBal)}`); L.push('') }
  if (cfg.include_cashflow !== false) {
    L.push(`📈 *${monthLabel()}*`)
    L.push(`  Entradas: ${formatCurrency(income)}`)
    L.push(`  Saídas:   ${formatCurrency(expense)}`)
    L.push(`  ${profit >= 0 ? '✅' : '⚠️'} Resultado: *${formatCurrency(profit)}*`)
    L.push('')
  }
  if (cfg.include_pending !== false) { L.push(`📋 *Pendentes*`); L.push(`  A receber: ${formatCurrency(recv)}`); L.push(`  A pagar:   ${formatCurrency(pay)}`); L.push('') }
  if (cfg.include_overdue !== false && (ovRecv > 0 || ovPay > 0)) {
    L.push(`🚨 *Em atraso*`)
    if (ovRecv > 0) L.push(`  Receber: ${formatCurrency(ovRecv)}`)
    if (ovPay  > 0) L.push(`  Pagar:   ${formatCurrency(ovPay)}`)
    L.push('')
  }
  if (cfg.include_upcoming !== false) {
    const items = upcoming.filter((t: any) => t.due_date && t.due_date >= today).slice(0, cfg.max_items || 5)
    if (items.length > 0) {
      L.push(`📅 *Próximos vencimentos*`)
      items.forEach((t: any) => {
        const d = format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })
        L.push(`  ${t.transaction_type === 'income' ? '↗️' : '↙️'} ${d} — ${t.description} — ${formatCurrency(t.amount)}`)
      })
      L.push('')
    }
  }
  L.push(`_Gerado em ${stamp()}_`)
  return L.join('\n')
}

function buildWeekly(accounts: any[], transactions: any[], upcoming: any[], clients: any[], cfg: Record<string, any>): string {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const settled = transactions.filter((t: any) => ['paid', 'received'].includes(t.status))
  const income  = settled.filter((t: any) => t.transaction_type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const expense = settled.filter((t: any) => t.transaction_type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)
  const profit  = income - expense
  const ovRecv  = upcoming.filter((t: any) => t.transaction_type === 'income'  && t.due_date && t.due_date < today).reduce((s: number, t: any) => s + t.amount, 0)
  const ovPay   = upcoming.filter((t: any) => t.transaction_type === 'expense' && t.due_date && t.due_date < today).reduce((s: number, t: any) => s + t.amount, 0)
  const upRecv  = upcoming.filter((t: any) => t.transaction_type === 'income'  && t.due_date >= today)
  const upPay   = upcoming.filter((t: any) => t.transaction_type === 'expense' && t.due_date >= today)

  const L: string[] = [`📊 *Gestão 360 | Resumo Semanal*`, `_${monthLabel()}_`, '']
  if (cfg.include_result !== false) {
    L.push(`📈 *Resultado do mês*`)
    L.push(`  Entradas: ${formatCurrency(income)}`)
    L.push(`  Saídas:   ${formatCurrency(expense)}`)
    L.push(`  ${profit >= 0 ? '✅' : '⚠️'} Resultado: *${formatCurrency(profit)}*`)
    L.push('')
  }
  if (cfg.include_top_clients !== false && clients.length > 0) {
    L.push(`👥 *Clientes ativos:* ${clients.length}`)
    clients.slice(0, 3).forEach((c: any) => L.push(`  • ${c.name}`))
    if (clients.length > 3) L.push(`  _...e mais ${clients.length - 3}_`)
    L.push('')
  }
  if (cfg.include_receivables !== false && upRecv.length > 0) {
    L.push(`📥 *A receber (próximos)*`)
    upRecv.slice(0, 5).forEach((t: any) => {
      const d = t.due_date ? format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR }) : '—'
      L.push(`  • ${d} — ${t.description} — ${formatCurrency(t.amount)}`)
    })
    L.push('')
  }
  if (cfg.include_payables !== false && upPay.length > 0) {
    L.push(`📤 *A pagar (próximos)*`)
    upPay.slice(0, 5).forEach((t: any) => {
      const d = t.due_date ? format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR }) : '—'
      L.push(`  • ${d} — ${t.description} — ${formatCurrency(t.amount)}`)
    })
    L.push('')
  }
  if (cfg.include_overdue !== false && (ovRecv > 0 || ovPay > 0)) {
    L.push(`🚨 *Em atraso*`)
    if (ovRecv > 0) L.push(`  Receber: ${formatCurrency(ovRecv)}`)
    if (ovPay  > 0) L.push(`  Pagar:   ${formatCurrency(ovPay)}`)
    L.push('')
  }
  L.push(`_Gerado em ${stamp()}_`)
  return L.join('\n')
}

function buildAlerts(upcoming: any[], cfg: Record<string, any>): string | null {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const cutoff  = format(addDays(new Date(), cfg.days_before || 3), 'yyyy-MM-dd')
  const max     = cfg.max_items || 10
  const ovPay   = cfg.include_payables    !== false ? upcoming.filter((t: any) => t.transaction_type === 'expense' && t.due_date && t.due_date < today)   : []
  const ovRecv  = cfg.include_receivables !== false ? upcoming.filter((t: any) => t.transaction_type === 'income'  && t.due_date && t.due_date < today)   : []
  const fuPay   = cfg.include_payables    !== false ? upcoming.filter((t: any) => t.transaction_type === 'expense' && t.due_date >= today && t.due_date <= cutoff) : []
  const fuRecv  = cfg.include_receivables !== false ? upcoming.filter((t: any) => t.transaction_type === 'income'  && t.due_date >= today && t.due_date <= cutoff) : []
  const hasAny  = ovPay.length + ovRecv.length + fuPay.length + fuRecv.length > 0

  if (!hasAny && cfg.only_if_items !== false) return null
  if (!hasAny) return [`📅 *Gestão 360 | Alertas de Vencimento*`, '', '✅ Nenhum vencimento próximo.', '', `_Verificado em ${stamp()}_`].join('\n')

  const L: string[] = [`📅 *Gestão 360 | Alertas de Vencimento*`, '']
  if (cfg.include_upcoming_in_alert !== false && (fuPay.length + fuRecv.length) > 0) {
    L.push(`⏰ *Próximos (${cfg.days_before || 3} dias)*`)
    ;[...fuPay, ...fuRecv].sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, max).forEach((t: any) => {
      const d = format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })
      L.push(`  ${t.transaction_type === 'income' ? '↗️' : '↙️'} ${d} — ${t.description} — ${formatCurrency(t.amount)}`)
    })
    L.push('')
  }
  if (cfg.include_overdue !== false && (ovPay.length + ovRecv.length) > 0) {
    L.push(`🚨 *Em atraso*`)
    ;[...ovPay, ...ovRecv].sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, max).forEach((t: any) => {
      const d = t.due_date ? format(new Date(t.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR }) : '?'
      L.push(`  ${t.transaction_type === 'income' ? '↗️' : '↙️'} ${d} — ${t.description} — ${formatCurrency(t.amount)}`)
    })
    L.push('')
  }
  L.push(`_Verificado em ${stamp()}_`)
  return L.join('\n')
}

// ─── Execute ──────────────────────────────────────────────────────────

export interface RunResult { success: boolean; message: string; skipped?: boolean; error?: string }

export async function executeAutomation(rule: AutomationRule, triggerSource: 'manual' | 'scheduler' = 'manual'): Promise<RunResult> {
  const startedAt = new Date()
  const runId     = crypto.randomUUID()

  const finish = (
    status: 'success' | 'error',
    payload: string,
    response: string,
    errorMsg?: string,
  ) => {
    const finished = new Date()
    const run: AutomationRun = {
      id: runId, automation_id: rule.id, trigger_source: triggerSource, status,
      started_at: startedAt.toISOString(), finished_at: finished.toISOString(),
      duration_ms: finished.getTime() - startedAt.getTime(),
      payload_summary: payload || null, response_summary: response || null,
      error_message: errorMsg || null, created_at: startedAt.toISOString(),
    }
    appendRun(run)
    updateRule(rule.id, {
      last_run_at: finished.toISOString(), last_status: status,
      last_error: errorMsg || null, run_count: rule.run_count + 1,
      next_run_at: rule.enabled ? computeNextRunAt(rule) : null,
    })
  }

  try {
    const wppCfg = getWppConfig()
    if (!wppCfg) throw new Error('WhatsApp não configurado. Configure na aba WhatsApp API.')

    if (rule.automation_type === 'command_parser') {
      finish('success', 'Parser ativo', 'Sem envio de mensagem')
      return { success: true, message: 'Parser de comandos ativo.' }
    }

    const { accounts, transactions, upcoming } = await fetchData()
    const clients = await fetchClients()
    const cfg     = rule.config_json || {}
    const pjName  = wppCfg.pj_account_name || 'PJ'
    const groupName = rule.destination_group_name || wppCfg.group_name || rule.destination_group_jid || wppCfg.group_jid || ''

    let message: string | null = null
    let payloadSummary         = ''

    if (rule.automation_type === 'daily_summary') {
      message        = buildDaily(accounts, transactions, upcoming, clients, cfg, pjName)
      payloadSummary = `${accounts.length} contas · ${transactions.length} transações · ${upcoming.length} pendentes`
    } else if (rule.automation_type === 'weekly_summary') {
      message        = buildWeekly(accounts, transactions, upcoming, clients, cfg)
      payloadSummary = `${monthLabel()} · ${clients.length} clientes ativos`
    } else if (rule.automation_type === 'due_alerts') {
      message        = buildAlerts(upcoming, cfg)
      payloadSummary = `${upcoming.length} itens verificados`
    }

    if (message === null) {
      finish('success', payloadSummary, 'Nenhum item — envio ignorado')
      return { success: true, skipped: true, message: 'Sem vencimentos. Envio ignorado.' }
    }

    await sendWhatsAppText(rule.automation_type, `🤖 ${rule.name}`, message)
    finish('success', payloadSummary, `Enviado ao grupo ${groupName}`)
    return { success: true, message }
  } catch (err: any) {
    const errMsg = err?.message ?? 'Erro desconhecido'
    finish('error', '', '', errMsg)
    return { success: false, message: '', error: errMsg }
  }
}

// ─── Scheduler (client-side) ──────────────────────────────────────────
// Runs while the browser tab is open. For server-side, deploy Edge Function.

export async function runPendingAutomations(): Promise<number> {
  const now   = new Date().toISOString()
  const rules = getRules().filter(r => r.enabled && r.next_run_at && r.next_run_at <= now)
  let count   = 0
  for (const rule of rules) {
    try { await executeAutomation(rule, 'scheduler'); count++ } catch {}
  }
  return count
}
