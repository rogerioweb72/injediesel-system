// src/pages/app/franqueados/FranqueadoFaturasPage.tsx
import { useState, useMemo } from 'react'
import { Loader2, Download, Info, CheckCircle2, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'
import {
  useFaturasMyUnit, fmtFatura, diasAberto, diasColor,
  type FaturaItem,
} from '@/hooks/useFaturas'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function veiculoLabel(item: FaturaItem) {
  return item.vehicles
    ? `${item.vehicles.brand} ${item.vehicles.model}`
    : [item.vehicle_info?.marca, item.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
}

function exportCSV(emAberto: FaturaItem[], pagos: FaturaItem[]) {
  const all = [...emAberto, ...pagos]
  const header = 'Arquivo,Tipo,Veículo,Data Solicitação,Data Pagamento,Status,Valor'
  const rows = all.map((i) => [
    i.id.slice(0, 8).toUpperCase(),
    i.service_type,
    veiculoLabel(i),
    fmtDate(i.created_at),
    fmtDateTime(i.matrix_paid_at),
    i.matrix_payment_status === 'pago' ? 'PAGO' : 'EM ABERTO',
    i.amount_charged_by_matrix.toFixed(2).replace('.', ','),
  ].join(',')).join('\n')
  const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'extrato-faturas.csv'; a.click()
  URL.revokeObjectURL(url)
}

function ResumoCard({
  label, value, color, bg, border,
}: { label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1.5"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{fmtFatura(value)}</p>
    </div>
  )
}

function TabelaFaturas({
  items, showPaidAt = false,
}: { items: FaturaItem[]; showPaidAt?: boolean }) {
  if (items.length === 0) return null
  const headers = ['Arquivo', 'Tipo', 'Veículo', 'Data Solicitação',
    showPaidAt ? 'Data Pagamento' : 'Dias em Aberto', 'Valor', 'Status']
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'hsl(var(--pm-gray-600))' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const dias = diasAberto(item.created_at)
              return (
                <tr key={item.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-mono text-xs text-white">{item.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-300))' }}>{item.service_type}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>{veiculoLabel(item)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{fmtDate(item.created_at)}</td>
                  {showPaidAt ? (
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>{fmtDateTime(item.matrix_paid_at)}</td>
                  ) : (
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: diasColor(dias) }}>{dias}d</td>
                  )}
                  <td className="px-4 py-3 text-xs font-semibold text-white">{fmtFatura(item.amount_charged_by_matrix)}</td>
                  <td className="px-4 py-3"><BadgeStatusFinanceiro status={item.matrix_payment_status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PAGE_SIZE = 20

export default function FranqueadoFaturasPage() {
  const { emAberto, todosPageos, resumo, isLoading } = useFaturasMyUnit()
  const [mesFiltro, setMesFiltro] = useState('')
  const [pagHistorico, setPagHistorico] = useState(0)

  const pagosFiltrados = useMemo(() => {
    const all = todosPageos.data ?? []
    if (!mesFiltro) return all
    const [ano, mes] = mesFiltro.split('-')
    return all.filter((i) => {
      if (!i.matrix_paid_at) return false
      const d = new Date(i.matrix_paid_at)
      return d.getFullYear() === Number(ano) && (d.getMonth() + 1) === Number(mes)
    })
  }, [todosPageos.data, mesFiltro])

  const pagosPaginated = pagosFiltrados.slice(pagHistorico * PAGE_SIZE, (pagHistorico + 1) * PAGE_SIZE)
  const totalPaginas = Math.ceil(pagosFiltrados.length / PAGE_SIZE)

  const selectStyle: React.CSSProperties = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--pm-gray-300))',
    borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Faturas" subtitle="Acompanhamento de cobranças ECU" />
        <Button
          size="sm" variant="outline"
          onClick={() => exportCSV(emAberto.data ?? [], todosPageos.data ?? [])}
          className="gap-1.5 text-xs"
        >
          <Download size={12} /> Exportar extrato
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ResumoCard label="Em Aberto" value={resumo.totalEmAberto}
          color="#ef4444" bg="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.2)" />
        <ResumoCard label="Pago este mês" value={resumo.totalPagoMes}
          color="#22c55e" bg="rgba(34,197,94,0.06)" border="rgba(34,197,94,0.2)" />
        <ResumoCard label="Total histórico pago" value={resumo.totalHistorico}
          color="hsl(var(--pm-gray-300))" bg="hsl(var(--pm-gray-900))" border="rgba(255,255,255,0.06)" />
      </div>

      {/* Em Aberto */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Em Aberto
          </p>
          {resumo.qtdEmAberto > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {resumo.qtdEmAberto}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
          </div>
        ) : (emAberto.data ?? []).length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 rounded-xl"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CheckCircle2 size={16} style={{ color: 'hsl(var(--pm-gray-700))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhuma fatura em aberto ✓</p>
          </div>
        ) : (
          <>
            <TabelaFaturas items={emAberto.data ?? []} showPaidAt={false} />
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-white">
                Total em aberto:{' '}
                <span style={{ color: '#ef4444' }}>{fmtFatura(resumo.totalEmAberto)}</span>
              </p>
            </div>
          </>
        )}

        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Info size={14} style={{ color: 'hsl(var(--pm-gray-500))', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Para solicitar o fechamento das suas notas, entre em contato com a matriz.
          </p>
        </div>
      </section>

      {/* Histórico */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={13} style={{ color: '#22c55e' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Pagos
            </p>
            {pagosFiltrados.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                {pagosFiltrados.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="month" value={mesFiltro}
              onChange={(e) => { setMesFiltro(e.target.value); setPagHistorico(0) }}
              style={selectStyle} />
            {mesFiltro && (
              <button onClick={() => { setMesFiltro(''); setPagHistorico(0) }}
                className="text-xs underline" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Limpar
              </button>
            )}
          </div>
        </div>

        {todosPageos.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
          </div>
        ) : pagosPaginated.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-xl"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <>
            <TabelaFaturas items={pagosPaginated} showPaidAt />
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button disabled={pagHistorico === 0} onClick={() => setPagHistorico((p) => p - 1)}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-300))' }}>
                  Anterior
                </button>
                <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  {pagHistorico + 1} / {totalPaginas}
                </span>
                <button disabled={pagHistorico >= totalPaginas - 1} onClick={() => setPagHistorico((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-300))' }}>
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
