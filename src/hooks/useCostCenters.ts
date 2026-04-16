import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface CostCenter {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
}

export function useCostCenters() {
  return useQuery({
    queryKey: ['cost_centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as CostCenter[]
    },
  })
}

export function useCreateCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<CostCenter, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('cost_centers')
        .insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] })
      toast.success('Centro de custo criado!')
    },
    onError: (e) => { console.error('[useCreateCostCenter]', e); toast.error('Erro ao criar centro de custo.') },
  })
}

export function useUpdateCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CostCenter> & { id: string }) => {
      const { error } = await supabase.from('cost_centers').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] })
      toast.success('Centro de custo atualizado!')
    },
    onError: (e) => { console.error('[useUpdateCostCenter]', e); toast.error('Erro ao atualizar centro de custo.') },
  })
}

export function useDeleteCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] })
      toast.success('Centro de custo excluído!')
    },
    onError: (e) => { console.error('[useDeleteCostCenter]', e); toast.error('Erro ao excluir centro de custo.') },
  })
}
