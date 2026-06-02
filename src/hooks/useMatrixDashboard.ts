import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all'

interface JobRow {
  id: string
  service_type: string
  status: string
  created_at: string
  amount_charged_to_customer: number | null
  unit_id: string | null
  franchise_units: {
    id: string
    name: string
    city: string | null
    state: string | null
    active: boolean
  } | null
}

export interface StateMetric {
  state: string
  count: number
  revenue: number
}

export interface UnitMetric {
  unitId: string
  name: string
  city: string | null
  state: string | null
  count: number
  revenue: number
}

export interface ServiceTypeMetric {
  serviceType: string
  count: number
}

export interface DashboardMetrics {
  totalJobs: number
  totalRevenue: number
  todayJobs: number
  weekJobs: number
  pendingJobs: number
  activeUnits: number
  stateRanking: StateMetric[]
  topUnits: UnitMetric[]
  bottomUnits: UnitMetric[]
  serviceTypeRanking: ServiceTypeMetric[]
  statusVolume: { status: string; count: number }[]
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

export function useMatrixDashboard(
  period: DashboardPeriod = 'month',
  stateFilter?: string,
  unitFilter?: string,
) {
  return useQuery<DashboardMetrics>({
    queryKey: ['matrix-dashboard', period, stateFilter, unitFilter],
    staleTime: 60_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('id, service_type, status, created_at, amount_charged_to_customer, unit_id, franchise_units(id, name, city, state, active)')
        .neq('status', 'cancelado')

      if (error) throw error
      const allJobs = (data ?? []) as JobRow[]

      // KPI counts before period filter
      const now = new Date()
      const todayBoundary = new Date(now); todayBoundary.setHours(0, 0, 0, 0)
      const weekBoundary = new Date(now); weekBoundary.setDate(now.getDate() - 7); weekBoundary.setHours(0, 0, 0, 0)
      const todayJobs = allJobs.filter(j => new Date(j.created_at) >= todayBoundary).length
      const weekJobs  = allJobs.filter(j => new Date(j.created_at) >= weekBoundary).length

      // Apply period + dimension filters
      const boundary = periodStart(period)
      let jobs = allJobs
      if (boundary) jobs = jobs.filter(j => new Date(j.created_at) >= boundary)
      if (stateFilter) jobs = jobs.filter(j => j.franchise_units?.state === stateFilter)
      if (unitFilter)  jobs = jobs.filter(j => j.unit_id === unitFilter)

      // Exclude jobs from inactive units
      const activeJobs = jobs.filter(j => j.franchise_units?.active !== false)

      const totalJobs    = activeJobs.length
      const totalRevenue = activeJobs.reduce((s, j) => s + (j.amount_charged_to_customer ?? 0), 0)
      const activeUnits  = new Set(activeJobs.map(j => j.unit_id).filter(Boolean)).size

      // State ranking
      const stateMap = new Map<string, { count: number; revenue: number }>()
      for (const j of activeJobs) {
        const st = j.franchise_units?.state ?? '—'
        const cur = stateMap.get(st) ?? { count: 0, revenue: 0 }
        stateMap.set(st, { count: cur.count + 1, revenue: cur.revenue + (j.amount_charged_to_customer ?? 0) })
      }
      const stateRanking: StateMetric[] = [...stateMap.entries()]
        .map(([state, m]) => ({ state, ...m }))
        .sort((a, b) => b.count - a.count)

      // Unit ranking
      const unitMap = new Map<string, UnitMetric>()
      for (const j of activeJobs) {
        if (!j.unit_id || !j.franchise_units) continue
        const cur = unitMap.get(j.unit_id) ?? {
          unitId: j.unit_id, name: j.franchise_units.name,
          city: j.franchise_units.city, state: j.franchise_units.state,
          count: 0, revenue: 0,
        }
        unitMap.set(j.unit_id, { ...cur, count: cur.count + 1, revenue: cur.revenue + (j.amount_charged_to_customer ?? 0) })
      }
      const unitsByCount = [...unitMap.values()].sort((a, b) => b.count - a.count)
      const topUnits    = unitsByCount.slice(0, 5)
      const bottomUnits = [...unitMap.values()].sort((a, b) => a.count - b.count).slice(0, 5)

      // Service type ranking
      const stMap = new Map<string, number>()
      for (const j of activeJobs) stMap.set(j.service_type, (stMap.get(j.service_type) ?? 0) + 1)
      const serviceTypeRanking: ServiceTypeMetric[] = [...stMap.entries()]
        .map(([serviceType, count]) => ({ serviceType, count }))
        .sort((a, b) => b.count - a.count)

      // Status volume (from filtered jobs, not only active units — to show all statuses)
      const statusMap = new Map<string, number>()
      for (const j of jobs) statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1)
      const statusVolume = [...statusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)

      const pendingJobs = allJobs.filter(j => j.status === 'recebido').length

      return { totalJobs, totalRevenue, todayJobs, weekJobs, activeUnits, stateRanking, topUnits, bottomUnits, serviceTypeRanking, statusVolume, pendingJobs }
    },
  })
}
