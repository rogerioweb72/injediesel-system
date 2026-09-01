import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface FranchiseProduct {
  id: string
  contract_type: 'full' | 'linha_leve'
  name: string
  default_fee: number
  commission_type: 'percent' | 'fixed'
  commission_value: number
  active: boolean
}

export function useFranchiseProducts() {
  return useQuery({
    queryKey: ['franchise-products'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('franchise_products')
        .select('*')
        .order('contract_type')
      if (error) throw error
      return (data ?? []) as FranchiseProduct[]
    },
  })
}

export function useUpdateFranchiseProduct() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<FranchiseProduct> & { id: string }) => {
      const { data, error } = await sb()
        .from('franchise_products')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FranchiseProduct
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['franchise-products'] })
      log({ entity: 'franchise_product', entityId: p.id, action: 'updated', metadata: { name: p.name } })
    },
  })
}
