import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  useUnitEmployees, useUpsertUnitEmployee, useDeactivateUnitEmployee,
  useUnitEmployeeCostsForUnit, useUpsertUnitEmployeeCost,
  type UnitEmployee, type EmployeeBenefit,
} from '@/hooks/useUnitEmployees'
import { useFinancialEntriesReport, useCommissionsReport, fmt, type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function EmployeeModal({ unitId, employee, open, onOpenChange }: {
  unitId: string; employee: UnitEmployee | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertUnitEmployee()
  const [name, setName] = useState(employee?.name ?? '')
  const [position, setPosition] = useState(employee?.position ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim() || !position.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({ ...(employee?.id ? { id: employee.id } : {}), unit_id: unitId, name: name.trim(), position: position.trim() })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Ex: Técnico ECU" />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || !position.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CostModal({ employee, year, month, open, onOpenChange }: {
  employee: UnitEmployee; year: number; month: number; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertUnitEmployeeCost()
  const [base, setBase] = useState('')
  const [benefits, setBenefits] = useState<EmployeeBenefit[]>([{ category: '', amount: 0 }])
  const [err, setErr] = useState<string | null>(null)

  function updateBenefit(i: number, field: 'category' | 'amount', v: string) {
    setBenefits(prev => prev.map((b, j) => j === i ? { ...b, [field]: field === 'amount' ? Number(v) : v } : b))
  }

  async function save() {
    const salary = Number(base)
    if (!salary || salary < 0) return
    setErr(null)
    try {
      await upsert.mutateAsync({ employee_id: employee.id, year, month, base_salary: salary, benefits: benefits.filter(b => b.category.trim()) })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Custo — {employee.name} ({MONTH_NAMES[month - 1]}/{year})</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Salário Base (R$)</Label>
            <Input type="number" min="0" step="0.01" value={base} onChange={e => setBase(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Benefícios</Label>
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input value={b.category} onChange={e => updateBenefit(i, 'category', e.target.value)} placeholder="Vale Transporte..." className="flex-1" />
                <Input type="number" min="0" step="0.01" value={b.amount || ''} onChange={e => updateBenefit(i, 'amount', e.target.value)} placeholder="R$" className="w-24" />
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-zinc-500 hover:text-red-400" onClick={() => setBenefits(p => p.filter((_, j) => j !== i))} disabled={benefits.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBenefits(p => [...p, { category: '', amount: 0 }])}>
              <Plus className="mr-1 h-3 w-3" />Adicionar benefício
            </Button>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!base || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabEquipeCustos({ unitId, period, months }: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  const { data: employees = [], isLoading: le } = useUnitEmployees(unitId)
  const { data: empCosts = [], isLoading: lc } = useUnitEmployeeCostsForUnit(unitId, months)
  const { data: commissions = [], isLoading: lk } = useCommissionsReport(unitId, period)
  const { data: entries = [], isLoading: lf } = useFinancialEntriesReport(unitId, period)
  const deactivate = useDeactivateUnitEmployee()

  const [empOpen, setEmpOpen] = useState(false)
  const [costOpen, setCostOpen] = useState(false)
  const [editing, setEditing] = useState<UnitEmployee | null>(null)
  const [costEmp, setCostEmp] = useState<UnitEmployee | null>(null)

  const costYear  = months[0]?.year  ?? new Date().getFullYear()
  const costMonth = months[0]?.month ?? new Date().getMonth() + 1

  const summary = useMemo(() => {
    const salaries  = empCosts.reduce((s, c) => s + c.base_salary + (c.benefits).reduce((b, x) => b + x.amount, 0), 0)
    const commTotal = commissions.reduce((s, c) => s + c.amount, 0)
    const despesas  = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0)
    return { salaries, commTotal, despesas, total: salaries + commTotal + despesas }
  }, [empCosts, commissions, entries])

  if (le || lc || lk || lf) return <div className="space-y-4"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>

  return (
    <div className="space-y-5">
      {/* Employees */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Funcionários</p>
          <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setEmpOpen(true) }}>
            <Plus className="mr-1 h-3 w-3" />Novo
          </Button>
        </div>
        {employees.length === 0
          ? <p className="p-4 text-sm text-zinc-500">Nenhum funcionário cadastrado.</p>
          : (
            <div className="divide-y divide-zinc-800">
              {employees.map(emp => {
                const cost = empCosts.find(c => c.employee_id === emp.id)
                const total = cost ? cost.base_salary + (cost.benefits).reduce((s, b) => s + b.amount, 0) : null
                return (
                  <div key={emp.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{emp.name}</p>
                      <p className="text-xs text-zinc-500">{emp.position}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-zinc-300">{total !== null ? fmt(total) : <span className="text-xs text-zinc-600">sem custo</span>}</span>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-white" onClick={() => { setCostEmp(emp); setCostOpen(true) }}>Custo</Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(emp); setEmpOpen(true) }}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400" onClick={() => deactivate.mutate(emp)} disabled={deactivate.isPending}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

      {/* Cost summary */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">Resumo de Custos</p>
        <div className="divide-y divide-zinc-800">
          {[
            { label: 'Salários + Benefícios', value: summary.salaries },
            { label: 'Comissões',             value: summary.commTotal },
            { label: 'Despesas Manuais',      value: summary.despesas },
          ].map(row => (
            <div key={row.label} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-zinc-400">{row.label}</span>
              <span className="text-white font-medium">{fmt(row.value)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-zinc-800/50 text-sm font-bold">
            <span className="text-white">Total</span>
            <span className="text-white">{fmt(summary.total)}</span>
          </div>
        </div>
      </div>

      <EmployeeModal key={editing?.id ?? 'new'} unitId={unitId} employee={editing} open={empOpen} onOpenChange={setEmpOpen} />
      {costEmp && (
        <CostModal key={`${costEmp.id}-${costYear}-${costMonth}`} employee={costEmp} year={costYear} month={costMonth} open={costOpen} onOpenChange={setCostOpen} />
      )}
    </div>
  )
}
