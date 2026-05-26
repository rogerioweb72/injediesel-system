import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface UnitCustomCategory {
  id: string
  unit_id: string
  name: string
  created_at: string
}

export function useUnitCategories(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['unit_custom_categories', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('unit_custom_categories')
        .select('id, unit_id, name, created_at')
        .eq('unit_id', unitId)
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as UnitCustomCategory[]
    },
  })
}

export function useCreateUnitCategory(unitId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await sb()
        .from('unit_custom_categories')
        .insert({ unit_id: unitId, name: name.trim() })
        .select('id, unit_id, name, created_at')
        .single()
      if (error) throw error
      return data as UnitCustomCategory
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit_custom_categories', unitId] })
    },
  })
}
