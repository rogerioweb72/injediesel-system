import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { PriceTier } from '@/types/app'

export interface CustomerAddress {
  cidade?: string
  estado?: string
  logradouro?: string
  numero?: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  document_type?: string
  address: CustomerAddress | null
  active: boolean
  price_tier: PriceTier
  unit_id: string | null
  created_at: string
}

interface ListFilter {
  q?: string
  page?: number
  pageSize?: number
  scope?: 'all' | 'matrix'
  unitId?: string
}

export function useCustomers({ q = '', page = 0, pageSize = 20, scope, unitId }: ListFilter = {}) {
  return useQuery({
    queryKey: ['customers', q, page, pageSize, scope, unitId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('customers')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (unitId) {
        query = query.eq('unit_id', unitId)
      } else if (scope === 'matrix') {
        query = query.is('unit_id', null)
      }

      if (q) {
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,document.ilike.%${q}%`)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Customer[], total: (count as number) ?? 0 }
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').select('*').eq('id', id).single()
      if (error) throw error
      return data as Customer
    },
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: Omit<Customer, 'id' | 'created_at'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').insert(payload).select().single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      log({ entity: 'customer', entityId: c.id, action: 'created' })
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Customer> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', c.id] })
      log({ entity: 'customer', entityId: c.id, action: 'updated' })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      log({ entity: 'customer', entityId: id, action: 'deleted' })
    },
  })
}
