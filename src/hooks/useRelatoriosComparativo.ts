import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PeriodFilter } from '@/hooks/useRelatorios'

// ─── Comparativo entre unidades (visão matriz) ────────────────────────────────
// Cruza TODAS as unidades num único ranking. Reaproveita o mesmo acesso já provado
// pelo useMatrixDashboard (admin matriz lê ecu_jobs de todas as unidades via RLS),
// então NÃO precisa de RPC nem migration. Apenas agrega por unidade no período.
//
// ⚠️ Regra de negócio:
//   amount_charged_to_customer = faturamento da unidade (o que ela cobra do cliente)
//   amount_charged_by_matrix   = gasto da unidade com a matriz (o que a matriz cobra dela)
// Nunca confundir os dois. Jobs com unit_id null são diretos da matriz e ficam fora
// do comparativo por unidade.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

const SELLER_ROLES = new Set(['unit_seller', 'seller'])

export interface UnitComparativoRow {
  unitId: string
  name: string
  city: string | null
  state: string | null
  ecuCount: number
  faturamento: number   // Σ amount_charged_to_customer
  gastoMatriz: number   // Σ amount_charged_by_matrix
  margem: number        // Σ franchise_margin_amount
  ticketMedio: number   // faturamento / ecuCount
  clientesCount: number
  vendedoresCount: number
}

export interface ServiceTypeBreak {
  serviceType: string
  count: number
  faturamento: number
}

export interface RegionBreak {
  state: string
  unidades: number
  ecuCount: number
  faturamento: number
  gastoMatriz: number
}

export interface ComparativoTotais {
  unidades: number
  ecuCount: number
  faturamento: number
  gastoMatriz: number
  margem: number
}

export interface ComparativoData {
  rows: UnitComparativoRow[]
  byServiceType: ServiceTypeBreak[]
  byRegion: RegionBreak[]
  totais: ComparativoTotais
}

interface UnitRow {
  id: string
  name: string
  city: string | null
  state: string | null
  active: boolean | null
}

interface JobRow {
  unit_id: string | null
  service_type: string | null
  status: string | null
  created_at: string
  amount_charged_to_customer: number | null
  amount_charged_by_matrix: number | null
  franchise_margin_amount: number | null
}

export function useRelatoriosComparativo(period?: PeriodFilter) {
  return useQuery<ComparativoData>({
    queryKey: ['relatorio-comparativo', period],
    enabled: !!period,
    staleTime: 60_000,
    queryFn: async () => {
      const [unitsRes, jobsRes, customersRes, rolesRes] = await Promise.all([
        sb().from('franchise_units').select('id, name, city, state, active').order('name'),
        sb()
          .from('ecu_jobs')
          .select('unit_id, service_type, status, created_at, amount_charged_to_customer, amount_charged_by_matrix, franchise_margin_amount')
          .neq('status', 'cancelado')
          .gte('created_at', period!.dateFrom)
          .lte('created_at', period!.dateTo + 'T23:59:59'),
        sb().from('customers').select('unit_id'),
        sb().from('user_unit_roles').select('user_id, unit_id, role'),
      ])

      if (unitsRes.error) throw unitsRes.error
      if (jobsRes.error) throw jobsRes.error

      const units = ((unitsRes.data ?? []) as UnitRow[]).filter((u) => u.active !== false)
      const jobs = (jobsRes.data ?? []) as JobRow[]

      // Clientes por unidade (best-effort; respeita a RLS do consultante).
      const clientesPorUnidade = new Map<string, number>()
      for (const c of (customersRes.data ?? []) as { unit_id: string | null }[]) {
        if (!c.unit_id) continue
        clientesPorUnidade.set(c.unit_id, (clientesPorUnidade.get(c.unit_id) ?? 0) + 1)
      }

      // Vendedores por unidade (distinct user_id com papel de vendedor).
      const vendedoresPorUnidade = new Map<string, Set<string>>()
      for (const r of (rolesRes.data ?? []) as { user_id: string; unit_id: string | null; role: string }[]) {
        if (!r.unit_id || !SELLER_ROLES.has(r.role)) continue
        const set = vendedoresPorUnidade.get(r.unit_id) ?? new Set<string>()
        set.add(r.user_id)
        vendedoresPorUnidade.set(r.unit_id, set)
      }

      // Agregação de jobs por unidade.
      interface Agg { ecuCount: number; faturamento: number; gastoMatriz: number; margem: number }
      const aggByUnit = new Map<string, Agg>()
      const byServiceMap = new Map<string, { count: number; faturamento: number }>()

      for (const j of jobs) {
        const fat = Number(j.amount_charged_to_customer ?? 0)
        const gasto = Number(j.amount_charged_by_matrix ?? 0)
        const margem = Number(j.franchise_margin_amount ?? 0)

        // Breakdown por tipo de serviço (global, inclui jobs diretos da matriz).
        const st = (j.service_type ?? '—') || '—'
        const cur = byServiceMap.get(st) ?? { count: 0, faturamento: 0 }
        byServiceMap.set(st, { count: cur.count + 1, faturamento: cur.faturamento + fat })

        if (!j.unit_id) continue // job direto da matriz não entra no comparativo por unidade
        const a = aggByUnit.get(j.unit_id) ?? { ecuCount: 0, faturamento: 0, gastoMatriz: 0, margem: 0 }
        a.ecuCount += 1
        a.faturamento += fat
        a.gastoMatriz += gasto
        a.margem += margem
        aggByUnit.set(j.unit_id, a)
      }

      // Uma linha por unidade (inclui unidade com zero jobs no período).
      const rows: UnitComparativoRow[] = units.map((u) => {
        const a = aggByUnit.get(u.id) ?? { ecuCount: 0, faturamento: 0, gastoMatriz: 0, margem: 0 }
        return {
          unitId: u.id,
          name: u.name,
          city: u.city,
          state: u.state,
          ecuCount: a.ecuCount,
          faturamento: a.faturamento,
          gastoMatriz: a.gastoMatriz,
          margem: a.margem,
          ticketMedio: a.ecuCount > 0 ? a.faturamento / a.ecuCount : 0,
          clientesCount: clientesPorUnidade.get(u.id) ?? 0,
          vendedoresCount: vendedoresPorUnidade.get(u.id)?.size ?? 0,
        }
      }).sort((x, y) => y.faturamento - x.faturamento)

      // Breakdown por região (UF), a partir das linhas de unidade.
      const regionMap = new Map<string, RegionBreak>()
      for (const r of rows) {
        const uf = (r.state ?? '—') || '—'
        const cur = regionMap.get(uf) ?? { state: uf, unidades: 0, ecuCount: 0, faturamento: 0, gastoMatriz: 0 }
        cur.unidades += 1
        cur.ecuCount += r.ecuCount
        cur.faturamento += r.faturamento
        cur.gastoMatriz += r.gastoMatriz
        regionMap.set(uf, cur)
      }
      const byRegion = [...regionMap.values()].sort((a, b) => b.faturamento - a.faturamento)

      const byServiceType: ServiceTypeBreak[] = [...byServiceMap.entries()]
        .map(([serviceType, m]) => ({ serviceType, count: m.count, faturamento: m.faturamento }))
        .sort((a, b) => b.count - a.count)

      const totais: ComparativoTotais = {
        unidades: rows.length,
        ecuCount: rows.reduce((s, r) => s + r.ecuCount, 0),
        faturamento: rows.reduce((s, r) => s + r.faturamento, 0),
        gastoMatriz: rows.reduce((s, r) => s + r.gastoMatriz, 0),
        margem: rows.reduce((s, r) => s + r.margem, 0),
      }

      return { rows, byServiceType, byRegion, totais }
    },
  })
}
