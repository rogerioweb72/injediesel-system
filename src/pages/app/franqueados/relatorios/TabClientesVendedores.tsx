import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useEcuJobsReport, useCommissionsReport, fmt, type PeriodFilter } from '@/hooks/useRelatorios'

function RankList({ title, rows, valueLabel }: { title: string; rows: { name: string; count?: number; value: number }[]; valueLabel: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">{title}</p>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">Sem dados no período.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-zinc-200 truncate">{r.name}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {r.count !== undefined && <span className="text-xs text-zinc-500">{r.count} jobs</span>}
                <span className="text-sm font-medium text-white">{valueLabel === 'currency' ? fmt(r.value) : r.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TabClientesVendedores({ unitId, period }: { unitId: string; period: PeriodFilter }) {
  const { data: ecuJobs = [], isLoading: le } = useEcuJobsReport(unitId, period)
  const { data: commissions = [], isLoading: lc } = useCommissionsReport(unitId, period)

  const byRevenue = useMemo(() => {
    const m: Record<string, { name: string; count: number; value: number }> = {}
    ecuJobs.forEach(j => {
      if (!m[j.customer_id]) m[j.customer_id] = { name: j.customer_name, count: 0, value: 0 }
      m[j.customer_id].count++
      m[j.customer_id].value += j.amount_charged_to_customer
    })
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [ecuJobs])

  const byCount = useMemo(() => {
    const m: Record<string, { name: string; count: number; value: number }> = {}
    ecuJobs.forEach(j => {
      if (!m[j.customer_id]) m[j.customer_id] = { name: j.customer_name, count: 0, value: 0 }
      m[j.customer_id].count++
      m[j.customer_id].value += j.amount_charged_to_customer
    })
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [ecuJobs])

  const sellers = useMemo(() => {
    const m: Record<string, { name: string; value: number }> = {}
    commissions.forEach(c => {
      if (!m[c.seller_id]) m[c.seller_id] = { name: c.seller_name, value: 0 }
      m[c.seller_id].value += c.amount
    })
    return Object.values(m).sort((a, b) => b.value - a.value)
  }, [commissions])

  if (le || lc) return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <RankList title="Top Clientes por Faturamento ECU" rows={byRevenue} valueLabel="currency" />
      <RankList title="Top Clientes por Volume de Jobs"  rows={byCount}   valueLabel="currency" />
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">Vendedores — Comissões no Período</p>
        {sellers.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">Sem comissões registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">Vendedor</th>
                  <th className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s, i) => (
                  <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-4 py-2 text-zinc-300">{s.name}</td>
                    <td className="px-4 py-2 text-emerald-400 font-medium">{fmt(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
