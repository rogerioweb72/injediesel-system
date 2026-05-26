import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Period helpers ───────────────────────────────────────────────────────────

export interface PeriodFilter {
  dateFrom: string  // "YYYY-MM-DD"
  dateTo: string    // "YYYY-MM-DD"
}

export interface MonthRef {
  year: number
  month: number
}

export function computeMonthsInRange(dateFrom: string, dateTo: string): MonthRef[] {
  const months: MonthRef[] = []
  const end = new Date(dateTo)
  const cur = new Date(dateFrom)
  cur.setDate(1)
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface EcuJobReport {
  id: string
  customer_id: string
  customer_name: string
  service_type: string
  status: string
  amount_charged_to_customer: number
  amount_charged_by_matrix: number
  franchise_margin_amount: number
  franchise_margin_percentage: number
  created_at: string
}

export interface OrderReport {
  id: string
  total: number
  created_at: string
  source: 'order' | 'pos'
  customer_id: string | null
}

export interface FinancialEntryReport {
  id: string
  type: 'receita' | 'despesa'
  amount: number
  description: string
  category_name: string
  period_year: number
  period_month: number
}

export interface CommissionReport {
  id: string
  seller_id: string
  seller_name: string
  amount: number
  paid: boolean
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEcuJobsReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-ecu', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('id, customer_id, service_type, status, amount_charged_to_customer, amount_charged_by_matrix, franchise_margin_amount, franchise_margin_percentage, created_at, customers(name)')
        .eq('unit_id', unitId)
        .gte('created_at', period!.dateFrom)
        .lte('created_at', period!.dateTo + 'T23:59:59')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        customer_id: row.customer_id,
        customer_name: row.customers?.name ?? '—',
        service_type: row.service_type ?? '—',
        status: row.status,
        amount_charged_to_customer: Number(row.amount_charged_to_customer ?? 0),
        amount_charged_by_matrix:   Number(row.amount_charged_by_matrix ?? 0),
        franchise_margin_amount:    Number(row.franchise_margin_amount ?? 0),
        franchise_margin_percentage: Number(row.franchise_margin_percentage ?? 0),
        created_at: row.created_at,
      })) as EcuJobReport[]
    },
  })
}

export function useOrdersReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-orders', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      const [ordersRes, posRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('orders')
          .select('id, total, created_at, customer_id')
          .eq('unit_id', unitId)
          .gte('created_at', period!.dateFrom)
          .lte('created_at', period!.dateTo + 'T23:59:59'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('pos_sales')
          .select('id, total, created_at, customer_id')
          .gte('created_at', period!.dateFrom)
          .lte('created_at', period!.dateTo + 'T23:59:59'),
      ])
      if (ordersRes.error) throw ordersRes.error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders: OrderReport[] = (ordersRes.data ?? []).map((r: any) => ({ ...r, source: 'order' as const, total: Number(r.total ?? 0) }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos: OrderReport[] = (posRes.data ?? []).map((r: any) => ({ ...r, source: 'pos' as const, total: Number(r.total ?? 0) }))
      return [...orders, ...pos]
    },
  })
}

export function useFinancialEntriesReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-financeiro', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      const months = computeMonthsInRange(period!.dateFrom, period!.dateTo)
      const yearRange = [...new Set(months.map((m) => m.year))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('financial_entries')
        .select('id, type, amount, description, period_year, period_month, financial_categories(name)')
        .eq('unit_id', unitId)
        .in('period_year', yearRange)
        .order('period_year', { ascending: false })
      if (error) throw error
      const monthKeys = new Set(months.map((m) => `${m.year}-${m.month}`))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .filter((r) => monthKeys.has(`${r.period_year}-${r.period_month}`))
        .map((r) => ({
          id: r.id,
          type: r.type as 'receita' | 'despesa',
          amount: Number(r.amount ?? 0),
          description: r.description ?? '',
          category_name: r.financial_categories?.name ?? '—',
          period_year: r.period_year,
          period_month: r.period_month,
        })) as FinancialEntryReport[]
    },
  })
}

export function useCommissionsReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-commissions', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roles, error: rolesErr } = await (supabase as any)
        .from('user_unit_roles')
        .select('user_id')
        .eq('unit_id', unitId)
      if (rolesErr) throw rolesErr
      const sellerIds: string[] = (roles ?? []).map((r: { user_id: string }) => r.user_id)
      if (!sellerIds.length) return [] as CommissionReport[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('id, seller_id, amount, paid, profiles(name)')
        .in('seller_id', sellerIds)
        .gte('created_at', period!.dateFrom)
        .lte('created_at', period!.dateTo + 'T23:59:59')
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        seller_id: r.seller_id,
        seller_name: r.profiles?.name ?? '—',
        amount: Number(r.amount ?? 0),
        paid: r.paid,
      })) as CommissionReport[]
    },
  })
}

export function useUnitRoyalty(unitId?: string) {
  return useQuery({
    queryKey: ['unit-royalty', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units')
        .select('royalty_enabled, royalty_percentage')
        .eq('id', unitId)
        .single()
      if (error) return { royalty_enabled: false, royalty_percentage: 0 }
      return data as { royalty_enabled: boolean; royalty_percentage: number }
    },
  })
}
