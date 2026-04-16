import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { FIXED_USER_ID } from '@/lib/constants'

export interface Category {
  id: string
  user_id: string
  name: string
  category_type: 'income' | 'expense'
  context_type: 'personal' | 'business' | 'both'
  color: string
  icon: string | null
  is_active: boolean
  is_fixed: boolean
  created_at: string
}

export interface Subcategory {
  id: string
  category_id: string
  user_id: string
  name: string
  color: string | null
  is_active: boolean
  created_at: string
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*, subcategories:financial_subcategories(*)')
        .eq('user_id', FIXED_USER_ID)
        .order('name')
      if (error) throw error
      return data as (Category & { subcategories: Subcategory[] })[]
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('financial_categories')
        .insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoria criada!')
    },
    onError: (e) => { console.error('[useCreateCategory]', e); toast.error('Erro ao criar categoria.') },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from('financial_categories').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoria atualizada!')
    },
    onError: (e) => { console.error('[useUpdateCategory]', e); toast.error('Erro ao atualizar categoria.') },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoria excluída!')
    },
    onError: (e) => { console.error('[useDeleteCategory]', e); toast.error('Erro ao excluir categoria.') },
  })
}

export function useCreateSubcategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { category_id: string; name: string; color?: string }) => {
      const { error } = await supabase
        .from('financial_subcategories')
        .insert({ ...data, user_id: FIXED_USER_ID })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Subcategoria criada!')
    },
    onError: (e) => { console.error('[useCreateSubcategory]', e); toast.error('Erro ao criar subcategoria.') },
  })
}

export function useDeleteSubcategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_subcategories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Subcategoria excluída!')
    },
    onError: (e) => { console.error('[useDeleteSubcategory]', e); toast.error('Erro ao excluir subcategoria.') },
  })
}
