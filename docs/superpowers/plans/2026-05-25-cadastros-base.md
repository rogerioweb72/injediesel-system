# Cadastros Base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cadastros" section to both matrix and franchise apps with CRUD for Fornecedores, Formas de Pagamento, Serviços, and Categorias.

**Architecture:** Three new Supabase tables (fornecedores, formas_pagamento, servicos) with nullable unit_id (null = matrix, uuid = franchise). A single `CadastrosPage` with 4 tabs shared between matrix and franchise routes — detects context via `useMyUnit()`. RLS: matrix (`is_matrix_admin()`) reads/writes ALL rows for audit purposes; franchise reads/writes only their own unit_id rows.

**Tech Stack:** React 19, TypeScript, TanStack Query 5, Supabase (`const sb = () => supabase as any` pattern), Tailwind CSS, shadcn/ui (Button, Input, Label, Dialog, Skeleton).

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/047_cadastros_base.sql` | Create |
| `src/hooks/useFornecedores.ts` | Create |
| `src/hooks/useFormasPagamento.ts` | Create |
| `src/hooks/useServicos.ts` | Create |
| `src/hooks/useFinancial.ts` | Modify — add subtipo to FinancialCategory + add useUpsertFinancialCategory |
| `src/pages/app/cadastros/CadastrosPage.tsx` | Create |
| `src/pages/app/cadastros/tabs/TabFornecedores.tsx` | Create |
| `src/pages/app/cadastros/tabs/TabFormasPagamento.tsx` | Create |
| `src/pages/app/cadastros/tabs/TabServicos.tsx` | Create |
| `src/pages/app/cadastros/tabs/TabCategorias.tsx` | Create |
| `src/router/index.tsx` | Modify — add cadastros routes |
| `src/components/layout/Sidebar.tsx` | Modify — add Cadastros NavItem |
| `src/components/layout/FranqueadoSidebar.tsx` | Modify — add Cadastros NavItem |

---

### Task 1: Migration 047 — fornecedores, formas_pagamento, servicos, subtipo

**Files:**
- Create: `supabase/migrations/047_cadastros_base.sql`

- [ ] **Step 1: Create migration**

```sql
-- 047_cadastros_base.sql
-- Cadastros base: fornecedores, formas de pagamento, serviços
-- unit_id NULL = matriz; unit_id = UUID = franquia específica
-- Matriz tem acesso a TODOS os registros (auditoria e supervisão)

create table if not exists fornecedores (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid references franchise_units(id) on delete cascade,
  name              text not null,
  document          text,
  contact           text,
  payment_term_days int not null default 30,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists fornecedores_unit_idx    on fornecedores (unit_id);
create index if not exists fornecedores_active_idx  on fornecedores (unit_id, active);

create table if not exists formas_pagamento (
  id               uuid primary key default gen_random_uuid(),
  unit_id          uuid references franchise_units(id) on delete cascade,
  name             text not null,
  fee_percentage   numeric(5,2) not null default 0,
  receipt_days     int not null default 0,
  max_installments int not null default 1,
  active           boolean not null default true
);

create index if not exists formas_pagamento_unit_idx on formas_pagamento (unit_id);

create table if not exists servicos (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid references franchise_units(id) on delete cascade,
  name          text not null,
  description   text,
  default_price numeric(12,2),
  estimated_min int,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists servicos_unit_idx   on servicos (unit_id);
create index if not exists servicos_active_idx on servicos (unit_id, active);

-- Adiciona subtipo em categorias financeiras existentes
alter table financial_categories
  add column if not exists subtipo text check (subtipo in ('fixa', 'variavel'));

-- ── RLS: fornecedores ─────────────────────────────────────────────────────────
alter table fornecedores enable row level security;

create policy "fornecedores_select" on fornecedores
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "fornecedores_insert" on fornecedores
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "fornecedores_update" on fornecedores
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- ── RLS: formas_pagamento ─────────────────────────────────────────────────────
alter table formas_pagamento enable row level security;

create policy "formas_pagamento_select" on formas_pagamento
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "formas_pagamento_insert" on formas_pagamento
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "formas_pagamento_update" on formas_pagamento
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- ── RLS: servicos ─────────────────────────────────────────────────────────────
alter table servicos enable row level security;

create policy "servicos_select" on servicos
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "servicos_insert" on servicos
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "servicos_update" on servicos
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/047_cadastros_base.sql
git commit -m "feat: add fornecedores, formas_pagamento, servicos tables with RLS and subtipo to categories"
```

---

### Task 2: Hook useFornecedores

**Files:**
- Create: `src/hooks/useFornecedores.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface Fornecedor {
  id: string
  unit_id: string | null
  name: string
  document: string | null
  contact: string | null
  payment_term_days: number
  notes: string | null
  active: boolean
  created_at: string
}

// unitId: undefined = still loading; null = matrix; string = franchise
export function useFornecedores(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['fornecedores', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('fornecedores').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as Fornecedor[]
    },
  })
}

export function useUpsertFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      document: string | null
      contact: string | null
      payment_term_days: number
      notes: string | null
    }) => {
      const { data, error } = await sb()
        .from('fornecedores')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Fornecedor
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fornecedores', vars.unit_id] })
    },
  })
}

export function useDeactivateFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Fornecedor) => {
      const { error } = await sb().from('fornecedores').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['fornecedores', item.unit_id] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFornecedores.ts
git commit -m "feat: add useFornecedores hook"
```

---

### Task 3: Hook useFormasPagamento

**Files:**
- Create: `src/hooks/useFormasPagamento.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface FormaPagamento {
  id: string
  unit_id: string | null
  name: string
  fee_percentage: number
  receipt_days: number
  max_installments: number
  active: boolean
}

export function useFormasPagamento(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['formas-pagamento', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('formas_pagamento').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as FormaPagamento[]
    },
  })
}

export function useUpsertFormaPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      fee_percentage: number
      receipt_days: number
      max_installments: number
    }) => {
      const { data, error } = await sb()
        .from('formas_pagamento')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as FormaPagamento
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento', vars.unit_id] })
    },
  })
}

export function useDeactivateFormaPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: FormaPagamento) => {
      const { error } = await sb().from('formas_pagamento').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['formas-pagamento', item.unit_id] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFormasPagamento.ts
git commit -m "feat: add useFormasPagamento hook"
```

---

### Task 4: Hook useServicos

**Files:**
- Create: `src/hooks/useServicos.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface Servico {
  id: string
  unit_id: string | null
  name: string
  description: string | null
  default_price: number | null
  estimated_min: number | null
  active: boolean
  created_at: string
}

export function useServicos(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['servicos', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      const base = sb().from('servicos').select('*').eq('active', true).order('name')
      const { data, error } = await (unitId === null ? base.is('unit_id', null) : base.eq('unit_id', unitId))
      if (error) throw error
      return (data ?? []) as Servico[]
    },
  })
}

export function useUpsertServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      unit_id: string | null
      name: string
      description: string | null
      default_price: number | null
      estimated_min: number | null
    }) => {
      const { data, error } = await sb()
        .from('servicos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Servico
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['servicos', vars.unit_id] })
    },
  })
}

export function useDeactivateServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Servico) => {
      const { error } = await sb().from('servicos').update({ active: false }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ['servicos', item.unit_id] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useServicos.ts
git commit -m "feat: add useServicos hook"
```

---

### Task 5: Extend useFinancial — subtipo + upsert category

**Files:**
- Modify: `src/hooks/useFinancial.ts`

- [ ] **Step 1: Update FinancialCategory interface and add useUpsertFinancialCategory**

In `src/hooks/useFinancial.ts`, replace:

```typescript
export interface FinancialCategory {
  id: string
  name: string
  type: 'receita' | 'despesa'
}
```

With:

```typescript
export interface FinancialCategory {
  id: string
  name: string
  type: 'receita' | 'despesa'
  subtipo: 'fixa' | 'variavel' | null
}
```

Then add this function after `useFinancialCategories`:

```typescript
export function useUpsertFinancialCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      name: string
      type: 'receita' | 'despesa'
      subtipo: 'fixa' | 'variavel' | null
    }) => {
      const { data, error } = await sb()
        .from('financial_categories')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as FinancialCategory
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-categories'] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFinancial.ts
git commit -m "feat: add subtipo to FinancialCategory and useUpsertFinancialCategory"
```

---

### Task 6: CadastrosPage shell + stub tabs + router + sidebar

**Files:**
- Create: `src/pages/app/cadastros/CadastrosPage.tsx`
- Create: `src/pages/app/cadastros/tabs/TabFornecedores.tsx` (stub)
- Create: `src/pages/app/cadastros/tabs/TabFormasPagamento.tsx` (stub)
- Create: `src/pages/app/cadastros/tabs/TabServicos.tsx` (stub)
- Create: `src/pages/app/cadastros/tabs/TabCategorias.tsx` (stub)
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/FranqueadoSidebar.tsx`

- [ ] **Step 1: Create stub tabs**

`src/pages/app/cadastros/tabs/TabFornecedores.tsx`:
```typescript
export function TabFornecedores({ unitId }: { unitId: string | null | undefined }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Fornecedores — em breve</div>
}
```

`src/pages/app/cadastros/tabs/TabFormasPagamento.tsx`:
```typescript
export function TabFormasPagamento({ unitId }: { unitId: string | null | undefined }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Formas de Pagamento — em breve</div>
}
```

`src/pages/app/cadastros/tabs/TabServicos.tsx`:
```typescript
export function TabServicos({ unitId }: { unitId: string | null | undefined }) {
  return <div className="py-8 text-center text-sm text-zinc-500">Serviços — em breve</div>
}
```

`src/pages/app/cadastros/tabs/TabCategorias.tsx`:
```typescript
export function TabCategorias() {
  return <div className="py-8 text-center text-sm text-zinc-500">Categorias — em breve</div>
}
```

- [ ] **Step 2: Create CadastrosPage.tsx**

```typescript
import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useMyUnit } from '@/hooks/useMyUnit'
import { TabFornecedores } from './tabs/TabFornecedores'
import { TabFormasPagamento } from './tabs/TabFormasPagamento'
import { TabServicos } from './tabs/TabServicos'
import { TabCategorias } from './tabs/TabCategorias'

type TabId = 'fornecedores' | 'formas-pagamento' | 'servicos' | 'categorias'

const TABS: { id: TabId; label: string }[] = [
  { id: 'fornecedores',     label: 'Fornecedores' },
  { id: 'formas-pagamento', label: 'Formas de Pagamento' },
  { id: 'servicos',         label: 'Serviços' },
  { id: 'categorias',       label: 'Categorias' },
]

export default function CadastrosPage() {
  const { data: myUnit, isLoading } = useMyUnit()
  const [activeTab, setActiveTab] = useState<TabId>('fornecedores')

  // undefined = loading, null = matrix, string = franchise
  const unitId: string | null | undefined = isLoading ? undefined : (myUnit?.unit_id ?? null)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-red-400" />
        <h1 className="text-xl font-bold text-white">Cadastros</h1>
      </div>

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

      {activeTab === 'fornecedores'     && <TabFornecedores    unitId={unitId} />}
      {activeTab === 'formas-pagamento' && <TabFormasPagamento unitId={unitId} />}
      {activeTab === 'servicos'         && <TabServicos        unitId={unitId} />}
      {activeTab === 'categorias'       && <TabCategorias />}
    </div>
  )
}
```

- [ ] **Step 3: Update router**

In `src/router/index.tsx`, add lazy import after existing lazy imports:

```typescript
const CadastrosPage = lazy(() => import('@/pages/app/cadastros/CadastrosPage'))
```

Add to `/:agentSlug` children (matrix routes), after `financeiro`:
```typescript
{ path: 'cadastros', element: <S><CadastrosPage /></S> },
```

Add to `/:unitSlug/:agentSlug` children (franchise routes), after `relatorios`:
```typescript
{ path: 'cadastros', element: <S><CadastrosPage /></S> },
```

- [ ] **Step 4: Update Sidebar.tsx (matrix)**

In `src/components/layout/Sidebar.tsx`, add `BookOpen` to the lucide import:
```typescript
import {
  LayoutDashboard, Files, Users, Building2,
  ShoppingCart, Package, ShoppingBag,
  BarChart3, Headphones, Settings,
  Database, ClipboardList, Megaphone, HelpCircle, BookOpen,
} from 'lucide-react'
```

Add NavItem inside the "Gestão" section, after the `financeiro` NavItem:
```typescript
<NavItem to={`${prefix}/cadastros`} icon={BookOpen} label="Cadastros" collapsed={collapsed} />
```

- [ ] **Step 5: Update FranqueadoSidebar.tsx (franchise)**

In `src/components/layout/FranqueadoSidebar.tsx`, add `BookOpen` to the lucide import:
```typescript
import {
  LayoutDashboard, Upload, Files, ShoppingBag, ShoppingCart,
  ClipboardList, Users, BarChart3, Headphones,
  Megaphone, User, Database, HelpCircle, BookOpen,
} from 'lucide-react'
```

Add NavItem inside the "Gestão" section, after the `relatorios` NavItem:
```typescript
<NavItem to={`${prefix}/cadastros`} icon={BookOpen} label="Cadastros" collapsed={collapsed} />
```

- [ ] **Step 6: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/pages/app/cadastros/ src/router/index.tsx src/components/layout/Sidebar.tsx src/components/layout/FranqueadoSidebar.tsx
git commit -m "feat: add CadastrosPage shell with tabs, router routes and sidebar nav items"
```

---

### Task 7: TabFornecedores — full implementation

**Files:**
- Modify: `src/pages/app/cadastros/tabs/TabFornecedores.tsx`

- [ ] **Step 1: Implement**

```typescript
import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useFornecedores, useUpsertFornecedor, useDeactivateFornecedor, type Fornecedor } from '@/hooks/useFornecedores'

function FornecedorModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: Fornecedor | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFornecedor()
  const [name, setName] = useState(item?.name ?? '')
  const [document, setDocument] = useState(item?.document ?? '')
  const [contact, setContact] = useState(item?.contact ?? '')
  const [term, setTerm] = useState(String(item?.payment_term_days ?? 30))
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        document: document.trim() || null,
        contact: contact.trim() || null,
        payment_term_days: Number(term) || 30,
        notes: notes.trim() || null,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do fornecedor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ / CPF</Label>
              <Input value={document} onChange={e => setDocument(e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo padrão (dias)</Label>
              <Input type="number" min="0" value={term} onChange={e => setTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contato</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Telefone ou e-mail" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais" />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabFornecedores({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useFornecedores(unitId)
  const deactivate = useDeactivateFornecedor()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Fornecedor | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fornecedores ({items.length})</p>
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhum fornecedor cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Documento','Contato','Prazo',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.document ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.contact ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.payment_term_days}d</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400" disabled={deactivate.isPending} onClick={() => deactivate.mutate(item)}>
                        <PowerOff className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FornecedorModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/cadastros/tabs/TabFornecedores.tsx
git commit -m "feat: implement TabFornecedores with list and create/edit/deactivate modal"
```

---

### Task 8: TabFormasPagamento — full implementation

**Files:**
- Modify: `src/pages/app/cadastros/tabs/TabFormasPagamento.tsx`

- [ ] **Step 1: Implement**

```typescript
import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useFormasPagamento, useUpsertFormaPagamento, useDeactivateFormaPagamento, type FormaPagamento } from '@/hooks/useFormasPagamento'

function FormaPagamentoModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: FormaPagamento | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFormaPagamento()
  const [name, setName] = useState(item?.name ?? '')
  const [fee, setFee] = useState(String(item?.fee_percentage ?? 0))
  const [days, setDays] = useState(String(item?.receipt_days ?? 0))
  const [parcelas, setParcelas] = useState(String(item?.max_installments ?? 1))
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        fee_percentage: Number(fee) || 0,
        receipt_days: Number(days) || 0,
        max_installments: Number(parcelas) || 1,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: PIX, Cartão Crédito 2x" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Taxa (%)</Label>
              <Input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Recebimento (D+)</Label>
              <Input type="number" min="0" value={days} onChange={e => setDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas máx</Label>
              <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} />
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabFormasPagamento({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useFormasPagamento(unitId)
  const deactivate = useDeactivateFormaPagamento()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FormaPagamento | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Formas de Pagamento ({items.length})</p>
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Nova
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhuma forma de pagamento cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Taxa','Recebimento','Parcelas',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.fee_percentage > 0 ? `${item.fee_percentage}%` : '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">D+{item.receipt_days}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.max_installments}x</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400" disabled={deactivate.isPending} onClick={() => deactivate.mutate(item)}>
                        <PowerOff className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormaPagamentoModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/cadastros/tabs/TabFormasPagamento.tsx
git commit -m "feat: implement TabFormasPagamento with list and create/edit/deactivate modal"
```

---

### Task 9: TabServicos — full implementation

**Files:**
- Modify: `src/pages/app/cadastros/tabs/TabServicos.tsx`

- [ ] **Step 1: Implement**

```typescript
import { useState } from 'react'
import { Plus, Edit2, PowerOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useServicos, useUpsertServico, useDeactivateServico, type Servico } from '@/hooks/useServicos'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ServicoModal({ unitId, item, open, onOpenChange }: {
  unitId: string | null
  item: Servico | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertServico()
  const [name, setName] = useState(item?.name ?? '')
  const [desc, setDesc] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item?.default_price != null ? String(item.default_price) : '')
  const [mins, setMins] = useState(item?.estimated_min != null ? String(item.estimated_min) : '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        unit_id: unitId,
        name: name.trim(),
        description: desc.trim() || null,
        default_price: price ? Number(price) : null,
        estimated_min: mins ? Number(mins) : null,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Alinhamento, Diagnóstico" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição do serviço" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço padrão (R$)</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Tempo est. (min)</Label>
              <Input type="number" min="0" value={mins} onChange={e => setMins(e.target.value)} placeholder="60" />
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabServicos({ unitId }: { unitId: string | null | undefined }) {
  const { data: items = [], isLoading } = useServicos(unitId)
  const deactivate = useDeactivateServico()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Servico | null>(null)

  if (unitId === undefined || isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Serviços ({items.length})</p>
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 text-center">Nenhum serviço cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Nome','Preço','Tempo',''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-2">
                    <p className="font-medium text-white">{item.name}</p>
                    {item.description && <p className="text-xs text-zinc-500">{item.description}</p>}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{item.default_price != null ? fmtBRL(item.default_price) : '—'}</td>
                  <td className="px-4 py-2 text-zinc-400">{item.estimated_min != null ? `${item.estimated_min} min` : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400" disabled={deactivate.isPending} onClick={() => deactivate.mutate(item)}>
                        <PowerOff className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServicoModal key={editing?.id ?? 'new'} unitId={unitId ?? null} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/cadastros/tabs/TabServicos.tsx
git commit -m "feat: implement TabServicos with list and create/edit/deactivate modal"
```

---

### Task 10: TabCategorias — full implementation

**Files:**
- Modify: `src/pages/app/cadastros/tabs/TabCategorias.tsx`

- [ ] **Step 1: Implement**

Categorias são globais (não por unidade) — sem unit_id. Permite criar e editar; sem desativação (evita quebrar financial_entries já lançados).

```typescript
import { useState } from 'react'
import { Plus, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinancialCategories, useUpsertFinancialCategory, type FinancialCategory } from '@/hooks/useFinancial'

function CategoriaModal({ item, open, onOpenChange }: {
  item: FinancialCategory | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertFinancialCategory()
  const [name, setName] = useState(item?.name ?? '')
  const [type, setType] = useState<'receita' | 'despesa'>(item?.type ?? 'despesa')
  const [subtipo, setSubtipo] = useState<'fixa' | 'variavel' | ''>(item?.subtipo ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        name: name.trim(),
        type,
        subtipo: subtipo || null,
      })
      onOpenChange(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao salvar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel, Energia, Vendas ECU" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'receita' | 'despesa')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subtipo</Label>
              <Select value={subtipo || 'none'} onValueChange={(v) => setSubtipo(v === 'none' ? '' : v as 'fixa' | 'variavel')}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || upsert.isPending} onClick={save}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TabCategorias() {
  const { data: items = [], isLoading } = useFinancialCategories()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialCategory | null>(null)

  if (isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
  )

  const receitas = items.filter(c => c.type === 'receita')
  const despesas = items.filter(c => c.type === 'despesa')

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="h-7 bg-red-600 hover:bg-red-700 text-xs" onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="mr-1 h-3 w-3" />Nova Categoria
        </Button>
      </div>

      {[{ label: 'Receita', list: receitas }, { label: 'Despesa', list: despesas }].map(({ label, list }) => (
        <div key={label} className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-700">
            {label} ({list.length})
          </p>
          {list.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {list.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{item.name}</span>
                    {item.subtipo && (
                      <Badge variant="outline" className="text-xs text-zinc-400">
                        {item.subtipo === 'fixa' ? 'Fixa' : 'Variável'}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => { setEditing(item); setOpen(true) }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <CategoriaModal key={editing?.id ?? 'new'} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Push migration and commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner" && supabase db push
```

```bash
git add src/pages/app/cadastros/tabs/TabCategorias.tsx
git commit -m "feat: implement TabCategorias with grouped list and create/edit modal"
```
