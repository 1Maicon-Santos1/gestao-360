import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface Transaction {
  id: string
  user_id: string
  context_type: 'personal' | 'business'
  transaction_type: 'income' | 'expense' | 'transfer'
  status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled'
  description: string
  amount: number
  competency_date: string
  settlement_date: string | null
  due_date: string | null
  account_id: string | null
  destination_account_id: string | null
  card_id: string | null
  category_id: string | null
  subcategory_id: string | null
  client_id: string | null
  supplier_id: string | null
  responsible_person_id: string | null
  cost_center_id: string | null
  recurring_rule_id: string | null
  installment_number: number | null
  installment_total: number | null
  payment_method: string | null
  notes: string | null
  tags: string[] | null
  attachment_count: number
  is_deleted: boolean
  created_at: string
  // joined
  account?: { name: string; color: string } | null
  destination_account?: { name: string; color: string } | null
  category?: { name: string; color: string } | null
  responsible?: { name: string; color: string } | null
  client?: { name: string } | null
}

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense' | 'transfer' | 'all'
  context?: 'personal' | 'business' | 'all'
  status?: string
  categoryId?: string
  responsibleId?: string
  accountId?: string
  search?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          account:financial_accounts!account_id(name, color),
          destination_account:financial_accounts!destination_account_id(name, color),
          category:financial_categories(name, color),
          responsible:people_responsible(name, color),
          client:clients(name)
        `)
        .eq('user_id', FIXED_USER_ID)
        .eq('is_deleted', false)
        .order('competency_date', { ascending: false })

      if (filters.startDate) query = query.gte('competency_date', filters.startDate)
      if (filters.endDate) query = query.lte('competency_date', filters.endDate)
      if (filters.type && filters.type !== 'all') query = query.eq('transaction_type', filters.type)
      if (filters.context && filters.context !== 'all') query = query.eq('context_type', filters.context)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.responsibleId) query = query.eq('responsible_person_id', filters.responsibleId)
      if (filters.accountId) query = query.eq('account_id', filters.accountId)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Transaction, 'id' | 'user_id' | 'attachment_count' | 'is_deleted' | 'created_at' | 'account' | 'destination_account' | 'category' | 'responsible' | 'client'>) => {
      const { error } = await supabase
        .from('financial_transactions')
        .insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Lançamento criado com sucesso!')
    },
    onError: (e) => { console.error('[useCreateTransaction]', e); toast.error('Erro ao criar lançamento.') },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase.from('financial_transactions').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Lançamento atualizado!')
    },
    onError: (e) => { console.error('[useUpdateTransaction]', e); toast.error('Erro ao atualizar lançamento.') },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_transactions')
        .update({ is_deleted: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Lançamento excluído!')
    },
    onError: (e) => { console.error('[useDeleteTransaction]', e); toast.error('Erro ao excluir lançamento.') },
  })
}

export function useMarkAsPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'income' | 'expense' }) => {
      const status = type === 'income' ? 'received' : 'paid'
      const { error } = await supabase
        .from('financial_transactions')
        .update({ status, settlement_date: new Date().toISOString().split('T')[0] })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Status atualizado!')
    },
    onError: (e) => { console.error('[useMarkAsPaid]', e); toast.error('Erro ao atualizar status.') },
  })
}
