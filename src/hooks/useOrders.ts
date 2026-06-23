import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'
import type { PriceTier } from '@/types/app'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Order {
  id: string
  customer_id: string | null
  unit_id: string | null
  price_tier: PriceTier
  status: string
  total: number
  payment_status: string
  payment_method: string | null
  created_by: string | null
  created_at: string
  customers?: { name: string } | null
  order_items?: OrderItem[]
}

export interface PosItem {
  id: string
  sale_id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface PosSale {
  id: string
  customer_id: string | null
  price_tier: PriceTier
  total: number
  payment_method: string
  created_by: string | null
  created_at: string
  customers?: { name: string } | null
  pos_sale_items?: PosItem[]
}

// ─── Orders ───────────────────────────────────────────────────────────────────

interface ListFilter { page?: number; pageSize?: number }

export function useOrders({ page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['orders', page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error, count } = await (supabase as any)
        .from('orders')
        .select('*, customers(name), order_items(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      return { data: data as Order[], total: (count as number) ?? 0 }
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*, customers(name), order_items(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Order
    },
  })
}

// ─── PDV (pos_sales) ──────────────────────────────────────────────────────────

export function usePosSales({ page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['pos-sales', page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error, count } = await (supabase as any)
        .from('pos_sales')
        .select('*, customers(name), pos_sale_items(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      return { data: data as PosSale[], total: (count as number) ?? 0 }
    },
  })
}

interface CartLine {
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
}

interface CheckoutPayload {
  customer_id: string | null
  price_tier: PriceTier
  payment_method: string
  items: CartLine[]
}

export function useCheckout() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ customer_id, price_tier, payment_method, items }: CheckoutPayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

      const { data: sale, error } = await sb
        .from('pos_sales')
        .insert({ customer_id, price_tier, total, payment_method, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error

      const saleItems = items.map((i) => ({ ...i, sale_id: sale.id }))
      const { error: itemErr } = await sb.from('pos_sale_items').insert(saleItems)
      if (itemErr) throw itemErr

      return sale as PosSale
    },
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] })
      log({ entity: 'pos_sale', entityId: sale.id, action: 'created', metadata: { total: sale.total } })
    },
  })
}

// ─── Franchise purchase order ─────────────────────────────────────────────────

interface FranchiseOrderPayload {
  unit_id: string
  price_tier: PriceTier
  payment_method: string
  total: number
  items: { product_id: string; description: string; quantity: number; unit_price: number }[]
}

export function useCreateFranchiseOrder() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ items, ...order }: FranchiseOrderPayload) => {
      const sb = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
      const orderId = crypto.randomUUID()

      const { error } = await sb
        .from('orders')
        .insert({
          id: orderId,
          unit_id: order.unit_id,
          price_tier: order.price_tier,
          payment_method: order.payment_method,
          total: order.total,
          status: 'aguardando_aprovacao',
          payment_status: 'pendente',
          created_by: user?.id ?? null,
        })
      if (error) throw error

      const orderItems = items.map(i => ({ ...i, order_id: orderId }))
      const { error: itemErr } = await sb.from('order_items').insert(orderItems)
      if (itemErr) throw itemErr

      return { id: orderId, total: order.total }
    },
    onSuccess: ({ id, total }) => {
      qc.invalidateQueries({ queryKey: ['franchise-orders'] })
      log({ entity: 'order', entityId: id, action: 'created', metadata: { total } })
    },
  })
}

export function useAllFranchiseOrders() {
  return useQuery({
    queryKey: ['franchise-orders-matrix'],
    queryFn: async () => {
      const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .select('*, franchise_units(name, city, state, cep, logradouro, numero, complemento, bairro), order_items(id, description, quantity, unit_price)')
        .not('unit_id', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Order & {
        franchise_units: { name: string; city: string | null; state: string | null } | null
        order_items: { id: string; description: string; quantity: number; unit_price: number }[]
      })[]
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .update({ status })
        .eq('id', id)
      if (error) throw error
      return { id, status }
    },
    onSuccess: ({ id, status }) => {
      qc.invalidateQueries({ queryKey: ['franchise-orders-matrix'] })
      qc.invalidateQueries({ queryKey: ['franchise-orders'] })
      log({ entity: 'order', entityId: id, action: 'status_changed', metadata: { status } })
    },
  })
}

export function useFranchiseOrders(unitId: string | undefined) {
  return useQuery({
    queryKey: ['franchise-orders', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .select('*, order_items(*)')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Order[]
    },
  })
}
