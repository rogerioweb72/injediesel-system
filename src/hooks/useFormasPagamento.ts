import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface FormaPagamento {
  id: string
  unit_id: string | null
  name: string
  fee_percentage: number
  receipt_days: number
  max_installments: number
  active: boolean
}

export function useFormasPagamento(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['formas-pagamento', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('formas_pagamento').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as FormaPagamento[]
    },
  })
}

export function useUpsertFormaPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      fee_percentage: number
      receipt_days: number
      max_installments: number
    }) => {
      const { data, error } = await sb()
        .from('formas_pagamento')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as FormaPagamento
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento', vars.unit_id] })
    },
  })
}

export function useDeactivateFormaPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: FormaPagamento) => {
      const { error } = await sb().from('formas_pagamento').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento', item.unit_id] })
    },
  })
}
