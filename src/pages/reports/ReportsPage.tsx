import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileBarChart, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { useTransactions } from '@/hooks/useTransactions'
import { useResponsible } from '@/hooks/useResponsible'
import { useClients } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f97316', '#eab308', '#14b8a6', '#8b5cf6', '#ec4899']

const TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [context, setContext] = useState<'all' | 'personal' | 'business'>('all')

  const { data: transactions = [], isLoading } = useTransactions({
    startDate,
    endDate,
    context: context === 'all' ? undefined : context,
  })
  const { data: responsible = [] } = useResponsible()
  const { data: clients = [] } = useClients()

  // By category
  const categoryMap = new Map<string, { income: number; expense: number; color: string }>()
  transactions.forEach((t) => {
    if (t.transaction_type === 'transfer') return
    const key = t.category?.name ?? 'Sem categoria'
    const color = t.category?.color ?? '#6b7280'
    const prev = categoryMap.get(key) ?? { income: 0, expense: 0, color }
    if (t.transaction_type === 'income') prev.income += t.amount
    if (t.transaction_type === 'expense') prev.expense += t.amount
    categoryMap.set(key, prev)
  })
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
    .slice(0, 10)

  // By responsible
  const respMap = new Map<string, number>()
  transactions.filter((t) => t.transaction_type === 'expense').forEach((t) => {
    const key = t.responsible?.name ?? 'Sem responsável'
    respMap.set(key, (respMap.get(key) ?? 0) + t.amount)
  })
  const responsibleData = Array.from(respMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Monthly totals (last 6 months from endDate)
  const monthlyMap = new Map<string, { income: number; expense: number }>()
  transactions.forEach((t) => {
    if (t.transaction_type === 'transfer') return
    const month = t.competency_date.slice(0, 7)
    const prev = monthlyMap.get(month) ?? { income: 0, expense: 0 }
    if (t.transaction_type === 'income') prev.income += t.amount
    if (t.transaction_type === 'expense') prev.expense += t.amount
    monthlyMap.set(month, prev)
  })
  const monthlyData = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month: format(new Date(month + '-01'), 'MMM/yy', { locale: ptBR }),
      ...v,
    }))

  // Summary
  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análise detalhada das suas finanças"
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => toast.info('Exportação em PDF será disponibilizada em breve.')}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="space-y-1">
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contexto</Label>
          <Select value={context} onValueChange={(v) => setContext(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="personal">Pessoal</SelectItem>
              <SelectItem value="business">Empresa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /><p className="text-xs text-green-700 font-medium">Total de Receitas</p></div>
            <p className="text-xl font-bold text-green-700 tabular-nums mt-1">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /><p className="text-xs text-red-700 font-medium">Total de Despesas</p></div>
            <p className="text-xl font-bold text-red-700 tabular-nums mt-1">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className={cn(totalIncome - totalExpense >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className={cn('text-xs font-medium', totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-700')}>Resultado</p>
            <p className={cn('text-xl font-bold tabular-nums mt-1', totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-700')}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="monthly">Por Mês</TabsTrigger>
          <TabsTrigger value="category">Por Categoria</TabsTrigger>
          <TabsTrigger value="responsible">Por Responsável</TabsTrigger>
        </TabsList>

        {/* Monthly */}
        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Receitas vs Despesas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<TOOLTIP />} />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category */}
        <TabsContent value="category" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64" /> : categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={categoryData.filter((c) => c.expense > 0)}
                        dataKey="expense"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Tabela por Categoria</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {categoryData.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color || COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{c.name}</span>
                        </div>
                        <div className="flex gap-4 text-sm tabular-nums">
                          {c.income > 0 && <span className="text-green-600">+{formatCurrency(c.income)}</span>}
                          {c.expense > 0 && <span className="text-red-500">−{formatCurrency(c.expense)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Responsible */}
        <TabsContent value="responsible" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Despesas por Responsável</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : responsibleData.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <FileBarChart className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Sem dados para este período</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responsibleData.map((r, i) => {
                    const max = responsibleData[0].amount
                    const pct = max > 0 ? (r.amount / max) * 100 : 0
                    return (
                      <div key={r.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{r.name}</span>
                          <span className="tabular-nums text-red-500">{formatCurrency(r.amount)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
