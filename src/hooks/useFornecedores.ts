import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface Fornecedor {
  id: string
  unit_id: string | null
  name: string
  document: string | null
  contact: string | null
  payment_term_days: number
  notes: string | null
  active: boolean
  created_at: string
}

// unitId: undefined = still loading; null = matrix; string = franchise
export function useFornecedores(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['fornecedores', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('fornecedores').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as Fornecedor[]
    },
  })
}

export function useUpsertFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      document: string | null
      contact: string | null
      payment_term_days: number
      notes: string | null
    }) => {
      const { data, error } = await sb()
        .from('fornecedores')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Fornecedor
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fornecedores', vars.unit_id] })
    },
  })
}

export function useDeactivateFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Fornecedor) => {
      const { error } = await sb().from('fornecedores').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['fornecedores', item.unit_id] })
    },
  })
}
