// ─── AutomationsTab ───────────────────────────────────────────────────
// Full automation management UI.
// Rules + history stored in localStorage — zero SQL dependency.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Play, Settings, History, PowerOff, Trash2, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw,
  MessageCircle, CalendarDays, Bell, Bot, Info,
  Calendar, Zap,
} from 'lucide-react'
import { Button }            from '@/components/ui/button'
import { Switch }            from '@/components/ui/switch'
import { Badge }             from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator }         from '@/components/ui/separator'
import { Label }             from '@/components/ui/label'
import { Input }             from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn }            from '@/lib/utils'
import { getWppConfig }  from '@/lib/whatsapp'
import { executeAutomation, runPendingAutomations } from '@/lib/automationRunner'
import {
  useAutomations, useAutomationRuns,
  createRule, updateRule, deleteRule, toggleRule, computeNextRunAt,
  AUTOMATION_META, AUTOMATION_CONFIG_DEFAULTS,
  type AutomationRule, type AutomationRun, type AutomationType,
} from '@/hooks/useAutomations'

// ─── Icons / colours per type ─────────────────────────────────────────

const ICONS: Record<AutomationType, React.ElementType> = {
  daily_summary:  MessageCircle,
  weekly_summary: CalendarDays,
  due_alerts:     Bell,
  command_parser: Bot,
}

const COLORS: Record<AutomationType, string> = {
  daily_summary:  'bg-indigo-100 text-indigo-600',
  weekly_summary: 'bg-sky-100 text-sky-600',
  due_alerts:     'bg-amber-100 text-amber-600',
  command_parser: 'bg-emerald-100 text-emerald-600',
}

// ─── Helpers ──────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

function rel(iso: string | null) {
  if (!iso) return null
  return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true })
}

const DAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function scheduleLabel(r: AutomationRule) {
  if (r.frequency === 'manual') return 'Execução manual'
  const t   = r.scheduled_time || '00:00'
  if (r.frequency === 'daily')   return `Diário às ${t}`
  if (r.frequency === 'monthly') return `Dia ${r.scheduled_day_of_month} às ${t}`
  if (r.frequency === 'weekly')  return `${DAY_SHORT[r.scheduled_day_of_week ?? 1]} às ${t}`
  if (r.frequency === 'custom') {
    const cfg  = r.config_json ?? {}
    const type = cfg.custom_type || 'interval'
    if (type === 'interval') {
      const h = Number(cfg.custom_interval_hours) || 24
      if (h < 24)      return `A cada ${h}h`
      if (h % 168 === 0) return `A cada ${h / 168} semana${h / 168 !== 1 ? 's' : ''}`
      return `A cada ${Math.round(h / 24)} dia${Math.round(h / 24) !== 1 ? 's' : ''}`
    }
    if (type === 'specific_days') {
      const sel: number[] = cfg.custom_days || []
      return sel.length ? `${sel.map((d: number) => DAY_SHORT[d]).join(', ')} às ${t}` : `Personalizado às ${t}`
    }
  }
  return r.frequency
}

// ─── Status Badge ─────────────────────────────────────────────────────

function StatusBadge({ rule }: { rule: AutomationRule }) {
  if (!rule.enabled)
    return <Badge variant="secondary" className="text-xs gap-1"><PowerOff className="h-3 w-3" />Pausada</Badge>
  if (rule.last_status === 'error')
    return <Badge variant="outline" className="text-xs gap-1 text-red-600 border-red-300"><AlertTriangle className="h-3 w-3" />Erro</Badge>
  if (!rule.last_run_at)
    return <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300"><Clock className="h-3 w-3" />Ativa · nunca executou</Badge>
  return <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300"><CheckCircle2 className="h-3 w-3" />Ativa</Badge>
}

// ─── Automation Card ──────────────────────────────────────────────────

function AutomationCard({ type, rule, onConfigure, onHistory, onRefresh }: {
  type:        AutomationType
  rule:        AutomationRule | undefined
  onConfigure: (type: AutomationType, rule?: AutomationRule) => void
  onHistory:   (rule: AutomationRule) => void
  onRefresh:   () => void
}) {
  const meta    = AUTOMATION_META[type]
  const Icon    = ICONS[type]
  const [busy, setBusy] = useState(false)

  const handleRunNow = async () => {
    if (!rule) return
    setBusy(true)
    try {
      const r = await executeAutomation(rule, 'manual')
      if (r.success) {
        if (r.skipped) toast.info('Nenhum item encontrado — envio ignorado conforme configuração.')
        else           toast.success(`${meta.label} enviado com sucesso!`)
      } else {
        toast.error(r.error ?? 'Erro ao executar automação.')
      }
    } finally {
      setBusy(false)
      onRefresh()
    }
  }

  const handleToggle = (enabled: boolean) => {
    if (!rule) return
    toggleRule(rule.id, enabled)
    toast.success(enabled ? 'Automação ativada.' : 'Automação pausada.')
    onRefresh()
  }

  const handleDelete = () => {
    if (!rule) return
    deleteRule(rule.id)
    toast.success('Automação removida.')
    onRefresh()
  }

  return (
    <Card className={cn('transition-all', rule?.enabled && 'border-primary/20 bg-primary/[0.02]')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">

          {/* Icon */}
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', COLORS[type])}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{rule?.name || meta.label}</span>
              {rule  && <StatusBadge rule={rule} />}
              {!rule && <Badge variant="secondary" className="text-xs">Não configurado</Badge>}
            </div>

            <p className="text-xs text-muted-foreground">{meta.description}</p>

            {rule && (
              <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{scheduleLabel(rule)}
                </span>
                {rule.next_run_at && rule.enabled && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />Próx: {rel(rule.next_run_at)}
                  </span>
                )}
                {rule.last_run_at && (
                  <span className="flex items-center gap-1">
                    {rule.last_status === 'success'
                      ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                      : <XCircle className="h-3 w-3 text-red-500" />}
                    Última: {rel(rule.last_run_at)}
                    {rule.last_status === 'error' && rule.last_error &&
                      <span className="text-red-500 truncate max-w-[200px]"> — {rule.last_error.slice(0,60)}</span>}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {rule && (
              <Switch
                checked={rule.enabled}
                onCheckedChange={handleToggle}
                title={rule.enabled ? 'Pausar' : 'Ativar'}
              />
            )}

            {rule && (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={handleRunNow}
                disabled={busy || rule.automation_type === 'command_parser'}
                title="Executar agora">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {rule && (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => onHistory(rule)} title="Histórico">
                <History className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant={rule ? 'ghost' : 'outline'} size="icon" className="h-8 w-8"
              onClick={() => onConfigure(type, rule)} title="Configurar">
              <Settings className="h-4 w-4" />
            </Button>

            {rule && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete} title="Remover">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Config Modal ─────────────────────────────────────────────────────

const WEEK_DAYS = [
  { v: '0', l: 'Dom' }, { v: '1', l: 'Seg' }, { v: '2', l: 'Ter' },
  { v: '3', l: 'Qua' }, { v: '4', l: 'Qui' }, { v: '5', l: 'Sex' }, { v: '6', l: 'Sáb' },
]

const INTERVAL_PRESETS = [
  { v: '1',   l: 'A cada 1 hora'    },
  { v: '2',   l: 'A cada 2 horas'   },
  { v: '4',   l: 'A cada 4 horas'   },
  { v: '6',   l: 'A cada 6 horas'   },
  { v: '8',   l: 'A cada 8 horas'   },
  { v: '12',  l: 'A cada 12 horas'  },
  { v: '24',  l: 'A cada 1 dia'     },
  { v: '48',  l: 'A cada 2 dias'    },
  { v: '72',  l: 'A cada 3 dias'    },
  { v: '168', l: 'A cada 1 semana'  },
  { v: 'custom', l: 'Intervalo personalizado…' },
]

function CfgSwitch({ label, id, checked, onChange }: { label: string; id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ConfigModal({ type, rule, open, onClose, onSaved }: {
  type: AutomationType; rule: AutomationRule | undefined
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const meta   = AUTOMATION_META[type]
  const wppCfg = getWppConfig()
  const defs   = AUTOMATION_CONFIG_DEFAULTS[type]

  const [saving, setSaving]             = useState(false)
  const [name, setName]                 = useState('')
  const [time, setTime]                 = useState(meta.time)
  const [freq, setFreq]                 = useState<string>(meta.frequency)
  const [dow, setDow]                   = useState(String(meta.dayOfWeek ?? 1))
  const [dom, setDom]                   = useState('1')
  const [groupJid, setGroupJid]         = useState('')
  const [groupName, setGroupName]       = useState('')
  const [cfg, setCfg]                   = useState<Record<string, any>>(defs)
  // Custom frequency sub-state
  const [customType, setCustomType]     = useState<'interval' | 'specific_days'>('interval')
  const [intervalPreset, setIntervalPreset] = useState('24')  // preset value or 'custom'
  const [intervalCustomH, setIntervalCustomH] = useState('24') // free input hours
  const [customDays, setCustomDays]     = useState<number[]>([1]) // days of week

  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? meta.label)
    setTime(rule?.scheduled_time ?? meta.time)
    setFreq(rule?.frequency ?? meta.frequency)
    setDow(String(rule?.scheduled_day_of_week ?? meta.dayOfWeek ?? 1))
    setDom(String(rule?.scheduled_day_of_month ?? 1))
    setGroupJid(rule?.destination_group_jid ?? wppCfg?.group_jid ?? '')
    setGroupName(rule?.destination_group_name ?? wppCfg?.group_name ?? '')
    const existing = rule?.config_json && Object.keys(rule.config_json).length ? rule.config_json : defs
    setCfg(existing)
    // Restore custom state from saved config
    if (rule?.frequency === 'custom') {
      const ct = existing.custom_type || 'interval'
      setCustomType(ct)
      if (ct === 'interval') {
        const h = String(existing.custom_interval_hours || 24)
        const preset = INTERVAL_PRESETS.find(p => p.v === h)
        setIntervalPreset(preset ? h : 'custom')
        setIntervalCustomH(h)
      }
      if (ct === 'specific_days') {
        setCustomDays(existing.custom_days || [1])
      }
    }
  }, [open])

  const cfgSw = (key: string) => ({
    checked:  cfg[key] !== false,
    onChange: (v: boolean) => setCfg(p => ({ ...p, [key]: v })),
  })

  const handleSave = () => {
    setSaving(true)

    // Merge custom frequency settings into config_json
    let finalCfg = { ...cfg }
    if (freq === 'custom') {
      const hours = intervalPreset === 'custom' ? Number(intervalCustomH) || 24
                                                : Number(intervalPreset)
      finalCfg = {
        ...finalCfg,
        custom_type:           customType,
        custom_interval_hours: customType === 'interval'      ? hours     : undefined,
        custom_days:           customType === 'specific_days' ? customDays : undefined,
      }
    }

    const base = {
      name, automation_type: type, channel: 'whatsapp',
      destination_group_jid:  groupJid  || null,
      destination_group_name: groupName || null,
      timezone: 'America/Sao_Paulo',
      frequency:              freq as any,
      scheduled_time:         time,
      scheduled_day_of_week:  freq === 'weekly'  ? Number(dow) : null,
      scheduled_day_of_month: freq === 'monthly' ? Number(dom) : null,
      config_json: finalCfg,
    }
    try {
      if (rule) {
        const next_run_at = rule.enabled ? computeNextRunAt({ ...rule, ...base }) : rule.next_run_at
        updateRule(rule.id, { ...base, next_run_at })
        toast.success('Automação atualizada!')
      } else {
        createRule({ ...base, enabled: false, next_run_at: null })
        toast.success('Automação criada!')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.emoji} {meta.label}
            <Badge variant="secondary" className="text-xs">{rule ? 'Editar' : 'Configurar'}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={meta.label} />
          </div>

          {/* Group */}
          <div className="space-y-2">
            <Label>Grupo de destino</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Input value={groupJid} onChange={e => setGroupJid(e.target.value)} placeholder={wppCfg?.group_jid || '120363xxxx@g.us'} />
                <p className="text-xs text-muted-foreground">JID do grupo</p>
              </div>
              <div className="space-y-1">
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder={wppCfg?.group_name || 'Nome'} />
                <p className="text-xs text-muted-foreground">Nome (descritivo)</p>
              </div>
            </div>
            {!groupJid && wppCfg?.group_jid && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar o padrão: <strong>{wppCfg.group_name || wppCfg.group_jid}</strong>
              </p>
            )}
          </div>

          {/* Schedule */}
          {type !== 'command_parser' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Frequência</Label>
                <Select value={freq} onValueChange={setFreq}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Standard frequencies */}
                {(freq === 'daily' || freq === 'weekly' || freq === 'monthly') && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {freq === 'weekly' && (
                      <div className="space-y-1.5">
                        <Label>Dia da semana</Label>
                        <Select value={dow} onValueChange={setDow}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WEEK_DAYS.map(d => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {freq === 'monthly' && (
                      <div className="space-y-1.5">
                        <Label>Dia do mês</Label>
                        <Input type="number" min={1} max={31} value={dom} onChange={e => setDom(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Horário</Label>
                      <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Custom frequency */}
                {freq === 'custom' && (
                  <div className="rounded-xl border p-4 space-y-4">

                    {/* Sub-type */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomType('interval')}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                          customType === 'interval'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-accent',
                        )}
                      >
                        Intervalo fixo
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomType('specific_days')}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                          customType === 'specific_days'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-accent',
                        )}
                      >
                        Dias específicos
                      </button>
                    </div>

                    {/* Interval mode */}
                    {customType === 'interval' && (
                      <div className="space-y-2">
                        <Label>Repetir</Label>
                        <Select value={intervalPreset} onValueChange={v => { setIntervalPreset(v); if (v !== 'custom') setIntervalCustomH(v) }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INTERVAL_PRESETS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {intervalPreset === 'custom' && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number" min={1} max={720}
                              value={intervalCustomH}
                              onChange={e => setIntervalCustomH(e.target.value)}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">horas</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          O próximo disparo é calculado a partir do momento em que a automação é ativada ou executada.
                        </p>
                      </div>
                    )}

                    {/* Specific days mode */}
                    {customType === 'specific_days' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Dias da semana</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {WEEK_DAYS.map(d => {
                              const selected = customDays.includes(Number(d.v))
                              return (
                                <button
                                  key={d.v}
                                  type="button"
                                  onClick={() => {
                                    const n = Number(d.v)
                                    setCustomDays(prev =>
                                      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort()
                                    )
                                  }}
                                  className={cn(
                                    'w-10 h-10 rounded-lg text-xs font-semibold border transition-colors',
                                    selected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'hover:bg-accent',
                                  )}
                                >
                                  {d.l}
                                </button>
                              )
                            })}
                          </div>
                          {customDays.length === 0 && (
                            <p className="text-xs text-red-500">Selecione ao menos um dia.</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Horário</Label>
                          <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-36" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Type-specific config */}
          {type === 'daily_summary' && (
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Incluir no resumo</Label>
              <CfgSwitch label="Saldo total (pessoal / empresa)"       id="bal"  {...cfgSw('include_balance')} />
              <CfgSwitch label="Saldo da conta PJ"                     id="pj"   {...cfgSw('include_pj')} />
              <CfgSwitch label="Fluxo do mês (entradas, saídas, resultado)" id="cf" {...cfgSw('include_cashflow')} />
              <CfgSwitch label="Totais pendentes"                      id="pen"  {...cfgSw('include_pending')} />
              <CfgSwitch label="Itens em atraso"                       id="ov"   {...cfgSw('include_overdue')} />
              <CfgSwitch label="Próximos vencimentos"                  id="up"   {...cfgSw('include_upcoming')} />
              {cfg.include_upcoming !== false && (
                <div className="flex items-center justify-between pl-4">
                  <Label className="text-xs text-muted-foreground font-normal">Máx. vencimentos listados</Label>
                  <Input type="number" min={1} max={20} value={cfg.max_items ?? 5}
                    onChange={e => setCfg(p => ({ ...p, max_items: Number(e.target.value) }))}
                    className="w-16 h-7 text-xs" />
                </div>
              )}
            </div>
          )}

          {type === 'weekly_summary' && (
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Incluir no resumo</Label>
              <CfgSwitch label="Resultado do mês"     id="res"  {...cfgSw('include_result')} />
              <CfgSwitch label="Clientes ativos (top 3)" id="cli" {...cfgSw('include_top_clients')} />
              <CfgSwitch label="A receber (próximos)" id="rec"  {...cfgSw('include_receivables')} />
              <CfgSwitch label="A pagar (próximos)"   id="pay"  {...cfgSw('include_payables')} />
              <CfgSwitch label="Em atraso"            id="ov"   {...cfgSw('include_overdue')} />
            </div>
          )}

          {type === 'due_alerts' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Avisar com quantos dias de antecedência</Label>
                <Input type="number" min={1} max={30} value={cfg.days_before ?? 3}
                  onChange={e => setCfg(p => ({ ...p, days_before: Number(e.target.value) }))}
                  className="w-16 h-7 text-xs" />
              </div>
              <CfgSwitch label="Contas a pagar"          id="pay"  {...cfgSw('include_payables')} />
              <CfgSwitch label="Contas a receber"        id="rec"  {...cfgSw('include_receivables')} />
              <CfgSwitch label="Itens em atraso"         id="ov"   {...cfgSw('include_overdue')} />
              <CfgSwitch label="Listar vencimentos futuros" id="fu" {...cfgSw('include_upcoming_in_alert')} />
              <CfgSwitch label="Só enviar se houver itens" id="only" {...cfgSw('only_if_items')} />
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Máx. de itens listados</Label>
                <Input type="number" min={1} max={30} value={cfg.max_items ?? 10}
                  onChange={e => setCfg(p => ({ ...p, max_items: Number(e.target.value) }))}
                  className="w-16 h-7 text-xs" />
              </div>
            </div>
          )}

          {type === 'command_parser' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold mb-1">
                  <Info className="h-3.5 w-3.5" />
                  Requer webhook no uazapiGO
                </div>
                <p className="text-xs text-amber-700">
                  Configure a URL do webhook no painel do uazapiGO. O parser processa mensagens recebidas do grupo e registra transações automaticamente.
                </p>
              </div>
              <CfgSwitch label="Aceitar comandos por texto"  id="txt"  checked={cfg.accept_text ?? true}  onChange={v => setCfg(p => ({ ...p, accept_text: v }))} />
              <CfgSwitch label="Aceitar áudio (requer Edge Function de transcrição)" id="aud" checked={cfg.accept_audio ?? false} onChange={v => setCfg(p => ({ ...p, accept_audio: v }))} />
              <CfgSwitch label="Responder confirmação no grupo" id="rep" checked={cfg.reply_in_group ?? true} onChange={v => setCfg(p => ({ ...p, reply_in_group: v }))} />
              <CfgSwitch label="Pedir confirmação (confiança baixa)" id="conf" checked={cfg.require_confirmation ?? true} onChange={v => setCfg(p => ({ ...p, require_confirmation: v }))} />
              <CfgSwitch label="Salvar logs completos"     id="log"  checked={cfg.save_logs ?? true}   onChange={v => setCfg(p => ({ ...p, save_logs: v }))} />
              <div className="space-y-1.5">
                <Label className="text-sm">JID do grupo monitorado</Label>
                <Input value={cfg.monitored_group_jid ?? ''} onChange={e => setCfg(p => ({ ...p, monitored_group_jid: e.target.value }))} placeholder={wppCfg?.group_jid || '120363xxxx@g.us'} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── History Modal ────────────────────────────────────────────────────

function HistoryModal({ rule, open, onClose }: {
  rule: AutomationRule | null; open: boolean; onClose: () => void
}) {
  const { runs, reload } = useAutomationRuns(rule?.id ?? null)
  useEffect(() => { if (open) reload() }, [open])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico — {rule?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{runs.length} execuções registradas</span>
            <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={reload}>
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          {runs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <History className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhuma execução ainda</p>
              <p className="text-xs text-muted-foreground">Use o botão ▷ para executar a automação.</p>
            </div>
          )}

          {runs.map(run => {
            const isOk  = run.status === 'success'
            const isErr = run.status === 'error'
            const dur   = run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'
            return (
              <div key={run.id} className={cn(
                'rounded-xl border p-3 space-y-1 text-xs',
                isOk  && 'border-green-200 bg-green-50/40',
                isErr && 'border-red-200 bg-red-50/40',
                !isOk && !isErr && 'border-border',
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isOk  && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                    {isErr && <XCircle      className="h-3.5 w-3.5 text-red-500   shrink-0" />}
                    {!isOk && !isErr && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                    <span className="font-medium">{fmt(run.started_at)}</span>
                    <Badge variant="secondary" className="text-xs">{run.trigger_source}</Badge>
                  </div>
                  <span className="text-muted-foreground shrink-0">{dur}</span>
                </div>
                {run.payload_summary  && <p className="text-muted-foreground pl-5">{run.payload_summary}</p>}
                {run.response_summary && <p className="text-muted-foreground pl-5">{run.response_summary}</p>}
                {isErr && run.error_message && (
                  <p className="text-red-600 bg-red-100 rounded px-2 py-1 font-mono break-words pl-5">{run.error_message}</p>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────

const ALL_TYPES: AutomationType[] = ['daily_summary', 'weekly_summary', 'due_alerts', 'command_parser']

export default function AutomationsTab() {
  const { rules, reload } = useAutomations()

  const [configModal,  setConfigModal]  = useState<{ type: AutomationType; rule?: AutomationRule } | null>(null)
  const [historyModal, setHistoryModal] = useState<AutomationRule | null>(null)

  // Client-side scheduler: run pending automations every 60s
  useEffect(() => {
    const check = async () => {
      const n = await runPendingAutomations()
      if (n > 0) { reload(); toast.info(`${n} automação${n !== 1 ? 'ões' : ''} executada${n !== 1 ? 's' : ''} pelo agendador.`) }
    }
    check()
    const id = setInterval(() => { check().then(reload) }, 60_000)
    return () => clearInterval(id)
  }, [])

  const ruleOf = (t: AutomationType) => rules.find(r => r.automation_type === t)

  const activeCount = rules.filter(r => r.enabled).length
  const errorCount  = rules.filter(r => r.last_status === 'error').length
  const wppReady    = (() => { const c = getWppConfig(); return !!(c?.group_jid && c?.instance_token && c?.api_base_url) })()

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold">Central de Automações</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure, ative e monitore envios automáticos via WhatsApp
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Quick stats */}
      {rules.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />{activeCount} ativa{activeCount !== 1 ? 's' : ''}
          </Badge>
          {errorCount > 0 && (
            <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
              <AlertTriangle className="h-3 w-3" />{errorCount} com erro
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />Agendador ativo (a cada 60s)
          </Badge>
        </div>
      )}

      {/* WhatsApp warning */}
      {!wppReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">WhatsApp não configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Configure na aba <strong>WhatsApp API</strong> antes de ativar automações.
            </p>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {ALL_TYPES.map(type => (
          <AutomationCard
            key={type}
            type={type}
            rule={ruleOf(type)}
            onConfigure={(t, r) => setConfigModal({ type: t, rule: r })}
            onHistory={r => setHistoryModal(r)}
            onRefresh={reload}
          />
        ))}
      </div>

      {/* Info note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
          <Info className="h-4 w-4" />Como funciona
        </div>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Clique em ⚙️ para configurar uma automação, depois ative com o toggle.</li>
          <li>Use ▷ para executar manualmente a qualquer momento.</li>
          <li>O agendador verifica a cada 60s enquanto o app está aberto.</li>
          <li>Para execução server-side (sem browser aberto), deploy da Edge Function <code>run-automation</code> + pg_cron no Supabase.</li>
          <li>Todo histórico de execuções fica no ícone 🕐 de cada automação.</li>
        </ul>
      </div>

      {/* Modals */}
      {configModal && (
        <ConfigModal
          type={configModal.type}
          rule={configModal.rule}
          open={!!configModal}
          onClose={() => setConfigModal(null)}
          onSaved={reload}
        />
      )}

      <HistoryModal
        rule={historyModal}
        open={!!historyModal}
        onClose={() => setHistoryModal(null)}
      />
    </div>
  )
}
