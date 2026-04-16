import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import { format, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const TOOLTIP = ({ active, payload, label }: any) => {
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

export default function CashFlowPage() {
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [context, setContext] = useState<'all' | 'personal' | 'business'>('all')
  const [accountId, setAccountId] = useState<string>('all')

  const monthStart = format(startOfMonth(referenceDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(referenceDate), 'yyyy-MM-dd')
  const monthLabel = format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })

  const { data: transactions = [], isLoading } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    context: context === 'all' ? undefined : context,
    accountId: accountId === 'all' ? undefined : accountId,
  })

  const { data: accounts = [] } = useAccounts()

  // Build daily cash flow
  const days = eachDayOfInterval({
    start: startOfMonth(referenceDate),
    end: endOfMonth(referenceDate),
  })

  const dailyMap = new Map<string, { income: number; expense: number; balance: number }>()
  days.forEach((d) => {
    dailyMap.set(format(d, 'yyyy-MM-dd'), { income: 0, expense: 0, balance: 0 })
  })

  transactions.forEach((t) => {
    if (t.transaction_type === 'transfer') return
    const key = t.competency_date
    const entry = dailyMap.get(key)
    if (!entry) return
    if (t.transaction_type === 'income') entry.income += t.amount
    if (t.transaction_type === 'expense') entry.expense += t.amount
  })

  let runningBalance = 0
  const chartData = Array.from(dailyMap.entries()).map(([date, v]) => {
    runningBalance += v.income - v.expense
    return {
      date: date.slice(8), // day number
      fullDate: date,
      income: v.income,
      expense: v.expense,
      balance: runningBalance,
    }
  })

  // Totals
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const projected = totalIncome - totalExpense

  // Transactions list sorted by date
  const sorted = [...transactions]
    .filter((t) => t.transaction_type !== 'transfer')
    .sort((a, b) => a.competency_date.localeCompare(b.competency_date))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        description="Visualize entradas, saídas e saldo projetado"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card px-1 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReferenceDate((d) => addMonths(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium capitalize min-w-[160px] text-center">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReferenceDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={context} onValueChange={(v) => setContext(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="personal">Pessoal</SelectItem>
            <SelectItem value="business">Empresa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())}>
          Hoje
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-green-700 font-medium">Total de Entradas</p>
            <p className="text-xl font-bold text-green-700 tabular-nums mt-1">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-red-700 font-medium">Total de Saídas</p>
            <p className="text-xl font-bold text-red-700 tabular-nums mt-1">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className={cn(projected >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className={cn('text-xs font-medium', projected >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              Saldo Projetado
            </p>
            <p className={cn('text-xl font-bold tabular-nums mt-1', projected >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              {formatCurrency(projected)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="area">
        <TabsList>
          <TabsTrigger value="area">Projeção Acumulada</TabsTrigger>
          <TabsTrigger value="bar">Entradas vs Saídas</TabsTrigger>
        </TabsList>

        <TabsContent value="area" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Saldo acumulado — {monthLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip content={<TOOLTIP />} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Saldo"
                      stroke="#6366f1"
                      fill="url(#balanceGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Entradas vs Saídas por dia</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip content={<TOOLTIP />} />
                    <Legend />
                    <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Movimentações do período</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma movimentação neste período</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.competency_date)}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold tabular-nums ml-4',
                    t.transaction_type === 'income' ? 'text-green-600' : 'text-red-500',
                  )}>
                    {t.transaction_type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
