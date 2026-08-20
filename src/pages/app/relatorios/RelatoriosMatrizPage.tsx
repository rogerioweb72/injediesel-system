import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Building2, TrendingUp, Layers, MapPin, Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { fmt, exportToCSV, exportToXLSX, type PeriodFilter } from '@/hooks/useRelatorios'
import { useRelatoriosComparativo, type UnitComparativoRow } from '@/hooks/useRelatoriosComparativo'

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function monthlyToRange(year: number, month: number): PeriodFilter {
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo:   `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

// ─── Colunas ordenáveis ────────────────────────────────────────────────────────

type SortKey = 'name' | 'state' | 'ecuCount' | 'faturamento' | 'gastoMatriz' | 'ticketMedio' | 'clientesCount' | 'vendedoresCount'

interface ColDef {
  key: SortKey
  label: string
  numeric: boolean
  render: (r: UnitComparativoRow) => string
}

const COLS: ColDef[] = [
  { key: 'name',            label: 'Unidade',        numeric: false, render: (r) => r.name },
  { key: 'state',          label: 'UF',             numeric: false, render: (r) => r.state || '—' },
  { key: 'ecuCount',        label: 'Arquivos ECU',   numeric: true,  render: (r) => String(r.ecuCount) },
  { key: 'faturamento',     label: 'Faturamento',    numeric: true,  render: (r) => fmt(r.faturamento) },
  { key: 'gastoMatriz',     label: 'Gasto c/ Matriz', numeric: true, render: (r) => fmt(r.gastoMatriz) },
  { key: 'ticketMedio',     label: 'Ticket Médio',   numeric: true,  render: (r) => fmt(r.ticketMedio) },
  { key: 'clientesCount',   label: 'Clientes',       numeric: true,  render: (r) => String(r.clientesCount) },
  { key: 'vendedoresCount', label: 'Vendedores',     numeric: true,  render: (r) => String(r.vendedoresCount) },
]

// ─── Campos exportáveis (seleção pelo usuário) ────────────────────────────────

interface ExportField {
  key: string
  label: string
  value: (r: UnitComparativoRow) => string | number
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name',            label: 'Unidade',         value: (r) => r.name },
  { key: 'city',            label: 'Cidade',          value: (r) => r.city ?? '' },
  { key: 'state',          label: 'UF',              value: (r) => r.state ?? '' },
  { key: 'ecuCount',        label: 'Arquivos ECU',    value: (r) => r.ecuCount },
  { key: 'faturamento',     label: 'Faturamento',     value: (r) => Number(r.faturamento.toFixed(2)) },
  { key: 'gastoMatriz',     label: 'Gasto c/ Matriz', value: (r) => Number(r.gastoMatriz.toFixed(2)) },
  { key: 'margem',          label: 'Margem',          value: (r) => Number(r.margem.toFixed(2)) },
  { key: 'ticketMedio',     label: 'Ticket Médio',    value: (r) => Number(r.ticketMedio.toFixed(2)) },
  { key: 'clientesCount',   label: 'Clientes',        value: (r) => r.clientesCount },
  { key: 'vendedoresCount', label: 'Vendedores',      value: (r) => r.vendedoresCount },
]

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className="text-red-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}

export default function RelatoriosMatrizPage() {
  const now = new Date()
  const [mode, setMode] = useState<'monthly' | 'range'>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rangeFrom, setRangeFrom] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [rangeTo, setRangeTo] = useState(() => now.toISOString().slice(0, 10))

  const [sortKey, setSortKey] = useState<SortKey>('faturamento')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const period = useMemo<PeriodFilter>(() => {
    if (mode === 'monthly') return monthlyToRange(year, month)
    return { dateFrom: rangeFrom, dateTo: rangeTo }
  }, [mode, year, month, rangeFrom, rangeTo])

  const { data, isLoading } = useRelatoriosComparativo(period)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const sortedRows = useMemo(() => {
    const rows = [...(data?.rows ?? [])]
    const col = COLS.find((c) => c.key === sortKey)
    rows.sort((a, b) => {
      let cmp: number
      if (col?.numeric) {
        cmp = (a[sortKey] as number) - (b[sortKey] as number)
      } else {
        cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // ─── Export ─────────────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  )

  function toggleField(key: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleExport(format: 'csv' | 'xlsx') {
    if (!sortedRows.length) { toast.error('Nada para exportar no período.'); return }
    const fields = EXPORT_FIELDS.filter((f) => selectedFields.has(f.key))
    if (!fields.length) { toast.error('Selecione ao menos um campo.'); return }

    const rows = sortedRows.map((r) => {
      const obj: Record<string, string | number> = {}
      for (const f of fields) obj[f.label] = f.value(r)
      return obj
    })
    const filename = `comparativo-unidades-${period.dateFrom}-a-${period.dateTo}.${format}`
    if (format === 'csv') exportToCSV(rows, filename)
    else exportToXLSX(rows, filename)
    toast.success(`Comparativo ${format.toUpperCase()} exportado`)
    setExportOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-400" />
          <h1 className="text-xl font-bold text-white">Relatórios · Comparativo entre Unidades</h1>
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download size={16} className="mr-2" />Exportar
        </Button>
      </div>

      {/* Filtro de período */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
        <div className="flex gap-1 rounded-lg border border-zinc-700 p-0.5 w-fit">
          {(['monthly', 'range'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                mode === m ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {m === 'monthly' ? 'Mensal' : 'Período'}
            </button>
          ))}
        </div>

        {mode === 'monthly' ? (
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="h-8 w-36 text-sm" />
            <span className="text-zinc-500 text-sm">até</span>
            <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
        )}
      </div>

      {/* KPIs de topo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Building2}  label="Unidades"       value={String(data?.totais.unidades ?? 0)} />
        <KpiCard icon={Layers}     label="Arquivos ECU"   value={String(data?.totais.ecuCount ?? 0)} />
        <KpiCard icon={TrendingUp} label="Faturamento"    value={fmt(data?.totais.faturamento ?? 0)} />
        <KpiCard icon={TrendingUp} label="Gasto c/ Matriz" value={fmt(data?.totais.gastoMatriz ?? 0)} />
      </div>

      {/* Tabela comparativa */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {COLS.map((c) => {
                  const active = c.key === sortKey
                  return (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`px-3 py-2.5 font-semibold whitespace-nowrap cursor-pointer select-none ${c.numeric ? 'text-right' : 'text-left'} ${active ? 'text-white' : 'text-zinc-400'} hover:text-white`}
                    >
                      <span className={`inline-flex items-center gap-1 ${c.numeric ? 'flex-row-reverse' : ''}`}>
                        {c.label}
                        {active
                          ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                          : <ArrowUpDown size={12} className="opacity-40" />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-zinc-500">Carregando...</td></tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-zinc-500">Nenhuma unidade no período.</td></tr>
              ) : (
                sortedRows.map((r) => (
                  <tr key={r.unitId} className="border-b border-zinc-800 last:border-0 hover:bg-white/[0.03]">
                    {COLS.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 whitespace-nowrap ${c.numeric ? 'text-right tabular-nums text-zinc-200' : 'text-white font-medium'}`}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdowns por tipo de serviço e por região */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={15} className="text-red-400" />
            <h2 className="text-sm font-bold text-white">Por Tipo de Serviço</h2>
          </div>
          <div className="space-y-1.5">
            {(data?.byServiceType ?? []).length === 0 && <p className="text-sm text-zinc-500">Sem dados no período.</p>}
            {(data?.byServiceType ?? []).map((s) => (
              <div key={s.serviceType} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{s.serviceType}</span>
                <span className="text-zinc-400 tabular-nums">{s.count} · <span className="text-zinc-200">{fmt(s.faturamento)}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} className="text-red-400" />
            <h2 className="text-sm font-bold text-white">Por Região (UF)</h2>
          </div>
          <div className="space-y-1.5">
            {(data?.byRegion ?? []).length === 0 && <p className="text-sm text-zinc-500">Sem dados no período.</p>}
            {(data?.byRegion ?? []).map((r) => (
              <div key={r.state} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{r.state} · {r.unidades} un.</span>
                <span className="text-zinc-400 tabular-nums">{r.ecuCount} · <span className="text-zinc-200">{fmt(r.faturamento)}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sheet de export com seleção de campos */}
      <Sheet open={exportOpen} onOpenChange={setExportOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SheetTitle className="text-white flex items-center gap-2">
              <Download size={16} /> Exportar comparativo
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <p className="text-xs text-zinc-500">
              Período: {period.dateFrom} até {period.dateTo}. Selecione os campos e o formato.
              A exportação respeita a ordenação atual da tabela.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Campos</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.key)))}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Todos
                  </button>
                  <span className="text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFields(new Set())}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              {EXPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2.5 cursor-pointer py-1">
                  <Checkbox checked={selectedFields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                  <span className="text-sm text-zinc-200">{f.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" variant="outline" onClick={() => handleExport('csv')}>CSV</Button>
              <Button className="flex-1" style={{ background: 'var(--pm-accent-gradient)' }} onClick={() => handleExport('xlsx')}>XLSX</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
