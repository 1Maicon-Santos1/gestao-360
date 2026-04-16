import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface Responsible {
  id: string
  user_id: string
  name: string
  person_type: 'partner' | 'employee' | 'family' | 'other'
  color: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export function useResponsible() {
  return useQuery({
    queryKey: ['responsible'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people_responsible')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as Responsible[]
    },
  })
}

export function useCreateResponsible() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Responsible, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('people_responsible')
        .insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsible'] })
      toast.success('Responsável criado com sucesso!')
    },
    onError: (e) => { console.error('[useCreateResponsible]', e); toast.error('Erro ao criar responsável.') },
  })
}

export function useUpdateResponsible() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Responsible> & { id: string }) => {
      const { error } = await supabase.from('people_responsible').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsible'] })
      toast.success('Responsável atualizado!')
    },
    onError: (e) => { console.error('[useUpdateResponsible]', e); toast.error('Erro ao atualizar responsável.') },
  })
}

export function useDeleteResponsible() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people_responsible').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsible'] })
      toast.success('Responsável excluído!')
    },
    onError: (e) => { console.error('[useDeleteResponsible]', e); toast.error('Erro ao excluir responsável.') },
  })
}
