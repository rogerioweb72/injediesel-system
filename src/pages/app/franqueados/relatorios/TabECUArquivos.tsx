import { useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEcuJobsReport, fmt, pct, type PeriodFilter } from '@/hooks/useRelatorios'

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Recebido', em_triagem: 'Em Triagem',
  em_processamento: 'Em Processamento', aguardando_cliente: 'Aguard. Cliente',
  concluido: 'Concluído', cancelado: 'Cancelado',
}
const STATUS_ORDER = ['recebido','em_triagem','em_processamento','aguardando_cliente','concluido','cancelado']
const PAGE_SIZE = 15

export function TabECUArquivos({ unitId, period }: { unitId: string; period: PeriodFilter }) {
  const { data: jobs = [], isLoading } = useEcuJobsReport(unitId, period)
  const [page, setPage] = useState(0)

  const byType = useMemo(() => {
    const m: Record<string, { qtd: number; receita: number; custo: number; margem: number }> = {}
    jobs.forEach(j => {
      if (!m[j.service_type]) m[j.service_type] = { qtd: 0, receita: 0, custo: 0, margem: 0 }
      m[j.service_type].qtd++
      m[j.service_type].receita += j.amount_charged_to_customer
      m[j.service_type].custo   += j.amount_charged_by_matrix
      m[j.service_type].margem  += j.franchise_margin_amount
    })
    return Object.entries(m)
      .map(([type, d]) => ({ type, ...d, margemPct: d.receita > 0 ? (d.margem / d.receita) * 100 : 0 }))
      .sort((a, b) => b.receita - a.receita)
  }, [jobs])

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {}
    jobs.forEach(j => { m[j.status] = (m[j.status] ?? 0) + 1 })
    return m
  }, [jobs])

  const kpis = useMemo(() => ({
    total: jobs.length,
    receita: jobs.reduce((s, j) => s + j.amount_charged_to_customer, 0),
    custo:   jobs.reduce((s, j) => s + j.amount_charged_by_matrix, 0),
    margemPct: jobs.length ? jobs.reduce((s, j) => s + j.franchise_margin_percentage, 0) / jobs.length : 0,
  }), [jobs])

  const paginated = jobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(jobs.length / PAGE_SIZE)

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-60 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Jobs',    value: String(kpis.total) },
          { label: 'Receita ECU',   value: fmt(kpis.receita) },
          { label: 'Custo Matriz',  value: fmt(kpis.custo) },
          { label: 'Margem Média',  value: pct(kpis.margemPct) },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className="text-lg font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">Por Tipo de Serviço</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Tipo','Qtd','Receita','Custo Matriz','Margem R$','Margem %'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byType.map(row => (
                  <tr key={row.type} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-4 py-2 text-zinc-300">{row.type}</td>
                    <td className="px-4 py-2 text-white">{row.qtd}</td>
                    <td className="px-4 py-2 text-white">{fmt(row.receita)}</td>
                    <td className="px-4 py-2 text-white">{fmt(row.custo)}</td>
                    <td className="px-4 py-2 text-emerald-400">{fmt(row.margem)}</td>
                    <td className="px-4 py-2 text-emerald-400">{pct(row.margemPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status funnel */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Funil de Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map(s => (
            <div key={s} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2">
              <span className="text-xs text-zinc-400">{STATUS_LABELS[s]}</span>
              <span className="text-sm font-bold text-white">{byStatus[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">
            Jobs ({jobs.length})
          </p>
          <div className="divide-y divide-zinc-800">
            {paginated.map(j => (
              <div key={j.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{j.customer_name}</p>
                  <p className="text-xs text-zinc-500">{j.service_type} · {format(new Date(j.created_at), 'd MMM yyyy', { locale: ptBR })}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-emerald-400 font-medium">{pct(j.franchise_margin_percentage)}</span>
                  <Badge variant="outline" className="text-xs">{STATUS_LABELS[j.status] ?? j.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-zinc-400 hover:text-white disabled:opacity-30">← Anterior</button>
              <span className="text-xs text-zinc-500">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-zinc-400 hover:text-white disabled:opacity-30">Próximo →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
