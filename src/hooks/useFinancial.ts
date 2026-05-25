import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'

export interface FinancialCategory {
  id: string
  name: string
  type: 'receita' | 'despesa'
  subtipo: 'fixa' | 'variavel' | null
}

export interface FinancialEntry {
  id: string
  category_id: string | null
  unit_id: string | null
  type: 'receita' | 'despesa'
  amount: number
  description: string | null
  reference_id: string | null
  period_year: number
  period_month: number
  created_by: string | null
  created_at: string
  financial_categories?: FinancialCategory | null
}

export interface MonthlyClosing {
  id: string
  unit_id: string | null
  year: number
  month: number
  closed: boolean
  closed_by: string | null
  closed_at: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function useFinancialCategories() {
  return useQuery({
    queryKey: ['financial-categories'],
    queryFn: async () => {
      const { data, error } = await sb().from('financial_categories').select('*').order('name')
      if (error) throw error
      return data as FinancialCategory[]
    },
  })
}

export function useUpsertFinancialCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      name: string
      type: 'receita' | 'despesa'
      subtipo: 'fixa' | 'variavel' | null
    }) => {
      const { data, error } = await sb()
        .from('financial_categories')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as FinancialCategory
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-categories'] })
    },
  })
}

interface EntriesFilter {
  year: number
  month: number
  page?: number
  pageSize?: number
}

export function useFinancialEntries({ year, month, page = 0, pageSize = 30 }: EntriesFilter) {
  return useQuery({
    queryKey: ['financial-entries', year, month, page, pageSize],
    queryFn: async () => {
      const { data, error, count } = await sb()
        .from('financial_entries')
        .select('*, financial_categories(id,name,type)', { count: 'exact' })
        .eq('period_year', year)
        .eq('period_month', month)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      return { data: data as FinancialEntry[], total: (count as number) ?? 0 }
    },
  })
}

export function useMonthlyClosing(year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-closing', year, month],
    queryFn: async () => {
      const { data } = await sb()
        .from('monthly_closings')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .is('unit_id', null)
        .single()
      return data as MonthlyClosing | null
    },
  })
}

interface CreateEntryPayload {
  category_id: string | null
  type: 'receita' | 'despesa'
  amount: number
  description: string
  period_year: number
  period_month: number
}

export function useCreateFinancialEntry() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (payload: CreateEntryPayload) => {
      const { data, error } = await sb()
        .from('financial_entries')
        .insert({ ...payload, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as FinancialEntry
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ['financial-entries'] })
      log({ entity: 'financial_entry', entityId: entry.id, action: 'created', metadata: { type: entry.type, amount: entry.amount } })
    },
  })
}

export function useCloseMonth() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const { data, error } = await sb()
        .from('monthly_closings')
        .upsert(
          { unit_id: null, year, month, closed: true, closed_by: user?.id ?? null, closed_at: new Date().toISOString() },
          { onConflict: 'unit_id,year,month' }
        )
        .select()
        .single()
      if (error) throw error
      return data as MonthlyClosing
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['monthly-closing'] })
      log({ entity: 'monthly_closing', entityId: c.id, action: 'created', metadata: { year: c.year, month: c.month } })
    },
  })
}
