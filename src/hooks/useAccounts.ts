import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface Account {
  id: string
  user_id: string
  context_type: 'personal' | 'business'
  name: string
  account_type: 'checking' | 'savings' | 'cash' | 'digital' | 'investment' | 'other'
  institution: string | null
  initial_balance: number
  current_balance: number
  color: string
  icon: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  context_type: 'personal' | 'business'
  name: string
  institution: string | null
  credit_limit: number
  available_limit: number
  closing_day: number | null
  due_day: number | null
  best_purchase_day: number | null
  color: string
  is_active: boolean
  payment_account_id: string | null
  created_at: string
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as Account[]
    },
  })
}

export function useCreditCards() {
  return useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as CreditCard[]
    },
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Account, 'id' | 'user_id' | 'current_balance' | 'created_at'>) => {
      const { error } = await supabase.from('financial_accounts').insert({
        ...data,
        user_id: FIXED_USER_ID,
        current_balance: data.initial_balance,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Conta criada com sucesso!')
    },
    onError: (e) => { console.error('[useCreateAccount]', e); toast.error('Erro ao criar conta.') },
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Account> & { id: string }) => {
      const { error } = await supabase.from('financial_accounts').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Conta atualizada!')
    },
    onError: (e) => { console.error('[useUpdateAccount]', e); toast.error('Erro ao atualizar conta.') },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_accounts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Conta excluída!')
    },
    onError: (e) => { console.error('[useDeleteAccount]', e); toast.error('Erro ao excluir conta.') },
  })
}

export function useCreateCreditCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<CreditCard, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase.from('credit_cards').insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
      toast.success('Cartão criado com sucesso!')
    },
    onError: (e) => { console.error('[useCreateCreditCard]', e); toast.error('Erro ao criar cartão.') },
  })
}

export function useUpdateCreditCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreditCard> & { id: string }) => {
      const { error } = await supabase.from('credit_cards').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
      toast.success('Cartão atualizado!')
    },
    onError: (e) => { console.error('[useUpdateCreditCard]', e); toast.error('Erro ao atualizar cartão.') },
  })
}

export function useDeleteCreditCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
      toast.success('Cartão excluído!')
    },
    onError: (e) => { console.error('[useDeleteCreditCard]', e); toast.error('Erro ao excluir cartão.') },
  })
}
