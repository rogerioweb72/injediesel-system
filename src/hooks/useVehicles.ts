import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { VehicleType } from '@/types/app'

export interface Vehicle {
  id: string
  customer_id: string
  plate: string | null
  brand: string
  model: string
  year: number | null
  vehicle_type: VehicleType
  engine: string | null
  notes: string | null
  created_at: string
}

export function useVehicles(customerId: string) {
  return useQuery({
    queryKey: ['vehicles', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Vehicle[]
    },
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: Omit<Vehicle, 'id' | 'created_at'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles').insert(payload).select().single()
      if (error) throw error
      return data as Vehicle
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['vehicles', v.customer_id] })
      log({ entity: 'vehicle', entityId: v.id, action: 'created', metadata: { customerId: v.customer_id } })
    },
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('vehicles').delete().eq('id', id)
      if (error) throw error
      return { id, customerId }
    },
    onSuccess: ({ id, customerId }) => {
      qc.invalidateQueries({ queryKey: ['vehicles', customerId] })
      log({ entity: 'vehicle', entityId: id, action: 'deleted' })
    },
  })
}
