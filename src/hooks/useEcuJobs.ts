import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'
import type { FileStatus, PriorityLevel } from '@/types/app'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface EcuJobFile {
  id: string
  job_id: string
  file_type: 'original' | 'entrega'
  r2_key: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export interface EcuJobEvent {
  id: string
  job_id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface EcuJob {
  id: string
  customer_id: string
  vehicle_id: string | null
  unit_id: string | null
  service_type: string
  priority: PriorityLevel
  status: FileStatus
  problem_description: string | null
  assigned_to: string | null
  seller_id: string | null
  seller?: { id: string; name: string } | null
  due_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // financial (informativo — sem gateway de pagamento)
  amount_charged_to_customer: number | null
  amount_charged_by_matrix: number | null
  franchise_margin_amount: number | null
  franchise_margin_percentage: number | null
  service_tags: string[]
  vehicle_info: {
    categoria?: string
    placa?: string
    marca?: string
    modelo?: string
    motor?: string
    transmissao?: string
    ano?: string
    horas_km?: string
  } | null
  // joined
  customers?: { name: string; email: string | null }
  vehicles?: { brand: string; model: string; plate: string | null } | null
  franchise_units?: { name: string; city: string | null; state: string | null } | null
  creator_profile?: { name: string | null } | null
  ecu_job_files?: EcuJobFile[]
  ecu_job_events?: EcuJobEvent[]
}

interface ListFilter {
  q?: string
  status?: FileStatus | ''
  page?: number
  pageSize?: number
}

export function useEcuJobs({ q = '', status = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['ecu-jobs', q, status, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('ecu_jobs')
        .select('*, customers(name, email), vehicles(brand, model, plate), franchise_units(name, city, state), creator_profile:profiles!created_by(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('service_type', `%${q}%`)
      if (status) query = query.eq('status', status)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as EcuJob[], total: (count as number) ?? 0 }
    },
  })
}

export function useEcuJob(id: string) {
  return useQuery({
    queryKey: ['ecu-job', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('*, customers(name, email), vehicles(brand, model, plate), franchise_units(name, city, state), creator_profile:profiles!created_by(name), seller:profiles!seller_id(id,name), ecu_job_files(*), ecu_job_events(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as EcuJob
    },
  })
}

interface CreatePayload {
  customer_id: string
  vehicle_id: string | null
  unit_id: string | null
  service_type: string
  priority: PriorityLevel
  problem_description: string | null
  due_at: string | null
  created_by: string | null
  amount_charged_to_customer: number | null
  seller_id?: string | null
  service_tags?: string[]
  vehicle_info?: EcuJob['vehicle_info']
}

export function useCreateEcuJob() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_jobs')
        .insert({
          ...payload,
          status: 'recebido',
          service_tags: payload.service_tags ?? [],
          vehicle_info: payload.vehicle_info ?? null,
        })
        .select()
        .single()
      if (error) throw error

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('ecu_job_events').insert({
          job_id: data.id,
          actor_id: user?.id ?? payload.created_by ?? null,
          event_type: 'job_created',
          payload: {
            status: 'recebido',
            service_type: payload.service_type,
            unit_id: payload.unit_id,
          },
        })
      } catch {
        // best-effort event logging
      }

      return data as EcuJob
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ['ecu-jobs'] })
      log({ entity: 'ecu_job', entityId: job.id, action: 'created' })
    },
  })
}

const NEXT_STATUS: Partial<Record<FileStatus, FileStatus[]>> = {
  recebido:           ['em_triagem', 'cancelado'],
  em_triagem:         ['em_processamento', 'cancelado'],
  em_processamento:   ['aguardando_cliente', 'concluido', 'cancelado'],
  aguardando_cliente: ['em_processamento', 'concluido', 'cancelado'],
}

export { NEXT_STATUS }

export function useUpdateEcuJobStatus() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: FileStatus; note?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { error } = await sb.from('ecu_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      try {
        await sb.from('ecu_job_events').insert({
          job_id: id,
          actor_id: user?.id ?? null,
          event_type: 'status_change',
          payload: { new_status: status, note: note ?? null },
        })
      } catch {
        // best-effort event logging
      }
      return { id, status }
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['ecu-jobs'] })
      qc.invalidateQueries({ queryKey: ['ecu-job', id] })
      log({ entity: 'ecu_job', entityId: id, action: 'status_changed' })
    },
  })
}

export function useSetMatrixPrice() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('ecu_jobs')
        .update({ amount_charged_by_matrix: amount, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { id, amount }
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', id] })
      log({ entity: 'ecu_job', entityId: id, action: 'matrix_price_set' })
    },
  })
}

export function useAssignEcuJob() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('ecu_jobs').update({ assigned_to: assignedTo, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      return { id, assignedTo }
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', id] })
      log({ entity: 'ecu_job', entityId: id, action: 'assigned' })
    },
  })
}

export function useEcuJobFinancialEntry(jobId: string) {
  return useQuery({
    queryKey: ['ecu-job-financial-entry', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await sb()
        .from('financial_entries')
        .select('id, status, amount, discount_amount, payment_method')
        .eq('ecu_job_id', jobId)
        .maybeSingle()
      return data as {
        id: string
        status: 'pendente' | 'pago'
        amount: number
        discount_amount: number
        payment_method: string | null
      } | null
    },
  })
}

export function useSendToFinance() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      jobId,
      unitId,
      amount,
      serviceType,
      customerName,
    }: {
      jobId: string
      unitId: string
      amount: number
      serviceType: string
      customerName: string
    }) => {
      const now = new Date()
      const { data, error } = await sb()
        .from('financial_entries')
        .insert({
          type: 'receita',
          status: 'pendente',
          amount,
          ecu_job_id: jobId,
          unit_id: unitId,
          description: `ECU: ${serviceType} — ${customerName}`,
          period_year: now.getFullYear(),
          period_month: now.getMonth() + 1,
          discount_amount: 0,
          payment_method: null,
          created_by: user?.id ?? null,
          category_id: null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data as { id: string }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', variables.jobId] })
      qc.invalidateQueries({ queryKey: ['ecu-job-financial-entry', variables.jobId] })
      qc.invalidateQueries({ queryKey: ['caixa-pendentes'] })
      log({
        entity: 'ecu_job',
        entityId: variables.jobId,
        action: 'sent_to_finance',
        metadata: { amount: variables.amount },
      })
    },
  })
}
