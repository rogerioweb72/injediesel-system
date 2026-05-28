import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'

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
    enabled: unitId !== undefined,
    queryFn: async () => {
      let q = sb()
        .from('financial_entries')
        .select(`
          id, amount, description, created_at, ecu_job_id,
          ecu_jobs(
            id, service_type, amount_charged_to_customer, seller_id,
            profiles!seller_id(id, name, commission_rate),
            customers(name)
          )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
      q = unitId === null ? q.is('unit_id', null) : q.eq('unit_id', unitId)
      const { data, error } = await q
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

      // 2. Cria/atualiza commission_entry se houver vendedor
      if (sellerId && commissionRate > 0) {
        const commissionAmount = Number((netAmount * (commissionRate / 100)).toFixed(2))
        const { error: commErr } = await sb()
          .from('commission_entries')
          .upsert({
            ecu_job_id: jobId,
            seller_id: sellerId,
            gross_amount: grossAmount,
            discount_amount: discountAmount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
          }, { onConflict: 'ecu_job_id' })
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

export interface EcuReceiptEntry {
  id: string
  amount: number
  description: string | null
  created_at: string
  ecu_job_id: string
  payment_method: string | null
  discount_amount: number
  ecu_jobs: {
    id: string
    service_type: string
    amount_charged_to_customer: number
    customers: { name: string } | null
  } | null
}

export function useEcuReceipts(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['ecu-receipts', unitId],
    enabled: unitId !== undefined,
    staleTime: 30_000,
    queryFn: async () => {
      let q = sb()
        .from('financial_entries')
        .select(`
          id, amount, description, created_at, ecu_job_id, payment_method, discount_amount,
          ecu_jobs(id, service_type, amount_charged_to_customer, customers(name))
        `)
        .eq('status', 'pago')
        .not('ecu_job_id', 'is', null)
        .order('created_at', { ascending: false })
      q = unitId === null ? q.is('unit_id', null) : q.eq('unit_id', unitId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as EcuReceiptEntry[]
    },
  })
}

export interface FranchiseBillingEntry {
  id: string
  service_type: string
  amount_charged_by_matrix: number
  amount_charged_to_customer: number
  created_at: string
  unit_id: string
  franchise_units: { name: string } | null
  customers: { name: string } | null
}

export function useMatrixFranchiseBilling() {
  return useQuery({
    queryKey: ['matrix-franchise-billing'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select(`
          id, service_type, amount_charged_by_matrix, amount_charged_to_customer,
          created_at, unit_id,
          franchise_units(name), customers(name)
        `)
        .not('unit_id', 'is', null)
        .eq('status', 'concluido')
        .gt('amount_charged_by_matrix', 0)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as FranchiseBillingEntry[]
    },
  })
}

export interface OpenEcuJob {
  id: string
  service_type: string
  status: string
  created_at: string
  unit_id: string | null
  amount_charged_to_customer: number | null
  customers: { name: string } | null
  assigned_profile: { name: string } | null
  creator_profile: { name: string } | null
}

export function useOpenEcuJobs(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['open-ecu-jobs', unitId],
    enabled: unitId !== undefined,
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = sb()
        .from('ecu_jobs')
        .select(`
          id, service_type, status, created_at, unit_id, amount_charged_to_customer,
          customers(name),
          assigned_profile:profiles!assigned_to(name),
          creator_profile:profiles!created_by(name)
        `)
        .neq('status', 'concluido')
        .neq('status', 'cancelado')
        .order('created_at', { ascending: true })
      q = unitId === null ? q.is('unit_id', null) : q.eq('unit_id', unitId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as OpenEcuJob[]
    },
  })
}

export interface OpenOrder {
  id: string
  status: string
  created_at: string
  unit_id: string | null
  franchise_units: { name: string } | null
}

export function useOpenOrders(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['open-orders', unitId],
    enabled: unitId !== undefined,
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = sb()
        .from('orders')
        .select('id, status, created_at, unit_id, franchise_units(name)')
        .in('status', ['aguardando_aprovacao', 'aguardando_pagamento', 'aprovado', 'em_separacao', 'enviado'])
        .order('created_at', { ascending: false })
      if (unitId === null) {
        q = q.not('unit_id', 'is', null)
      } else {
        q = q.eq('unit_id', unitId)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as OpenOrder[]
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
