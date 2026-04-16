import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Clock, Plus,
  ArrowLeftRight, Users, CreditCard, ChevronRight, DollarSign,
  Send, TestTube2, LayoutList, Loader2, MessageCircle,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '@/hooks/useDashboard'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { formatCurrency, formatDateRelative, isOverdue } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePWAInstall } from '@/hooks/usePWAInstall'

function StatCard({
  title, value, subtitle, icon: Icon, trend, color = 'default', onClick,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
  onClick?: () => void
}) {
  const colorMap = {
    default: 'text-primary bg-primary/10',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-500 bg-red-100',
    yellow: 'text-amber-600 bg-amber-100',
    blue: 'text-blue-600 bg-blue-100',
  }
  return (
    <Card
      className={cn('transition-all hover:shadow-md', onClick && 'cursor-pointer hover:-translate-y-0.5')}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className={cn('text-2xl font-bold mt-1 tabular-nums',
              color === 'green' && 'text-green-600',
              color === 'red' && 'text-red-500',
              color === 'yellow' && 'text-amber-600',
            )}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {onClick && (
          <div className="flex items-center gap-1 mt-3 text-xs text-primary">
            <span>Ver detalhes</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

function GroupSendCard() {
  const navigate = useNavigate()
  const wpp = useWhatsApp()

  const actions = [
    { label: 'Teste', icon: TestTube2, fn: () => wpp.sendTest.mutate(), loading: wpp.sendTest.isPending },
    { label: 'Saldo', icon: Wallet, fn: () => wpp.sendBalance.mutate(), loading: wpp.sendBalance.isPending, disabled: !wpp.ready.dash },
    { label: 'Fluxo', icon: TrendingUp, fn: () => wpp.sendCashFlow.mutate(), loading: wpp.sendCashFlow.isPending, disabled: !wpp.ready.dash },
    { label: 'Resumo', icon: LayoutList, fn: () => wpp.sendFullSummary.mutate(), loading: wpp.sendFullSummary.isPending, disabled: !wpp.ready.dash || !wpp.ready.clients },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Enviar para Grupo</CardTitle>
            {wpp.isConfigured && <span className="h-2 w-2 rounded-full bg-green-500" />}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/integracoes')} className="text-xs gap-1">
            <Send className="h-3 w-3" /> Central
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!wpp.isConfigured ? (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Configure o WhatsApp em Integrações para enviar resumos ao grupo.</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/integracoes')}>Configurar</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground truncate">
              Grupo: {wpp.config?.group_name || wpp.config?.group_jid || '—'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.fn}
                  disabled={a.loading || a.disabled}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {a.loading
                    ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    : <a.icon className="h-4 w-4 shrink-0" />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboard()
  const { canInstall, install } = usePWAInstall()
  const currentMonth = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  const d = data!

  return (
    <div className="space-y-6">
      {/* PWA Install Banner */}
      {canInstall && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Instale o FinanceHub</p>
              <p className="text-xs text-muted-foreground">Acesse como app no seu dispositivo</p>
            </div>
          </div>
          <Button size="sm" onClick={install} variant="outline" className="shrink-0">
            Instalar
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Novo Lançamento', icon: ArrowLeftRight, href: '/lancamentos', color: 'bg-primary text-primary-foreground' },
          { label: 'Nova Conta a Pagar', icon: TrendingDown, href: '/contas-a-pagar', color: 'bg-red-500 text-white' },
          { label: 'Nova Conta a Receber', icon: TrendingUp, href: '/contas-a-receber', color: 'bg-green-600 text-white' },
          { label: 'Novo Cliente', icon: Users, href: '/clientes', color: 'bg-blue-600 text-white' },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => navigate(action.href)}
            className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors text-left"
          >
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', action.color)}>
              <action.icon className="h-4 w-4" />
            </div>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(d.totalBalance)}
          subtitle="Todas as contas"
          icon={Wallet}
          color={d.totalBalance >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title={`Receitas — ${currentMonth}`}
          value={formatCurrency(d.monthIncome)}
          icon={TrendingUp}
          color="green"
          onClick={() => navigate('/lancamentos')}
        />
        <StatCard
          title={`Despesas — ${currentMonth}`}
          value={formatCurrency(d.monthExpense)}
          icon={TrendingDown}
          color="red"
          onClick={() => navigate('/lancamentos')}
        />
        <StatCard
          title="Resultado do Mês"
          value={formatCurrency(d.monthProfit)}
          icon={DollarSign}
          color={d.monthProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Receivable / Payable */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="A Receber"
          value={formatCurrency(d.totalReceivable)}
          subtitle="Pendente"
          icon={TrendingUp}
          color="blue"
          onClick={() => navigate('/contas-a-receber')}
        />
        <StatCard
          title="A Pagar"
          value={formatCurrency(d.totalPayable)}
          subtitle="Pendente"
          icon={TrendingDown}
          color="yellow"
          onClick={() => navigate('/contas-a-pagar')}
        />
        <StatCard
          title="Recebimentos Atrasados"
          value={formatCurrency(d.overdueReceivable)}
          icon={AlertTriangle}
          color={d.overdueReceivable > 0 ? 'red' : 'default'}
          onClick={() => navigate('/contas-a-receber')}
        />
        <StatCard
          title="Pagamentos Atrasados"
          value={formatCurrency(d.overduePayable)}
          icon={AlertTriangle}
          color={d.overduePayable > 0 ? 'red' : 'default'}
          onClick={() => navigate('/contas-a-pagar')}
        />
      </div>

      {/* Charts + Upcoming */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Cash flow chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fluxo de Caixa — {currentMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            {d.cashFlowChart.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.cashFlowChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(8)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Area type="monotone" dataKey="income" name="Receita" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top expenses pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {d.topExpenses.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                Sem despesas neste mês
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={d.topExpenses} dataKey="amount" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {d.topExpenses.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {d.topExpenses.slice(0, 4).map((e) => (
                    <div key={e.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                        <span className="text-muted-foreground truncate max-w-[120px]">{e.category}</span>
                      </div>
                      <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account balances + upcoming + group send */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Account balances */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Saldo por Conta</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contas-cartoes')} className="text-xs">
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {d.accountBalances.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                <Button size="sm" onClick={() => navigate('/contas-cartoes')}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Conta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {d.accountBalances.map((acc) => (
                  <div key={acc.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                      <span className="text-sm">{acc.name}</span>
                    </div>
                    <span className={cn('text-sm font-medium tabular-nums', acc.balance < 0 && 'text-red-500')}>
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming payables */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Próximos Pagamentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contas-a-pagar')} className="text-xs">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {d.upcomingPayables.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <p className="text-sm text-muted-foreground">Nenhum pagamento pendente</p>
                <Button size="sm" onClick={() => navigate('/contas-a-pagar')}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Conta a Pagar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {d.upcomingPayables.slice(0, 5).map((t) => {
                  const overdue = isOverdue(t.due_date || t.competency_date, t.status)
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className={cn('text-xs', overdue ? 'text-red-500' : 'text-muted-foreground')}>
                          {overdue ? 'Atrasado — ' : ''}{formatDateRelative(t.due_date || t.competency_date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-500 tabular-nums shrink-0">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming receivables */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Próximos Recebimentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contas-a-receber')} className="text-xs">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {d.upcomingReceivables.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <p className="text-sm text-muted-foreground">Nenhum recebimento pendente</p>
                <Button size="sm" onClick={() => navigate('/contas-a-receber')}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Conta a Receber
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {d.upcomingReceivables.slice(0, 5).map((t) => {
                  const overdue = isOverdue(t.due_date || t.competency_date, t.status)
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className={cn('text-xs', overdue ? 'text-red-500' : 'text-muted-foreground')}>
                          {overdue ? 'Atrasado — ' : ''}{formatDateRelative(t.due_date || t.competency_date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 tabular-nums shrink-0">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Send Card */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <GroupSendCard />
      </div>
    </div>
  )
}
