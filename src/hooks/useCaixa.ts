import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface PendingPayment {
  id: string
  amount: number
  description: string | null
  created_at: string
  ecu_job_id: string | null
  ecu_jobs: {
    id: string
    service_type: string
    amount_charged_to_customer: number
    seller_id: string | null
    seller: { id: string; name: string; commission_rate: number } | null
    customers: { name: string } | null
  } | null
}

export interface CommissionEntry {
  id: string
  ecu_job_id: string
  gross_amount: number
  discount_amount: number
  commission_rate: number
  commission_amount: number
  paid_at: string
  created_at: string
  ecu_jobs: {
    service_type: string
    customers: { name: string } | null
  } | null
}

export function usePendingPayments(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['caixa-pendentes', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('financial_entries')
        .select(`
          id, amount, description, created_at, ecu_job_id,
          ecu_jobs(
            id, service_type, amount_charged_to_customer, seller_id,
            profiles!seller_id(id, name, commission_rate),
            customers(name)
          )
        `)
        .eq('unit_id', unitId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        ...r,
        ecu_jobs: r.ecu_jobs
          ? {
              ...r.ecu_jobs,
              seller: r.ecu_jobs.profiles ?? null,
            }
          : null,
      })) as PendingPayment[]
    },
  })
}

interface RegisterPaymentPayload {
  entryId: string
  paymentMethod: string
  discountPct: number
  jobId: string
  sellerId: string | null
  grossAmount: number
  commissionRate: number
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async ({
      entryId,
      paymentMethod,
      discountPct,
      jobId,
      sellerId,
      grossAmount,
      commissionRate,
    }: RegisterPaymentPayload) => {
      const discountAmount = Number((grossAmount * (discountPct / 100)).toFixed(2))
      const netAmount = Number((grossAmount - discountAmount).toFixed(2))

      // 1. Atualiza financial_entry
      const { error: entryErr } = await sb()
        .from('financial_entries')
        .update({
          status: 'pago',
          payment_method: paymentMethod,
          discount_amount: discountAmount,
          amount: netAmount,
        })
        .eq('id', entryId)
      if (entryErr) throw entryErr

      // 2. Cria commission_entry se houver vendedor
      if (sellerId && commissionRate > 0) {
        const commissionAmount = Number((netAmount * (commissionRate / 100)).toFixed(2))
        const { error: commErr } = await sb()
          .from('commission_entries')
          .insert({
            ecu_job_id: jobId,
            seller_id: sellerId,
            gross_amount: grossAmount,
            discount_amount: discountAmount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
          })
        if (commErr) throw commErr
      }

      return { entryId, jobId, sellerId, netAmount, discountPct }
    },
    onSuccess: ({ entryId, jobId, sellerId, netAmount, discountPct }) => {
      qc.invalidateQueries({ queryKey: ['caixa-pendentes'] })
      qc.invalidateQueries({ queryKey: ['ecu-job-financial-entry', jobId] })
      if (sellerId) qc.invalidateQueries({ queryKey: ['commission-entries', sellerId] })
      log({
        entity: 'financial_entry',
        entityId: entryId,
        action: 'payment_registered',
        metadata: { netAmount, discountPct },
      })
    },
  })
}

export function useCommissions(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: ['commission-entries', sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('commission_entries')
        .select(`
          id, ecu_job_id, gross_amount, discount_amount,
          commission_rate, commission_amount, paid_at, created_at,
          ecu_jobs(service_type, customers(name))
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CommissionEntry[]
    },
  })
}
