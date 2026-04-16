import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, Calendar, Zap, Eye, EyeOff, Save, Loader2,
  Send, Wallet, Briefcase, TrendingUp, Users, Clock, LayoutList,
  History, Trash2, CheckCircle2, XCircle, Radio, Mic, ShieldCheck,
  AlertTriangle, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import {
  WPP_STORAGE_KEY, getWppLogs, clearWppLogs,
  validateConfig, getWppConfig, type SendLog, type WppConfig,
} from '@/lib/whatsapp'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import AutomationsTab from './AutomationsTab'

// ─── Masked Input ──────────────────────────────────────────────────────

function MaskedInput({ label, placeholder, name, register, hint }: {
  label: string; placeholder: string; name: string; register: any; hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete="off" {...register(name)} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(!show)}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Diagnostics panel ────────────────────────────────────────────────

function DiagnosticsPanel() {
  const [open, setOpen] = useState(false)
  const config = getWppConfig()
  const v = validateConfig(config)

  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span>Diagnóstico da integração</span>
          {v.valid
            ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs">OK</Badge>
            : <Badge variant="outline" className="text-red-500 border-red-300 text-xs">{v.errors.length} erro{v.errors.length !== 1 ? 's' : ''}</Badge>}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-3 text-sm">
          <div className="grid gap-2 font-mono text-xs">
            <Row label="Provider" value={config?.provider_name || '—'} />
            <Row label="Base URL" value={v.baseUrl || '(não configurada)'} ok={!!v.baseUrl} />
            <Row label="Endpoint de envio" value={v.sendEndpoint || '—'} ok={!!v.sendEndpoint} />
            <Row label="Método HTTP" value={v.method} />
            <Row label="Headers enviados" value={v.headers.join(', ') || '—'} />
            <Row label="Token da instância" value={config?.instance_token ? '••••' + config.instance_token.slice(-4) : '(não configurado)'} ok={!!config?.instance_token} />
            <Row label="Token administrativo" value={config?.admin_token ? '••••' + config.admin_token.slice(-4) : '(opcional — não configurado)'} />
            <Row label="JID do grupo" value={config?.group_jid || '(não configurado)'} ok={config?.group_jid?.endsWith('@g.us')} />
          </div>

          {v.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
              {v.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}

          {v.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
              {v.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 text-muted-foreground shrink-0">{label}</span>
      <span className={cn('truncate', ok === false && 'text-red-500', ok === true && 'text-green-600')}>{value}</span>
    </div>
  )
}

// ─── Tab: WhatsApp API Config ──────────────────────────────────────────

function WhatsAppTab() {
  const defaultValues = {
    provider_name: 'uazapiGO V2',
    api_base_url: '',
    instance_name: '',
    instance_token: '',
    admin_token: '',
    group_jid: '',
    group_name: '',
    send_updates: true,
    receive_commands: false,
  }

  const [sendUpdates, setSendUpdates] = useState(true)
  const [receiveCommands, setReceiveCommands] = useState(false)
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues })

  useEffect(() => {
    const saved = localStorage.getItem(WPP_STORAGE_KEY)
    if (!saved) return
    try {
      const p = JSON.parse(saved)
      reset(p)
      setSendUpdates(p.send_updates ?? true)
      setReceiveCommands(p.receive_commands ?? false)
    } catch {}
  }, [])

  const apiUrl = watch('api_base_url') || ''
  const hasTokenInUrl = /\/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(apiUrl)

  const onSave = (data: any) => {
    const config = { ...data, send_updates: sendUpdates, receive_commands: receiveCommands }
    localStorage.setItem(WPP_STORAGE_KEY, JSON.stringify(config))
    toast.success('Configurações salvas!')
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <div>
        <h3 className="font-semibold">uazapiGO V2</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure a integração com sua instância uazapiGO para envio de resumos ao grupo WhatsApp.
        </p>
      </div>

      <Separator />

      {/* Provider + Instance name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Input placeholder="uazapiGO V2" {...register('provider_name')} />
          <p className="text-xs text-muted-foreground">Ex: uazapiGO V2</p>
        </div>
        <div className="space-y-1.5">
          <Label>Nome da instância</Label>
          <Input placeholder="Ex: Ana Beatriz | Sistema Gestão" {...register('instance_name')} />
          <p className="text-xs text-muted-foreground">Apenas descritivo — não é usado no envio</p>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <Label>URL da API *</Label>
        <Input
          placeholder="https://ipazua.uazapi.com"
          {...register('api_base_url')}
          className={cn(hasTokenInUrl && 'border-red-400 focus-visible:ring-red-400')}
        />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            URL base do servidor uazapiGO — <strong>sem</strong> token no path e <strong>sem</strong> barra no final.
          </p>
          {hasTokenInUrl && (
            <div className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                A URL contém um token UUID no path. Remova-o — o token vai no campo abaixo, não na URL.
                <br />Correto: <code className="bg-red-50 px-1 rounded">https://ipazua.uazapi.com</code>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tokens */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedInput
          label="Token da instância *"
          placeholder="••••••••"
          name="instance_token"
          register={register}
          hint="Usado no header 'token' em cada envio de mensagem"
        />
        <MaskedInput
          label="Token administrativo (opcional)"
          placeholder="••••••••"
          name="admin_token"
          register={register}
          hint="Somente para operações administrativas — não necessário para envios"
        />
      </div>

      <Separator />

      {/* Group */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>JID do grupo *</Label>
          <Input placeholder="120363265780168059@g.us" {...register('group_jid')} />
          <p className="text-xs text-muted-foreground">Formato: número@g.us — obrigatório para envios ao grupo</p>
        </div>
        <div className="space-y-1.5">
          <Label>Nome do grupo</Label>
          <Input placeholder="Ex: FINANCEIRO 📊" {...register('group_name')} />
          <p className="text-xs text-muted-foreground">Apenas descritivo — exibido no histórico e no dashboard</p>
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enviar atualizações</p>
            <p className="text-xs text-muted-foreground">Habilita envio de resumos para o grupo</p>
          </div>
          <Switch checked={sendUpdates} onCheckedChange={setSendUpdates} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Receber comandos</p>
            <p className="text-xs text-muted-foreground">Futuro: lançar transações via WhatsApp (requer webhook)</p>
          </div>
          <Switch checked={receiveCommands} onCheckedChange={setReceiveCommands} />
        </div>
      </div>

      <Button type="submit" className="gap-2">
        <Save className="h-4 w-4" />
        Salvar configurações
      </Button>

      <Separator />

      {/* Diagnostics */}
      <DiagnosticsPanel />

      {/* How-to */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
          <Info className="h-4 w-4" />
          Como preencher corretamente (uazapiGO V2)
        </div>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>URL da API:</strong> apenas o domínio, ex: <code>https://ipazua.uazapi.com</code></li>
          <li><strong>Token da instância:</strong> UUID da instância, ex: <code>c940677b-d778-...</code></li>
          <li><strong>Token administrativo:</strong> opcional para envios — só necessário para criar/deletar instâncias</li>
          <li><strong>JID do grupo:</strong> ID do grupo WhatsApp no formato <code>120363xxxx@g.us</code></li>
        </ul>
        <p className="text-xs text-blue-700 mt-1">
          Endpoint de envio que será chamado: <code>POST {'{URL da API}'}/send/text</code> com header <code>token: {'{Token da instância}'}</code>
        </p>
      </div>
    </form>
  )
}

// ─── Tab: Central de Envios ────────────────────────────────────────────

interface SendButtonProps {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
  loading: boolean
  disabled?: boolean
  highlight?: boolean
}

function SendButton({ icon: Icon, label, description, onClick, loading, disabled, highlight }: SendButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 text-left transition-all w-full',
        'hover:bg-accent hover:border-primary/30 hover:shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        highlight && 'border-primary/30 bg-primary/5',
        loading && 'opacity-75',
      )}
    >
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
        highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground',
      )}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {!loading && <Send className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  )
}

function GroupSendTab() {
  const wpp = useWhatsApp()
  const cfg = wpp.config
  const v = validateConfig(cfg)

  if (!v.valid) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Configuração incompleta</p>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            {v.errors.map((e, i) => <p key={i} className="text-red-500">• {e}</p>)}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Corrija os erros na aba <strong>WhatsApp API</strong> e salve.</p>
      </div>
    )
  }

  const groupLabel = cfg?.group_name || cfg?.group_jid || '—'

  return (
    <div className="space-y-6">
      {/* Destination */}
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
          <Radio className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Destino configurado</p>
          <p className="text-xs text-green-700">{groupLabel} · {v.sendEndpoint}</p>
        </div>
      </div>

      {/* Teste */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teste</p>
        <SendButton
          icon={MessageCircle}
          label="Enviar mensagem de teste"
          description="Confirma que a integração está funcionando — envia uma mensagem simples ao grupo"
          onClick={() => wpp.sendTest.mutate()}
          loading={wpp.sendTest.isPending}
          highlight
        />
      </div>

      <Separator />

      {/* Resumos rápidos */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumos rápidos</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <SendButton
            icon={Wallet}
            label="Saldo de hoje"
            description="Saldo total, pessoal e empresa"
            onClick={() => wpp.sendBalance.mutate()}
            loading={wpp.sendBalance.isPending}
            disabled={!wpp.ready.dash}
          />
          <SendButton
            icon={Briefcase}
            label="Caixinha PJ"
            description={`Conta "${cfg?.pj_account_name || 'PJ'}" — saldo atual`}
            onClick={() => wpp.sendPJCash.mutate()}
            loading={wpp.sendPJCash.isPending}
            disabled={!wpp.ready.dash}
          />
          <SendButton
            icon={TrendingUp}
            label="Fluxo de caixa"
            description="Entradas, saídas e resultado do mês"
            onClick={() => wpp.sendCashFlow.mutate()}
            loading={wpp.sendCashFlow.isPending}
            disabled={!wpp.ready.dash}
          />
        </div>
      </div>

      <Separator />

      {/* Clientes */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clientes</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <SendButton
            icon={Users}
            label="Clientes ativos"
            description="Quantidade e lista de clientes ativos"
            onClick={() => wpp.sendActiveClients.mutate()}
            loading={wpp.sendActiveClients.isPending}
            disabled={!wpp.ready.clients}
          />
          <SendButton
            icon={Clock}
            label="Próximos vencimentos"
            description="Contas a receber ordenadas por data"
            onClick={() => wpp.sendUpcomingDues.mutate()}
            loading={wpp.sendUpcomingDues.isPending}
            disabled={!wpp.ready.dash}
          />
        </div>
      </div>

      <Separator />

      {/* Completo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completo</p>
        <SendButton
          icon={LayoutList}
          label="Resumo geral completo"
          description="Saldo, caixa PJ, fluxo do mês, clientes ativos e próximos vencimentos"
          onClick={() => wpp.sendFullSummary.mutate()}
          loading={wpp.sendFullSummary.isPending}
          disabled={!wpp.ready.dash || !wpp.ready.clients}
          highlight
        />
      </div>

      <Separator />

      {/* Áudio */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Áudio</p>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
            <Mic className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Envio de áudio (PTT)</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Requer Edge Function Supabase com TTS. O uazapiGO suporta envio de áudio via <code>/send/audio</code>.
              Implante a Edge Function <strong>whatsapp-send-audio</strong> para ativar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Histórico ───────────────────────────────────────────────────

function errorCategory(log: SendLog): string {
  if (log.http_status === 0) return 'Rede'
  if (log.http_status === 401 || log.http_status === 403) return 'Autenticação'
  if (log.http_status === 404 || log.http_status === 405) return 'Endpoint'
  if (log.http_status >= 500) return 'Servidor'
  return `HTTP ${log.http_status}`
}

function LogsTab() {
  const [logs, setLogs] = useState<SendLog[]>([])
  const reload = useCallback(() => setLogs(getWppLogs()), [])
  useEffect(() => { reload() }, [])

  const handleClear = () => { clearWppLogs(); setLogs([]); toast.success('Histórico limpo.') }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <History className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Nenhum envio registrado</p>
          <p className="text-sm text-muted-foreground mt-1">Os envios da Central de Envios aparecem aqui.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="gap-2">
          <History className="h-4 w-4" /> Atualizar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} className="gap-2">
            <History className="h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Limpar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className={cn(
            'rounded-xl border p-4 space-y-2',
            log.status === 'success' ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40',
          )}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {log.status === 'success'
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span className="text-sm font-semibold">{log.label}</span>
                {log.status === 'error' && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                    {errorCategory(log)}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(log.sent_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground font-mono">
              <span>Provider: {log.provider || '—'}</span>
              <span>Método: {log.method || 'POST'}</span>
              <span className="col-span-2 truncate">Endpoint: {log.endpoint || '—'}</span>
              <span>Grupo: {log.group_name || log.group_jid}</span>
              <span>Status HTTP: {log.http_status === 0 ? 'rede' : log.http_status || '—'}</span>
            </div>

            {log.error && (
              <p className="text-xs text-red-600 bg-red-100 rounded px-2 py-1 font-mono break-words">{log.error}</p>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">Ver mensagem enviada</summary>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-foreground bg-background rounded p-2 border text-xs">{log.message}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Google Calendar ──────────────────────────────────────────────

function GoogleCalendarTab() {
  const [enabled, setEnabled] = useState(false)
  const { register } = useForm()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Google Calendar</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Sincronize vencimentos com seus eventos no Google Calendar</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <Separator />
      <div className={cn('space-y-4', !enabled && 'opacity-40 pointer-events-none')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Calendar ID</Label>
            <Input placeholder="seu@gmail.com" {...register('calendar_id')} />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input defaultValue="America/Sao_Paulo" {...register('timezone')} />
          </div>
        </div>
        <Button onClick={() => toast.info('OAuth via Edge Function google-calendar-sync.')} className="gap-2" variant="outline">
          <Calendar className="h-4 w-4" /> Conectar com Google Calendar
        </Button>
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm font-medium text-blue-800 mb-1">Edge Function preparada:</p>
        <Badge variant="outline" className="text-xs font-mono text-blue-700 border-blue-300">google-calendar-sync</Badge>
      </div>
    </div>
  )
}

// AutomationsTab is imported from ./AutomationsTab

// ─── Page ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const wpp = useWhatsApp()

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" description="Conecte o FinanceHub com ferramentas externas" />

      <Tabs defaultValue="send">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Central de Envios
            {wpp.isConfigured && <span className="ml-1 h-2 w-2 rounded-full bg-green-500 inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp API
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" /> Google Calendar
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" /> Automações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Central de Envios</CardTitle>
              <CardDescription>Envie resumos financeiros para o grupo WhatsApp com 1 clique</CardDescription>
            </CardHeader>
            <CardContent><GroupSendTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração — uazapiGO V2</CardTitle>
              <CardDescription>Preencha os dados da sua instância WhatsApp</CardDescription>
            </CardHeader>
            <CardContent><WhatsAppTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Envios</CardTitle>
              <CardDescription>Registro completo com provider, endpoint, status HTTP e erro por envio</CardDescription>
            </CardHeader>
            <CardContent><LogsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card><CardContent className="pt-6"><GoogleCalendarTab /></CardContent></Card>
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <AutomationsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
