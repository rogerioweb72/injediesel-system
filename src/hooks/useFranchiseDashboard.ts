import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMyUnit } from '@/hooks/useMyUnit'
import type { FileStatus } from '@/types/app'

// Espelha o padrão de useMatrixDashboard, mas ESCOPADO à unidade do franqueado.
// Isolamento: filtra por unit_id da própria unidade (server-side) — nunca vê
// dados de outra unidade. RLS reforça no banco.

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all'

const IN_PROGRESS = ['recebido', 'em_triagem', 'em_processamento', 'aguardando_cliente']

interface UnitJobRow {
  id: string
  service_type: string
  status: FileStatus
  created_at: string
  amount_charged_to_customer: number | null
  customers?: { name: string; email: string | null } | null
  vehicles?: { brand: string; model: string; plate: string | null } | null
}

export interface FranchiseRecentJob {
  id: string
  service_type: string
  status: FileStatus
  created_at: string
  customers?: { name: string; email: string | null } | null
  vehicles?: { brand: string; model: string; plate: string | null } | null
}

export interface FranchiseServiceMetric {
  label: string
  value: number
  pct: number
}

export interface FranchiseDashboardMetrics {
  faturamento: number
  servicosRealizados: number
  ticketMedio: number
  emAndamento: number
  totalServicos: number
  byType: FranchiseServiceMetric[]
  recentJobs: FranchiseRecentJob[]
}

function periodStart(period: DashboardPeriod): Date | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === 'today') {
    d.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

const CHUNK = 1000

export function useFranchiseDashboard(period: DashboardPeriod = 'month') {
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id ?? null

  return useQuery<FranchiseDashboardMetrics>({
    queryKey: ['franchise-dashboard', unitId, period],
    enabled: !!unitId,
    staleTime: 60_000,
    queryFn: async () => {
      // Busca todos os jobs da unidade em chunks (sem cap de 1000 do PostgREST)
      const all: UnitJobRow[] = []
      let offset = 0
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('ecu_jobs')
          .select('id, service_type, status, created_at, amount_charged_to_customer, customers(name, email), vehicles(brand, model, plate)')
          .eq('unit_id', unitId)
          .order('created_at', { ascending: false })
          .range(offset, offset + CHUNK - 1)
        if (error) throw error
        const chunk = (data ?? []) as UnitJobRow[]
        all.push(...chunk)
        if (chunk.length < CHUNK) break
        offset += CHUNK
      }

      // Filtro de período (client-side, sobre created_at)
      const boundary = periodStart(period)
      const jobs = boundary ? all.filter(j => new Date(j.created_at) >= boundary) : all

      const activeJobs   = jobs.filter(j => j.status !== 'cancelado')
      const completed    = jobs.filter(j => j.status === 'concluido')
      const inProgress   = jobs.filter(j => IN_PROGRESS.includes(j.status))

      const faturamento  = activeJobs.reduce((s, j) => s + (j.amount_charged_to_customer ?? 0), 0)
      const ticketMedio  = activeJobs.length > 0 ? faturamento / activeJobs.length : 0

      const typeMap: Record<string, number> = {}
      for (const j of activeJobs) {
        const key = j.service_type || 'Outro'
        typeMap[key] = (typeMap[key] ?? 0) + (j.amount_charged_to_customer ?? 0)
      }
      const byType: FranchiseServiceMetric[] = Object.entries(typeMap)
        .map(([label, value]) => ({ label, value, pct: faturamento > 0 ? (value / faturamento) * 100 : 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)

      const recentJobs: FranchiseRecentJob[] = jobs.slice(0, 5)

      return {
        faturamento,
        servicosRealizados: completed.length,
        ticketMedio,
        emAndamento: inProgress.length,
        totalServicos: activeJobs.length,
        byType,
        recentJobs,
      }
    },
  })
}
