# Relatórios Franqueado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `EmBreve` stub at `/relatorios` with a 5-tab reporting dashboard where franchise managers track revenue, ECU margins, service mix, top clients, team costs, and financial health.

**Architecture:** `RelatoriosPage` holds a global period filter (monthly or date range) and renders one of 5 tab components. Each tab receives `{ unitId, period, months }` as props and fetches its own data. All aggregations run client-side. Two hooks: `useRelatorios` (reads) and `useUnitEmployees` (employee CRUD + costs).

**Tech Stack:** React 19, TypeScript, TanStack Query 5, Supabase (`(supabase as any)` pattern with eslint-disable), Recharts 3 (already installed), Tailwind CSS, shadcn/ui (Button, Input, Select, Label, Badge, Skeleton, Dialog).

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/046_unit_employees_royalty.sql` | Create |
| `src/hooks/useUnitEmployees.ts` | Create |
| `src/hooks/useRelatorios.ts` | Create |
| `src/pages/app/franqueados/RelatoriosPage.tsx` | Create |
| `src/pages/app/franqueados/relatorios/TabVisaoGeral.tsx` | Create |
| `src/pages/app/franqueados/relatorios/TabECUArquivos.tsx` | Create |
| `src/pages/app/franqueados/relatorios/TabClientesVendedores.tsx` | Create |
| `src/pages/app/franqueados/relatorios/TabEquipeCustos.tsx` | Create |
| `src/pages/app/franqueados/relatorios/TabFinanceiro.tsx` | Create |
| `src/router/index.tsx` | Modify — replace EmBreve stub |

---

### Task 1: Migration 046 — unit_employees, unit_employee_costs, royalty

**Files:**
- Create: `supabase/migrations/046_unit_employees_royalty.sql`

- [ ] **Step 1: Create migration**

```sql
-- 046_unit_employees_royalty.sql
-- Funcionários da unidade + custo mensal + royalty da franqueadora

create table if not exists unit_employees (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references franchise_units(id) on delete cascade,
  name       text not null,
  position   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists unit_employees_unit_idx   on unit_employees (unit_id);
create index if not exists unit_employees_active_idx on unit_employees (unit_id, active);

create table if not exists unit_employee_costs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references unit_employees(id) on delete cascade,
  year        int not null check (year >= 2020 and year <= 2100),
  month       int not null check (month >= 1 and month <= 12),
  base_salary numeric(12,2) not null check (base_salary >= 0),
  benefits    jsonb not null default '[]',
  -- benefits: [{ "category": "Vale Transporte", "amount": 200.00 }]
  created_at  timestamptz not null default now(),
  unique (employee_id, year, month)
);

create index if not exists unit_employee_costs_employee_idx on unit_employee_costs (employee_id);
create index if not exists unit_employee_costs_period_idx   on unit_employee_costs (year, month);

-- Royalty da franqueadora (habilitado e configurado pela matriz)
alter table franchise_units
  add column if not exists royalty_enabled    boolean not null default false,
  add column if not exists royalty_percentage numeric(5,2) not null default 0;

-- RLS: unit_employees
alter table unit_employees enable row level security;

create policy "unit_employees_read" on unit_employees
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = unit_employees.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "unit_employees_write" on unit_employees
  for all using (
    exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = unit_employees.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- RLS: unit_employee_costs
alter table unit_employee_costs enable row level security;

create policy "unit_employee_costs_read" on unit_employee_costs
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from unit_employees ue
      join user_unit_roles uur on uur.unit_id = ue.unit_id
      where ue.id = unit_employee_costs.employee_id
        and uur.user_id = auth.uid()
    )
  );

create policy "unit_employee_costs_write" on unit_employee_costs
  for all using (
    exists (
      select 1 from unit_employees ue
      join user_unit_roles uur on uur.unit_id = ue.unit_id
      where ue.id = unit_employee_costs.employee_id
        and uur.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/046_unit_employees_royalty.sql
git commit -m "feat: add unit_employees and unit_employee_costs tables with royalty columns"
```

---

### Task 2: Hook useUnitEmployees

**Files:**
- Create: `src/hooks/useUnitEmployees.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UnitEmployee {
  id: string
  unit_id: string
  name: string
  position: string
  active: boolean
  created_at: string
}

export interface EmployeeBenefit {
  category: string
  amount: number
}

export interface UnitEmployeeCost {
  id: string
  employee_id: string
  year: number
  month: number
  base_salary: number
  benefits: EmployeeBenefit[]
  created_at: string
}

export function useUnitEmployees(unitId?: string) {
  return useQuery({
    queryKey: ['unit-employees', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employees')
        .select('*')
        .eq('unit_id', unitId)
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as UnitEmployee[]
    },
  })
}

export function useUpsertUnitEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string
      name: string
      position: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employees')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as UnitEmployee
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['unit-employees', vars.unit_id] })
    },
  })
}

export function useDeactivateUnitEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (employee: UnitEmployee) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('unit_employees')
        .update({ active: false })
        .eq('id', employee.id)
      if (error) throw error
    },
    onSuccess: (_data, employee) => {
      qc.invalidateQueries({ queryKey: ['unit-employees', employee.unit_id] })
    },
  })
}

export function useUnitEmployeeCostsForUnit(
  unitId?: string,
  months?: Array<{ year: number; month: number }>
) {
  return useQuery({
    queryKey: ['unit-employee-costs-unit', unitId, months],
    enabled: !!unitId && !!months && months.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: employees, error: empErr } = await (supabase as any)
        .from('unit_employees')
        .select('id')
        .eq('unit_id', unitId)
        .eq('active', true)
      if (empErr) throw empErr
      if (!employees?.length) return [] as UnitEmployeeCost[]

      const empIds = employees.map((e: { id: string }) => e.id)
      const periodFilter = months!
        .map((m) => `and(year.eq.${m.year},month.eq.${m.month})`)
        .join(',')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employee_costs')
        .select('*')
        .in('employee_id', empIds)
        .or(periodFilter)
      if (error) throw error
      return (data ?? []) as UnitEmployeeCost[]
    },
  })
}

export function useUpsertUnitEmployeeCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      employee_id: string
      year: number
      month: number
      base_salary: number
      benefits: EmployeeBenefit[]
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('unit_employee_costs')
        .upsert(payload, { onConflict: 'employee_id,year,month' })
        .select()
        .single()
      if (error) throw error
      return data as UnitEmployeeCost
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-employee-costs-unit'] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUnitEmployees.ts
git commit -m "feat: add useUnitEmployees hook for employee CRUD and monthly cost tracking"
```

---

### Task 3: Hook useRelatorios

**Files:**
- Create: `src/hooks/useRelatorios.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Period helpers ───────────────────────────────────────────────────────────

export interface PeriodFilter {
  dateFrom: string  // "YYYY-MM-DD"
  dateTo: string    // "YYYY-MM-DD"
}

export interface MonthRef {
  year: number
  month: number
}

export function computeMonthsInRange(dateFrom: string, dateTo: string): MonthRef[] {
  const months: MonthRef[] = []
  const end = new Date(dateTo)
  const cur = new Date(dateFrom)
  cur.setDate(1)
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface EcuJobReport {
  id: string
  customer_id: string
  customer_name: string
  service_type: string
  status: string
  amount_charged_to_customer: number
  amount_charged_by_matrix: number
  franchise_margin_amount: number
  franchise_margin_percentage: number
  created_at: string
}

export interface OrderReport {
  id: string
  total: number
  created_at: string
  source: 'order' | 'pos'
  customer_id: string | null
}

export interface FinancialEntryReport {
  id: string
  type: 'receita' | 'despesa'
  amount: number
  description: string
  category_name: string
  period_year: number
  period_month: number
}

export interface CommissionReport {
  id: string
  seller_id: string
  seller_name: string
  amount: number
  paid: boolean
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEcuJobsReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-ecu', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('id, customer_id, service_type, status, amount_charged_to_customer, amount_charged_by_matrix, franchise_margin_amount, franchise_margin_percentage, created_at, customers(name)')
        .eq('unit_id', unitId)
        .gte('created_at', period!.dateFrom)
        .lte('created_at', period!.dateTo + 'T23:59:59')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        customer_id: row.customer_id,
        customer_name: row.customers?.name ?? '—',
        service_type: row.service_type ?? '—',
        status: row.status,
        amount_charged_to_customer: Number(row.amount_charged_to_customer ?? 0),
        amount_charged_by_matrix:   Number(row.amount_charged_by_matrix ?? 0),
        franchise_margin_amount:    Number(row.franchise_margin_amount ?? 0),
        franchise_margin_percentage: Number(row.franchise_margin_percentage ?? 0),
        created_at: row.created_at,
      })) as EcuJobReport[]
    },
  })
}

export function useOrdersReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-orders', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      const [ordersRes, posRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('orders')
          .select('id, total, created_at, customer_id')
          .eq('unit_id', unitId)
          .gte('created_at', period!.dateFrom)
          .lte('created_at', period!.dateTo + 'T23:59:59'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('pos_sales')
          .select('id, total, created_at, customer_id')
          .gte('created_at', period!.dateFrom)
          .lte('created_at', period!.dateTo + 'T23:59:59'),
      ])
      if (ordersRes.error) throw ordersRes.error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders: OrderReport[] = (ordersRes.data ?? []).map((r: any) => ({ ...r, source: 'order' as const, total: Number(r.total ?? 0) }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos: OrderReport[] = (posRes.data ?? []).map((r: any) => ({ ...r, source: 'pos' as const, total: Number(r.total ?? 0) }))
      return [...orders, ...pos]
    },
  })
}

export function useFinancialEntriesReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-financeiro', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      const months = computeMonthsInRange(period!.dateFrom, period!.dateTo)
      const yearRange = [...new Set(months.map((m) => m.year))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('financial_entries')
        .select('id, type, amount, description, period_year, period_month, financial_categories(name)')
        .eq('unit_id', unitId)
        .in('period_year', yearRange)
        .order('period_year', { ascending: false })
      if (error) throw error
      const monthKeys = new Set(months.map((m) => `${m.year}-${m.month}`))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .filter((r) => monthKeys.has(`${r.period_year}-${r.period_month}`))
        .map((r) => ({
          id: r.id,
          type: r.type as 'receita' | 'despesa',
          amount: Number(r.amount ?? 0),
          description: r.description ?? '',
          category_name: r.financial_categories?.name ?? '—',
          period_year: r.period_year,
          period_month: r.period_month,
        })) as FinancialEntryReport[]
    },
  })
}

export function useCommissionsReport(unitId?: string, period?: PeriodFilter) {
  return useQuery({
    queryKey: ['relatorio-commissions', unitId, period],
    enabled: !!unitId && !!period,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roles, error: rolesErr } = await (supabase as any)
        .from('user_unit_roles')
        .select('user_id')
        .eq('unit_id', unitId)
      if (rolesErr) throw rolesErr
      const sellerIds: string[] = (roles ?? []).map((r: { user_id: string }) => r.user_id)
      if (!sellerIds.length) return [] as CommissionReport[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('id, seller_id, amount, paid, profiles(name)')
        .in('seller_id', sellerIds)
        .gte('created_at', period!.dateFrom)
        .lte('created_at', period!.dateTo + 'T23:59:59')
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        seller_id: r.seller_id,
        seller_name: r.profiles?.name ?? '—',
        amount: Number(r.amount ?? 0),
        paid: r.paid,
      })) as CommissionReport[]
    },
  })
}

export function useUnitRoyalty(unitId?: string) {
  return useQuery({
    queryKey: ['unit-royalty', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units')
        .select('royalty_enabled, royalty_percentage')
        .eq('id', unitId)
        .single()
      if (error) return { royalty_enabled: false, royalty_percentage: 0 }
      return data as { royalty_enabled: boolean; royalty_percentage: number }
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRelatorios.ts
git commit -m "feat: add useRelatorios hook with ECU, orders, financial, commissions and royalty queries"
```

---

### Task 4: RelatoriosPage — shell + period filter + tab navigation + router

**Files:**
- Create: `src/pages/app/franqueados/RelatoriosPage.tsx`
- Create: `src/pages/app/franqueados/relatorios/TabVisaoGeral.tsx` (stub)
- Create: `src/pages/app/franqueados/relatorios/TabECUArquivos.tsx` (stub)
- Create: `src/pages/app/franqueados/relatorios/TabClientesVendedores.tsx` (stub)
- Create: `src/pages/app/franqueados/relatorios/TabEquipeCustos.tsx` (stub)
- Create: `src/pages/app/franqueados/relatorios/TabFinanceiro.tsx` (stub)
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Create stub tab files**

Create `src/pages/app/franqueados/relatorios/TabVisaoGeral.tsx`:
```typescript
import { type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
export function TabVisaoGeral(_: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Visão Geral — em breve</div>
}
```

Create `src/pages/app/franqueados/relatorios/TabECUArquivos.tsx`:
```typescript
import { type PeriodFilter } from '@/hooks/useRelatorios'
export function TabECUArquivos(_: { unitId: string; period: PeriodFilter }) {
  return <div className="py-8 text-center text-sm text-zinc-500">ECU & Arquivos — em breve</div>
}
```

Create `src/pages/app/franqueados/relatorios/TabClientesVendedores.tsx`:
```typescript
import { type PeriodFilter } from '@/hooks/useRelatorios'
export function TabClientesVendedores(_: { unitId: string; period: PeriodFilter }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Clientes & Vendedores — em breve</div>
}
```

Create `src/pages/app/franqueados/relatorios/TabEquipeCustos.tsx`:
```typescript
import { type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
export function TabEquipeCustos(_: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Equipe & Custos — em breve</div>
}
```

Create `src/pages/app/franqueados/relatorios/TabFinanceiro.tsx`:
```typescript
import { type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
export function TabFinanceiro(_: { unitId: string; period: PeriodFilter; months: MonthRef[] }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Financeiro — em breve</div>
}
```

- [ ] **Step 2: Create RelatoriosPage.tsx**

```typescript
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
```

- [ ] **Step 3: Update router — replace EmBreve with lazy RelatoriosPage**

In `src/router/index.tsx`, add after the `MateriaisPage` lazy imports:
```typescript
const RelatoriosPage = lazy(() => import('@/pages/app/franqueados/RelatoriosPage'))
```

Replace the route (under `/:unitSlug/:agentSlug` children):
```typescript
// Before:
{ path: 'relatorios', element: <EmBreve titulo="Relatórios" /> },
// After:
{ path: 'relatorios', element: <S><RelatoriosPage /></S> },
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/franqueados/RelatoriosPage.tsx src/pages/app/franqueados/relatorios/ src/router/index.tsx
git commit -m "feat: add RelatoriosPage shell with period filter, tab navigation and router entry"
```

---

### Task 5: TabVisaoGeral — KPIs + bar chart + mini rankings

**Files:**
- Modify: `src/pages/app/franqueados/relatorios/TabVisaoGeral.tsx`

- [ ] **Step 1: Implement**

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/relatorios/TabVisaoGeral.tsx
git commit -m "feat: implement TabVisaoGeral with KPIs, weekly bar chart and top rankings"
```

---

### Task 6: TabECUArquivos — service breakdown + status funnel + job list

**Files:**
- Modify: `src/pages/app/franqueados/relatorios/TabECUArquivos.tsx`

- [ ] **Step 1: Implement**

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/relatorios/TabECUArquivos.tsx
git commit -m "feat: implement TabECUArquivos with service breakdown, status funnel and paginated job list"
```

---

### Task 7: TabClientesVendedores — top customers + sellers

**Files:**
- Modify: `src/pages/app/franqueados/relatorios/TabClientesVendedores.tsx`

- [ ] **Step 1: Implement**

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/relatorios/TabClientesVendedores.tsx
git commit -m "feat: implement TabClientesVendedores with ranked clients and seller commissions"
```

---

### Task 8: TabEquipeCustos — employee management + cost summary

**Files:**
- Modify: `src/pages/app/franqueados/relatorios/TabEquipeCustos.tsx`

- [ ] **Step 1: Implement**

```typescript
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
    const salaries  = empCosts.reduce((s, c) => s + c.base_salary + (c.benefits as EmployeeBenefit[]).reduce((b, x) => b + x.amount, 0), 0)
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
                const total = cost ? cost.base_salary + (cost.benefits as EmployeeBenefit[]).reduce((s, b) => s + b.amount, 0) : null
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/relatorios/TabEquipeCustos.tsx
git commit -m "feat: implement TabEquipeCustos with employee management and cost summary"
```

---

### Task 9: TabFinanceiro — revenue vs costs + pie chart + royalty

**Files:**
- Modify: `src/pages/app/franqueados/relatorios/TabFinanceiro.tsx`

- [ ] **Step 1: Implement**

```typescript
import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useEcuJobsReport, useOrdersReport, useFinancialEntriesReport, useCommissionsReport, useUnitRoyalty, fmt, pct, type PeriodFilter, type MonthRef } from '@/hooks/useRelatorios'
import { useUnitEmployeeCostsForUnit, type EmployeeBenefit } from '@/hooks/useUnitEmployees'

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
    const empCost  = empCosts.reduce((s, c) => s + c.base_salary + (c.benefits as EmployeeBenefit[]).reduce((b, x) => b + x.amount, 0), 0)
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
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {totals.breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/relatorios/TabFinanceiro.tsx
git commit -m "feat: implement TabFinanceiro with revenue, costs breakdown, saldo and pie chart"
```
