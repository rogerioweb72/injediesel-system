import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useEcuJobsReport, useOrdersReport, useFinancialEntriesReport, useCommissionsReport, useUnitRoyalty, fmt, pct, type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
import { useUnitEmployeeCostsForUnit } from '@/hooks/useUnitEmployees'

const PIE_COLORS = ['#e72b2b','#f97316','#eab308','#22c55e','#3b82f6','#a855f7']

export function TabFinanceiro({ unitId, period, months }: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  const { data: ecuJobs  = [], isLoading: le } = useEcuJobsReport(unitId, period)
  const { data: orders   = [], isLoading: lo } = useOrdersReport(unitId, period)
  const { data: entries  = [], isLoading: lf } = useFinancialEntriesReport(unitId, period)
  const { data: comms    = [], isLoading: lk } = useCommissionsReport(unitId, period)
  const { data: empCosts = [], isLoading: lc } = useUnitEmployeeCostsForUnit(unitId, months)
  const { data: royalty  }                      = useUnitRoyalty(unitId)

  const totals = useMemo(() => {
    const ecuRec   = ecuJobs.reduce((s, j) => s + j.amount_charged_to_customer, 0)
    const ordRec   = orders.reduce((s, o) => s + o.total, 0)
    const finRec   = entries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0)
    const totalRec = ecuRec + ordRec + finRec

    const ecuCost  = ecuJobs.reduce((s, j) => s + j.amount_charged_by_matrix, 0)
    const empCost  = empCosts.reduce((s, c) => s + c.base_salary + (c.benefits).reduce((b, x) => b + x.amount, 0), 0)
    const commCost = comms.reduce((s, c) => s + c.amount, 0)
    const despesas = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0)
    const royaltyVal = royalty?.royalty_enabled ? (totalRec * (royalty.royalty_percentage ?? 0)) / 100 : 0

    const totalCost = ecuCost + empCost + commCost + despesas + royaltyVal
    const saldo     = totalRec - totalCost
    const margemPct = totalRec > 0 ? (saldo / totalRec) * 100 : 0

    const breakdown = [
      { name: 'Custo Matriz ECU', value: ecuCost },
      { name: 'Equipe',           value: empCost },
      { name: 'Comissões',        value: commCost },
      { name: 'Despesas Manuais', value: despesas },
      ...(royaltyVal > 0 ? [{ name: 'Royalty', value: royaltyVal }] : []),
    ].filter(x => x.value > 0)

    return { ecuRec, ordRec, finRec, totalRec, ecuCost, empCost, commCost, despesas, royaltyVal, totalCost, saldo, margemPct, breakdown }
  }, [ecuJobs, orders, entries, comms, empCosts, royalty])

  if (le || lo || lf || lk || lc) return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  )

  if (ecuJobs.length === 0 && orders.length === 0 && entries.length === 0 && comms.length === 0) return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
      <p className="text-sm text-zinc-500">Ainda sem dados.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Receita */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">Receita</p>
        <div className="divide-y divide-zinc-800">
          {[
            { label: 'ECU (jobs)',             value: totals.ecuRec },
            { label: 'Pedidos e PDV',          value: totals.ordRec },
            { label: 'Lançamentos manuais',    value: totals.finRec },
          ].map(r => (
            <div key={r.label} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-zinc-400">{r.label}</span>
              <span className="text-white">{fmt(r.value)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-zinc-800/50 text-sm font-bold">
            <span className="text-white">Total Receita</span>
            <span className="text-emerald-400">{fmt(totals.totalRec)}</span>
          </div>
        </div>
      </div>

      {/* Custos */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">Custos</p>
        <div className="divide-y divide-zinc-800">
          {[
            { label: 'Custo Matriz ECU',          value: totals.ecuCost },
            { label: 'Equipe (salários + benef.)', value: totals.empCost },
            { label: 'Comissões',                  value: totals.commCost },
            { label: 'Despesas Manuais',           value: totals.despesas },
          ].map(r => (
            <div key={r.label} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-zinc-400">{r.label}</span>
              <span className="text-white">{fmt(r.value)}</span>
            </div>
          ))}
          {totals.royaltyVal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-zinc-400">
                Taxa Franqueadora
                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/40">{pct(royalty?.royalty_percentage ?? 0)}</Badge>
              </span>
              <span className="text-white">{fmt(totals.royaltyVal)}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-3 bg-zinc-800/50 text-sm font-bold">
            <span className="text-white">Total Custos</span>
            <span className="text-red-400">{fmt(totals.totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className={`rounded-xl border p-4 ${totals.saldo >= 0 ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-red-600/40 bg-red-950/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Saldo do Período</p>
            <p className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(totals.saldo)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Margem</p>
            <p className={`text-xl font-bold ${totals.margemPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct(totals.margemPct)}</p>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      {totals.breakdown.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Composição dos Custos</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={totals.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {totals.breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
