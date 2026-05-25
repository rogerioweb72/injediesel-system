import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface Servico {
  id: string
  unit_id: string | null
  name: string
  description: string | null
  default_price: number | null
  estimated_min: number | null
  active: boolean
  created_at: string
}

export function useServicos(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['servicos', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('servicos').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as Servico[]
    },
  })
}

export function useUpsertServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      description: string | null
      default_price: number | null
      estimated_min: number | null
    }) => {
      const { data, error } = await sb()
        .from('servicos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Servico
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['servicos', vars.unit_id] })
    },
  })
}

export function useDeactivateServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Servico) => {
      const { error } = await sb().from('servicos').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['servicos', item.unit_id] })
    },
  })
}
