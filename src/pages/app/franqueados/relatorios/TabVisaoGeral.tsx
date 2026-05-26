import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useEcuJobsReport, useOrdersReport, useFinancialEntriesReport, fmt, pct, type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
import { useUnitEmployeeCostsForUnit } from '@/hooks/useUnitEmployees'
import type { EmployeeBenefit } from '@/hooks/useUnitEmployees'

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-1">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

export function TabVisaoGeral({ unitId, period, months }: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  const { data: ecuJobs = [], isLoading: le } = useEcuJobsReport(unitId, period)
  const { data: orders = [],  isLoading: lo } = useOrdersReport(unitId, period)
  const { data: entries = [], isLoading: lf } = useFinancialEntriesReport(unitId, period)
  const { data: empCosts = [], isLoading: lc } = useUnitEmployeeCostsForUnit(unitId, months)

  const kpis = useMemo(() => {
    const ecuRec  = ecuJobs.reduce((s, j) => s + j.amount_charged_to_customer, 0)
    const ecuCost = ecuJobs.reduce((s, j) => s + j.amount_charged_by_matrix, 0)
    const ordRec  = orders.reduce((s, o) => s + o.total, 0)
    const finRec  = entries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0)
    const finExp  = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0)
    const empCost = empCosts.reduce((s, c) => {
      const ben = (c.benefits as EmployeeBenefit[]).reduce((b, x) => b + x.amount, 0)
      return s + c.base_salary + ben
    }, 0)
    const fat  = ecuRec + ordRec + finRec
    const cost = ecuCost + finExp + empCost
    const mar  = fat - cost
    const marP = fat > 0 ? (mar / fat) * 100 : 0
    const clients = new Set([...ecuJobs.map(j => j.customer_id), ...orders.map(o => o.customer_id).filter(Boolean)])
    return { fat, cost, mar, marP, jobs: ecuJobs.filter(j => j.status === 'concluido').length, clients: clients.size }
  }, [ecuJobs, orders, entries, empCosts])

  const chartData = useMemo(() => {
    const buckets: Record<string, { label: string; receita: number; custo: number }> = {}
    const push = (date: string, rec: number, cst: number) => {
      const d = new Date(date)
      const wk = new Date(d); wk.setDate(d.getDate() - d.getDay())
      const k = wk.toISOString().slice(0, 10)
      if (!buckets[k]) buckets[k] = { label: k.slice(5), receita: 0, custo: 0 }
      buckets[k].receita += rec
      buckets[k].custo   += cst
    }
    ecuJobs.forEach(j => push(j.created_at, j.amount_charged_to_customer, j.amount_charged_by_matrix))
    orders.forEach(o => push(o.created_at, o.total, 0))
    return Object.values(buckets).sort((a, b) => a.label.localeCompare(b.label))
  }, [ecuJobs, orders])

  const topClientes = useMemo(() => {
    const m: Record<string, { name: string; total: number }> = {}
    ecuJobs.forEach(j => {
      if (!m[j.customer_id]) m[j.customer_id] = { name: j.customer_name, total: 0 }
      m[j.customer_id].total += j.amount_charged_to_customer
    })
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 3)
  }, [ecuJobs])

  const topServicos = useMemo(() => {
    const m: Record<string, number> = {}
    ecuJobs.forEach(j => { m[j.service_type] = (m[j.service_type] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
  }, [ecuJobs])

  if (le || lo || lf || lc) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-52 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Faturamento Bruto" value={fmt(kpis.fat)} />
        <KpiCard label="Custo Total"        value={fmt(kpis.cost)} />
        <KpiCard label="Margem Líquida"     value={fmt(kpis.mar)} sub={pct(kpis.marP)} />
        <KpiCard label="Jobs ECU Concluídos" value={String(kpis.jobs)} />
        <KpiCard label="Clientes Atendidos" value={String(kpis.clients)} />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Receita vs Custo por semana</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={14}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" fill="#e72b2b" name="Receita" radius={[3,3,0,0]} />
              <Bar dataKey="custo"   fill="#52525b" name="Custo"   radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Top Clientes</p>
          {topClientes.length === 0
            ? <p className="text-sm text-zinc-500">Sem dados</p>
            : topClientes.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-300 truncate">{c.name}</span>
                <span className="text-white font-medium ml-2 flex-shrink-0">{fmt(c.total)}</span>
              </div>
            ))
          }
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Top Serviços ECU</p>
          {topServicos.length === 0
            ? <p className="text-sm text-zinc-500">Sem dados</p>
            : topServicos.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-300">{s.name}</span>
                <span className="text-white font-medium">{s.count} jobs</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
