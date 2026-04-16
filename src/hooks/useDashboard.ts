import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export interface DashboardData {
  totalBalance: number
  personalBalance: number
  businessBalance: number
  monthIncome: number
  monthExpense: number
  monthProfit: number
  totalReceivable: number
  totalPayable: number
  overdueReceivable: number
  overduePayable: number
  upcomingPayables: Transaction[]
  upcomingReceivables: Transaction[]
  topExpenses: { category: string; amount: number; color: string }[]
  cashFlowChart: { date: string; income: number; expense: number }[]
  accountBalances: { name: string; balance: number; color: string }[]
}

interface Transaction {
  id: string
  description: string
  amount: number
  due_date: string | null
  competency_date: string
  status: string
}

export function useDashboard() {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['dashboard', monthStart],
    queryFn: async () => {
      const [accountsRes, transactionsRes, upcomingRes] = await Promise.all([
        supabase
          .from('financial_accounts')
          .select('name, current_balance, color, context_type, is_active')
          .eq('user_id', FIXED_USER_ID)
          .eq('is_active', true),

        supabase
          .from('financial_transactions')
          .select('transaction_type, status, amount, context_type, category:financial_categories(name, color), due_date, description, competency_date, id')
          .eq('user_id', FIXED_USER_ID)
          .eq('is_deleted', false)
          .gte('competency_date', monthStart)
          .lte('competency_date', monthEnd),

        supabase
          .from('financial_transactions')
          .select('id, description, amount, due_date, competency_date, status, transaction_type')
          .eq('user_id', FIXED_USER_ID)
          .eq('is_deleted', false)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
          .limit(10),
      ])

      const accounts = accountsRes.data ?? []
      const transactions = transactionsRes.data ?? []
      const upcoming = upcomingRes.data ?? []

      const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0)
      const personalBalance = accounts.filter((a) => a.context_type === 'personal').reduce((s, a) => s + (a.current_balance || 0), 0)
      const businessBalance = accounts.filter((a) => a.context_type === 'business').reduce((s, a) => s + (a.current_balance || 0), 0)

      const settled = transactions.filter((t) => ['paid', 'received'].includes(t.status))
      const monthIncome = settled.filter((t) => t.transaction_type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
      const monthExpense = settled.filter((t) => t.transaction_type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
      const monthProfit = monthIncome - monthExpense

      const pending = transactions.filter((t) => t.status === 'pending')
      const totalReceivable = pending.filter((t) => t.transaction_type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
      const totalPayable = pending.filter((t) => t.transaction_type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)

      const today = format(now, 'yyyy-MM-dd')
      const overdueReceivable = transactions
        .filter((t) => t.transaction_type === 'income' && t.status === 'pending' && t.due_date && t.due_date < today)
        .reduce((s, t) => s + (t.amount || 0), 0)
      const overduePayable = transactions
        .filter((t) => t.transaction_type === 'expense' && t.status === 'pending' && t.due_date && t.due_date < today)
        .reduce((s, t) => s + (t.amount || 0), 0)

      const categoryMap = new Map<string, { amount: number; color: string }>()
      transactions
        .filter((t) => t.transaction_type === 'expense' && ['paid', 'pending'].includes(t.status))
        .forEach((t) => {
          const cat = (t as any).category
          const key = cat?.name ?? 'Sem categoria'
          const color = cat?.color ?? '#6b7280'
          const prev = categoryMap.get(key) ?? { amount: 0, color }
          categoryMap.set(key, { amount: prev.amount + t.amount, color })
        })
      const topExpenses = Array.from(categoryMap.entries())
        .map(([category, { amount, color }]) => ({ category, amount, color }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const chartMap = new Map<string, { income: number; expense: number }>()
      transactions.forEach((t) => {
        const date = t.competency_date
        const prev = chartMap.get(date) ?? { income: 0, expense: 0 }
        if (t.transaction_type === 'income') prev.income += t.amount || 0
        if (t.transaction_type === 'expense') prev.expense += t.amount || 0
        chartMap.set(date, prev)
      })
      const cashFlowChart = Array.from(chartMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const accountBalances = accounts.map((a) => ({ name: a.name, balance: a.current_balance || 0, color: a.color || '#6366f1' }))
      const upcomingPayables = upcoming.filter((t) => t.transaction_type === 'expense') as Transaction[]
      const upcomingReceivables = upcoming.filter((t) => t.transaction_type === 'income') as Transaction[]

      return { totalBalance, personalBalance, businessBalance, monthIncome, monthExpense, monthProfit, totalReceivable, totalPayable, overdueReceivable, overduePayable, upcomingPayables, upcomingReceivables, topExpenses, cashFlowChart, accountBalances } as DashboardData
    },
  })
}
