// src/hooks/useFranquiasFinanceiro.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SaldoFranquia {
  unit_id: string
  nome: string
  cidade: string | null
  uf: string | null
  qtd_abertos: number
  total_em_aberto: number
  data_mais_antiga: string
}

export interface FranchiseEcuJob {
  id: string
  unit_id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
}

export interface CobrancaEcuItem {
  id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number | null
  matrix_payment_status: 'em_aberto' | 'pago'
  matrix_paid_at: string | null
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
  financeiro_pagamentos: { forma_pagamento: string | null } | null
}

// ── Saldo por unidade (polling 60s) ───────────────────────────────────────────

export function useSaldoFranquias() {
  return useQuery({
    queryKey: ['saldo-franquias'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('vw_saldo_franquias')
        .select('*')
        .order('total_em_aberto', { ascending: false })
      if (error) throw error
      return (data ?? []) as SaldoFranquia[]
    },
    refetchInterval: 60_000,
  })
}

// ── Faturamento total por unidade (matrix-wide, todo o histórico) ─────────────
// Σ amount_charged_to_customer por unidade (mesma fonte/regra do comparativo).
// Exclui cancelados e jobs sem unidade (diretos da matriz). RLS da matriz já
// permite ler ecu_jobs de todas as unidades (como no useMatrixDashboard).

export function useFaturamentoPorUnidade() {
  return useQuery({
    queryKey: ['faturamento-por-unidade'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select('unit_id, amount_charged_to_customer')
        .neq('status', 'cancelado')
        .not('unit_id', 'is', null)
      if (error) throw error
      const m = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of ((data ?? []) as any[])) {
        if (!r.unit_id) continue
        m.set(r.unit_id, (m.get(r.unit_id) ?? 0) + Number(r.amount_charged_to_customer ?? 0))
      }
      return m
    },
  })
}

// ── Jobs em aberto de uma unidade ─────────────────────────────────────────────

export function useFranchiseOpenJobs(unitId: string) {
  return useQuery({
    queryKey: ['franchise-open-jobs', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select('id, unit_id, service_type, created_at, amount_charged_by_matrix, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'em_aberto')
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FranchiseEcuJob[]
    },
  })
}

// ── Badge: count de jobs novos desde última visita ────────────────────────────

const LS_KEY = 'franquias_last_seen'

export function getLastSeen(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString()
}

export function markFranchiseTabSeen() {
  localStorage.setItem(LS_KEY, new Date().toISOString())
}

export function useUnseenFranchiseCount() {
  const { data: saldos = [] } = useSaldoFranquias()
  const lastSeen = getLastSeen()
  return saldos.filter((s) => s.data_mais_antiga > lastSeen).length
}

// ── Mutation: quitar N jobs de uma unidade ────────────────────────────────────

interface PayJobsPayload {
  unitId: string
  unitNome: string
  jobIds: string[]
  totalValor: number
  formaPagamento: string
  observacao?: string
}

export function usePayFranchiseJobs() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ unitId, jobIds, formaPagamento, observacao }: PayJobsPayload) => {
      // Quitação via RPC dedicada (migration 107): atômica, total calculado no
      // servidor e liberada a finance_admin sem abrir a RLS de ecu_jobs.
      const { data, error } = await sb().rpc('pay_franchise_jobs', {
        p_unit_id:         unitId,
        p_job_ids:         jobIds,
        p_forma_pagamento: formaPagamento,
        p_observacao:      observacao ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_pagId, vars) => {
      qc.invalidateQueries({ queryKey: ['saldo-franquias'] })
      qc.invalidateQueries({ queryKey: ['franchise-open-jobs', vars.unitId] })
      qc.invalidateQueries({ queryKey: ['franchise-job-history', vars.unitId] })
      toast.success(
        `${vars.jobIds.length} arquivo${vars.jobIds.length > 1 ? 's' : ''} quitado${vars.jobIds.length > 1 ? 's' : ''} — ${fmtBRL(vars.totalValor)} registrados para ${vars.unitNome}`
      )
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  })
}

// ── Histórico de cobranças por unidade ────────────────────────────────────────

export function useFranchiseJobHistory(
  unitId: string,
  filters: { status: 'todos' | 'em_aberto' | 'pago'; mes?: string }
) {
  return useQuery({
    queryKey: ['franchise-job-history', unitId, filters],
    enabled: !!unitId,
    queryFn: async () => {
      let query = sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info, financeiro_pagamentos!matrix_payment_id(forma_pagamento)')
        .eq('unit_id', unitId)
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: false })

      if (filters.status !== 'todos') {
        query = query.eq('matrix_payment_status', filters.status)
      }
      if (filters.mes) {
        const [ano, mes] = filters.mes.split('-')
        const inicio = `${ano}-${mes}-01`
        const fimDate = new Date(Number(ano), Number(mes), 0)
        const fim = fimDate.toISOString().split('T')[0]
        query = query.gte('created_at', inicio).lte('created_at', fim + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as CobrancaEcuItem[]
    },
  })
}

// ── Utilitários ───────────────────────────────────────────────────────────────

export function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function diasEmAberto(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
