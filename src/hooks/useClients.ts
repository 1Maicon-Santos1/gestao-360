import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface Client {
  id: string
  user_id: string
  name: string
  trade_name: string | null
  client_type: 'individual' | 'company'
  document: string | null
  phone: string | null
  email: string | null
  is_recurring: boolean
  default_amount: number | null
  due_day: number | null
  preferred_payment_method: string | null
  service_description: string | null
  origin: string | null
  status: 'active' | 'inactive'
  notes: string | null
  tags: string[] | null
  total_received: number
  created_at: string
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as Client[]
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Client, 'id' | 'user_id' | 'total_received' | 'created_at'>) => {
      const { error } = await supabase.from('clients').insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente criado com sucesso!')
    },
    onError: (e) => { console.error('[useCreateClient]', e); toast.error('Erro ao criar cliente.') },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const { error } = await supabase.from('clients').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente atualizado!')
    },
    onError: (e) => { console.error('[useUpdateClient]', e); toast.error('Erro ao atualizar cliente.') },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente excluído!')
    },
    onError: (e) => { console.error('[useDeleteClient]', e); toast.error('Erro ao excluir cliente.') },
  })
}
