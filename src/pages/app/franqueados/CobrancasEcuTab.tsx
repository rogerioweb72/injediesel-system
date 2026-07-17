// src/pages/app/franqueados/CobrancasEcuTab.tsx
import { useState, useMemo } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useFranchiseJobHistory, fmtBRL,
  type CobrancaEcuItem,
} from '@/hooks/useFranquiasFinanceiro'
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'

type StatusFilter = 'todos' | 'em_aberto' | 'pago'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


function exportCSV(items: CobrancaEcuItem[], unitName: string) {
  const header = 'Arquivo,Tipo,Cliente,Veículo,Data Envio,Valor,Status,Pago em,Forma'
  const rows = items.map((item) => {
    const veiculo = item.vehicles
      ? `${item.vehicles.brand} ${item.vehicles.model}`
      : [item.vehicle_info?.marca, item.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
    return [
      item.id.slice(0, 8).toUpperCase(),
      item.service_type,
      item.customers?.name ?? '—',
      veiculo,
      fmtDate(item.created_at),
      (item.amount_charged_by_matrix ?? 0).toFixed(2).replace('.', ','),
      item.matrix_payment_status === 'pago' ? 'Pago' : 'Em Aberto',
      item.matrix_paid_at ? fmtDate(item.matrix_paid_at) : '—',
      item.financeiro_pagamentos?.forma_pagamento ?? '—',
    ].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `extrato-${unitName.replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  unitId: string
  unitName: string
}

export default function CobrancasEcuTab({ unitId, unitName }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [mes, setMes] = useState('')

  const { data: items = [], isLoading } = useFranchiseJobHistory(unitId, {
    status: statusFilter,
    mes: mes || undefined,
  })

  const totais = useMemo(() => {
    const total    = items.reduce((s, i) => s + (i.amount_charged_by_matrix ?? 0), 0)
    const pago     = items.filter((i) => i.matrix_payment_status === 'pago').reduce((s, i) => s + (i.amount_charged_by_matrix ?? 0), 0)
    const emAberto = items.filter((i) => i.matrix_payment_status === 'em_aberto').reduce((s, i) => s + (i.amount_charged_by_matrix ?? 0), 0)
    return { total, pago, emAberto }
  }, [items])

  const selectStyle: React.CSSProperties = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--pm-gray-300))',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    outline: 'none',
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
        {[
          { label: 'Em Aberto', value: totais.emAberto, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
          { label: 'Pago (período)', value: totais.pago, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
          { label: 'Total período', value: totais.total, color: 'hsl(var(--pm-gray-300))', bg: 'hsl(var(--pm-gray-900))', border: 'rgba(255,255,255,0.06)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl p-4 flex flex-col gap-1"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>{label}</p>
            <p className="text-lg font-bold" style={{ color }}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} style={selectStyle}>
            <option value="todos">Todos os status</option>
            <option value="em_aberto">Em Aberto</option>
            <option value="pago">Pagos</option>
          </select>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            style={{ ...selectStyle, cursor: 'pointer' }}
          />
          {mes && (
            <button onClick={() => setMes('')} className="text-xs underline" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Limpar
            </button>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => exportCSV(items, unitName)} className="gap-1.5 text-xs">
          <Download size={12} /> Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-12 rounded-xl"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhuma cobrança encontrada</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Arquivo', 'Tipo', 'Veículo', 'Data Envio', 'Valor', 'Status', 'Pago em', 'Forma'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'hsl(var(--pm-gray-600))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const veiculo = item.vehicles
                    ? `${item.vehicles.brand} ${item.vehicles.model}`
                    : [item.vehicle_info?.marca, item.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
                  return (
                    <tr key={item.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 font-mono text-xs text-white">{item.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-300))' }}>{item.service_type}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>{veiculo}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{fmtDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-white">{fmtBRL(item.amount_charged_by_matrix ?? 0)}</td>
                      <td className="px-4 py-3"><BadgeStatusFinanceiro status={item.matrix_payment_status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        {item.matrix_paid_at ? fmtDate(item.matrix_paid_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        {item.financeiro_pagamentos?.forma_pagamento ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-6 px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>Total período</p>
              <p className="text-sm font-bold text-white">{fmtBRL(totais.total)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>Pago</p>
              <p className="text-sm font-bold" style={{ color: '#4ADE80' }}>{fmtBRL(totais.pago)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>Em aberto</p>
              <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>{fmtBRL(totais.emAberto)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
