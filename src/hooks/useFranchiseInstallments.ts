import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface Installment {
  id: string
  unit_id: string
  seq: number
  label: string
  amount: number
  due_date: string
  payment_method: string | null
  status: 'pendente' | 'pago' | 'cancelado'
  paid_at: string | null
  paid_amount: number | null
  notes: string | null
  // derivado no cliente
  atrasado: boolean
}

export interface SaleCommission {
  id: string
  unit_id: string
  seller_id: string | null
  base_amount: number
  commission_type: 'percent' | 'fixed'
  commission_value: number
  amount: number
  status: 'pendente' | 'pago' | 'cancelado'
  paid_at: string | null
}

function isAtrasado(due: string, status: string): boolean {
  if (status !== 'pendente') return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(due + 'T00:00:00') < today
}

export function useFranchiseInstallments(unitId: string) {
  return useQuery({
    queryKey: ['franchise-installments', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('franchise_sale_installments')
        .select('*')
        .eq('unit_id', unitId)
        .order('seq')
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({ ...r, atrasado: isAtrasado(r.due_date, r.status) })) as Installment[]
    },
  })
}

export function useFranchiseCommission(unitId: string) {
  return useQuery({
    queryKey: ['franchise-commission', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('franchise_sale_commissions')
        .select('*')
        .eq('unit_id', unitId)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as SaleCommission | null
    },
  })
}

function useInvalidate(unitId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['franchise-installments', unitId] })
    qc.invalidateQueries({ queryKey: ['franchise-commission', unitId] })
  }
}

export interface GenerateArgs {
  unitId: string
  entrada: number
  numParcelas: number
  firstDue: string        // yyyy-mm-dd
  paymentMethod: string
}

export function useGenerateInstallments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: GenerateArgs) => {
      const { error } = await sb().rpc('generate_franchise_installments', {
        p_unit_id: a.unitId,
        p_entrada: a.entrada,
        p_num_parcelas: a.numParcelas,
        p_first_due: a.firstDue,
        p_payment_method: a.paymentMethod,
      })
      if (error) throw error
    },
    onSuccess: (_d, a) => qc.invalidateQueries({ queryKey: ['franchise-installments', a.unitId] }),
  })
}

export function useSetInstallmentPaid(unitId: string) {
  const invalidate = useInvalidate(unitId)
  return useMutation({
    mutationFn: async ({ id, paid, paidamount }: { id: string; paid: boolean; paidamount?: number | null }) => {
      const { error } = await sb().rpc('set_franchise_installment_paid', {
        p_id: id, p_paid: paid, p_paid_amount: paidamount ?? null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateInstallment(unitId: string) {
  const invalidate = useInvalidate(unitId)
  return useMutation({
    mutationFn: async ({ id, amount, dueDate, paymentMethod, notes }:
      { id: string; amount: number; dueDate: string; paymentMethod: string | null; notes?: string | null }) => {
      const { error } = await sb().rpc('update_franchise_installment', {
        p_id: id, p_amount: amount, p_due_date: dueDate, p_payment_method: paymentMethod, p_notes: notes ?? null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteInstallment(unitId: string) {
  const invalidate = useInvalidate(unitId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().rpc('delete_franchise_installment', { p_id: id })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSetCommissionPaid(unitId: string) {
  const invalidate = useInvalidate(unitId)
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await sb().rpc('set_franchise_commission_paid', { p_id: id, p_paid: paid })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
