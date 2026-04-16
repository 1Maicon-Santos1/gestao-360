// ─── useAutomations ───────────────────────────────────────────────────
// Stores automation rules and run history in localStorage.
// No SQL migration needed — works immediately out of the box.
// ─────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// ─── Storage keys ─────────────────────────────────────────────────────
export const AUTOMATION_RULES_KEY = 'fh_automation_rules'
export const AUTOMATION_RUNS_KEY  = 'fh_automation_runs'

// ─── Types ────────────────────────────────────────────────────────────

export type AutomationType = 'daily_summary' | 'weekly_summary' | 'due_alerts' | 'command_parser'
export type FrequencyType  = 'manual' | 'daily' | 'weekly' | 'monthly' | 'custom'
export type RunStatus      = 'running' | 'success' | 'error'

export interface AutomationRule {
  id:                     string
  name:                   string
  automation_type:        AutomationType
  enabled:                boolean
  channel:                string
  destination_group_jid:  string | null
  destination_group_name: string | null
  timezone:               string
  frequency:              FrequencyType
  scheduled_time:         string        // 'HH:MM'
  scheduled_day_of_week:  number | null // 0=Sun … 6=Sat
  scheduled_day_of_month: number | null // 1-31
  config_json:            Record<string, any>
  next_run_at:            string | null
  last_run_at:            string | null
  last_status:            RunStatus | null
  last_error:             string | null
  run_count:              number
  created_at:             string
  updated_at:             string
}

export interface AutomationRun {
  id:               string
  automation_id:    string
  trigger_source:   'manual' | 'scheduler'
  status:           RunStatus
  started_at:       string
  finished_at:      string | null
  duration_ms:      number | null
  payload_summary:  string | null
  response_summary: string | null
  error_message:    string | null
  created_at:       string
}

// ─── Meta ─────────────────────────────────────────────────────────────

export const AUTOMATION_META: Record<AutomationType, {
  label: string; description: string; emoji: string
  frequency: FrequencyType; time: string; dayOfWeek?: number
}> = {
  daily_summary:  { label: 'Resumo diário',         description: 'Resumo financeiro enviado automaticamente ao grupo',    emoji: '📊', frequency: 'daily',  time: '20:00' },
  weekly_summary: { label: 'Resumo semanal',         description: 'Visão gerencial toda segunda-feira',                   emoji: '📅', frequency: 'weekly', time: '08:00', dayOfWeek: 1 },
  due_alerts:     { label: 'Alertas de vencimento',  description: 'Notifica contas prestes a vencer ou em atraso',        emoji: '⏰', frequency: 'daily',  time: '09:00' },
  command_parser: { label: 'Parser de comandos',     description: 'Recebe mensagens do grupo e registra transações',      emoji: '🤖', frequency: 'manual', time: '00:00' },
}

export const AUTOMATION_CONFIG_DEFAULTS: Record<AutomationType, Record<string, any>> = {
  daily_summary:  { include_balance: true, include_pj: true, include_cashflow: true, include_pending: true, include_overdue: true, include_upcoming: true, max_items: 5 },
  weekly_summary: { include_result: true, include_top_clients: true, include_receivables: true, include_payables: true, include_overdue: true },
  due_alerts:     { days_before: 3, include_payables: true, include_receivables: true, include_overdue: true, include_upcoming_in_alert: true, max_items: 10, only_if_items: true },
  command_parser: { accept_text: true, accept_audio: false, reply_in_group: true, require_confirmation: true, save_logs: true, monitored_group_jid: '' },
}

// ─── next_run_at ──────────────────────────────────────────────────────

export function computeNextRunAt(rule: Pick<AutomationRule,
  'frequency' | 'scheduled_time' | 'scheduled_day_of_week' | 'scheduled_day_of_month' | 'config_json'
>): string | null {
  if (rule.frequency === 'manual') return null

  const now = new Date()
  const [h, m] = (rule.scheduled_time || '20:00').split(':').map(Number)
  let c = new Date(now); c.setHours(h, m, 0, 0)

  if (rule.frequency === 'daily') {
    if (c <= now) c.setDate(c.getDate() + 1)
    return c.toISOString()
  }

  if (rule.frequency === 'weekly') {
    const target = rule.scheduled_day_of_week ?? 1
    for (let i = 0; i <= 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(h, m, 0, 0)
      if (d.getDay() === target && d > now) return d.toISOString()
    }
  }

  if (rule.frequency === 'monthly') {
    const dom = rule.scheduled_day_of_month ?? 1
    c = new Date(now.getFullYear(), now.getMonth(), dom, h, m, 0, 0)
    if (c <= now) c.setMonth(c.getMonth() + 1)
    return c.toISOString()
  }

  if (rule.frequency === 'custom') {
    const cfg        = (rule as any).config_json ?? {}
    const customType = cfg.custom_type || 'interval'

    // ── Intervalo fixo: a cada N horas ────────────────────────────────
    if (customType === 'interval') {
      const hours = Number(cfg.custom_interval_hours) || 24
      return new Date(now.getTime() + hours * 3_600_000).toISOString()
    }

    // ── Dias específicos da semana ────────────────────────────────────
    if (customType === 'specific_days') {
      const selected: number[] = Array.isArray(cfg.custom_days) ? cfg.custom_days : [1]
      if (selected.length === 0) return null
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(h, m, 0, 0)
        if (selected.includes(d.getDay()) && d > now) return d.toISOString()
      }
    }
  }

  return null
}

// ─── localStorage helpers ─────────────────────────────────────────────

export function getRules(): AutomationRule[] {
  try { return JSON.parse(localStorage.getItem(AUTOMATION_RULES_KEY) || '[]') } catch { return [] }
}

export function saveRules(rules: AutomationRule[]): void {
  localStorage.setItem(AUTOMATION_RULES_KEY, JSON.stringify(rules))
}

export function getRuns(): AutomationRun[] {
  try { return JSON.parse(localStorage.getItem(AUTOMATION_RUNS_KEY) || '[]') } catch { return [] }
}

export function saveRuns(runs: AutomationRun[]): void {
  localStorage.setItem(AUTOMATION_RUNS_KEY, JSON.stringify(runs.slice(0, 200)))
}

export function appendRun(run: AutomationRun): void {
  saveRuns([run, ...getRuns()])
}

// ─── Hooks ────────────────────────────────────────────────────────────

/** Returns all rules and a reload trigger */
export function useAutomations() {
  const [rules, setRules] = useState<AutomationRule[]>(() => getRules())
  const reload = useCallback(() => setRules(getRules()), [])
  return { rules, reload }
}

/** Returns runs for one automation */
export function useAutomationRuns(automationId: string | null) {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const reload = useCallback(() => {
    if (!automationId) { setRuns([]); return }
    setRuns(getRuns().filter(r => r.automation_id === automationId))
  }, [automationId])
  return { runs, reload }
}

// ─── Mutations (direct, no React Query) ──────────────────────────────

export function createRule(
  input: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'run_count' | 'last_run_at' | 'last_status' | 'last_error'>
): AutomationRule {
  const now = new Date().toISOString()
  const rule: AutomationRule = {
    ...input,
    id:         crypto.randomUUID(),
    run_count:  0,
    last_run_at:  null,
    last_status:  null,
    last_error:   null,
    created_at: now,
    updated_at: now,
  }
  saveRules([...getRules(), rule])
  return rule
}

export function updateRule(id: string, updates: Partial<AutomationRule>): void {
  saveRules(getRules().map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
}

export function deleteRule(id: string): void {
  saveRules(getRules().filter(r => r.id !== id))
}

export function toggleRule(id: string, enabled: boolean): void {
  saveRules(getRules().map(r => {
    if (r.id !== id) return r
    const next_run_at = enabled ? computeNextRunAt(r) : null
    return { ...r, enabled, next_run_at, updated_at: new Date().toISOString() }
  }))
}
