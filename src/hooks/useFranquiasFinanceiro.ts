// src/hooks/useFranquiasFinanceiro.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
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
  observacao?: string
}

export function usePayFranchiseJobs() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ unitId, jobIds, totalValor, observacao }: PayJobsPayload) => {
      const { data: pagamento, error: errPag } = await sb()
        .from('financeiro_pagamentos')
        .insert({
          unit_id:       unitId,
          realizado_por: user!.id,
          total_valor:   totalValor,
          qtd_arquivos:  jobIds.length,
          observacao:    observacao ?? null,
        })
        .select('id')
        .single()
      if (errPag) throw errPag

      const { error: errJobs } = await sb()
        .from('ecu_jobs')
        .update({
          matrix_payment_status: 'pago',
          matrix_paid_at:        new Date().toISOString(),
          matrix_paid_by:        user!.id,
          matrix_payment_id:     pagamento.id,
        })
        .in('id', jobIds)
      if (errJobs) throw errJobs

      return pagamento.id as string
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
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
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
