import { useState, useMemo } from 'react'
import { BarChart2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useMyUnit } from '@/hooks/useMyUnit'
import { computeMonthsInRange, type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
import { TabVisaoGeral } from './relatorios/TabVisaoGeral'
import { TabECUArquivos } from './relatorios/TabECUArquivos'
import { TabClientesVendedores } from './relatorios/TabClientesVendedores'
import { TabEquipeCustos } from './relatorios/TabEquipeCustos'
import { TabFinanceiro } from './relatorios/TabFinanceiro'

type TabId = 'visao-geral' | 'ecu' | 'clientes' | 'equipe' | 'financeiro'

const TABS: { id: TabId; label: string }[] = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'ecu',         label: 'ECU & Arquivos' },
  { id: 'clientes',    label: 'Clientes & Vendedores' },
  { id: 'equipe',      label: 'Equipe & Custos' },
  { id: 'financeiro',  label: 'Financeiro' },
]

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

export default function RelatoriosPage() {
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id

  const now = new Date()
  const [mode, setMode] = useState<'monthly' | 'range'>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString().slice(0, 10)
  })
  const [rangeTo, setRangeTo] = useState(() => now.toISOString().slice(0, 10))
  const [activeTab, setActiveTab] = useState<TabId>('visao-geral')

  const period = useMemo<PeriodFilter>(() => {
    if (mode === 'monthly') return monthlyToRange(year, month)
    return { dateFrom: rangeFrom, dateTo: rangeTo }
  }, [mode, year, month, rangeFrom, rangeTo])

  const months = useMemo<MonthRef[]>(
    () => computeMonthsInRange(period.dateFrom, period.dateTo),
    [period]
  )

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-red-400" />
        <h1 className="text-xl font-bold text-white">Relatórios</h1>
      </div>

      {/* Period filter */}
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
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="h-8 w-36 text-sm"
            />
            <span className="text-zinc-500 text-sm">até</span>
            <Input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto border-b border-zinc-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!unitId ? (
        <div className="py-12 text-center text-sm text-zinc-500">Carregando...</div>
      ) : (
        <>
          {activeTab === 'visao-geral' && <TabVisaoGeral  unitId={unitId} period={period} months={months} />}
          {activeTab === 'ecu'         && <TabECUArquivos unitId={unitId} period={period} />}
          {activeTab === 'clientes'    && <TabClientesVendedores unitId={unitId} period={period} />}
          {activeTab === 'equipe'      && <TabEquipeCustos unitId={unitId} period={period} months={months} />}
          {activeTab === 'financeiro'  && <TabFinanceiro  unitId={unitId} period={period} months={months} />}
        </>
      )}
    </div>
  )
}
