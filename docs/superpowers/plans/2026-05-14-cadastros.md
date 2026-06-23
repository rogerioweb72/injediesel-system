# Cadastros (Fase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three fully functional CRUD modules — Clientes + Veículos, Produtos (3-tier pricing), and Franqueados — wiring them into the existing router and TopBar.

**Architecture:** Each module owns a dedicated hook file (TanStack Query v5), page components under `src/pages/app/`, and reuses a shared DataTable + ConfirmDialog. Supabase access always uses `(supabase as any)` cast because `database.ts` is a placeholder stub. RLS enforces price tier isolation server-side.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS v3, shadcn/ui (Dialog, Sheet, Select, Form), TanStack Query v5, react-hook-form v7 + zod v4, Vitest + Testing Library, BrasilAPI (plate lookup), Zustand auth store.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/shared/DataTable.tsx` | Presentational table: columns, search, pagination, loading skeleton |
| `src/components/shared/ConfirmDialog.tsx` | Delete-confirm dialog built on shadcn Dialog |
| `src/components/shared/PriceTierBadge.tsx` | Coloured badge for `PriceTier` values |
| `src/hooks/useCustomers.ts` | CRUD + list query for `customers` table |
| `src/hooks/useVehicles.ts` | CRUD + list query for `vehicles` table |
| `src/hooks/useBrasilAPI.ts` | Plate lookup via BrasilAPI |
| `src/hooks/useProducts.ts` | CRUD + list query for `products` + `product_prices` |
| `src/hooks/useFranchiseUnits.ts` | CRUD + list query for `franchise_units` table |
| `src/pages/app/clientes/CustomersPage.tsx` | List with DataTable + search + navigate-to-form |
| `src/pages/app/clientes/CustomerForm.tsx` | Full-page create/edit (react-hook-form) |
| `src/pages/app/clientes/CustomerDetail.tsx` | Customer info + vehicles list + VehicleForm sheet |
| `src/pages/app/clientes/VehicleForm.tsx` | Sheet for add/edit vehicle (PlateLookup inside) |
| `src/pages/app/produtos/ProductsPage.tsx` | List with DataTable + category filter |
| `src/pages/app/produtos/ProductForm.tsx` | Full-page create/edit with 3-tier price inputs |
| `src/pages/app/produtos/ProductDetail.tsx` | Product info + all three price tiers |
| `src/pages/app/franqueados/FranchiseesPage.tsx` | List + "Nova Unidade" Sheet |
| `src/pages/app/franqueados/FranchiseeForm.tsx` | Sheet form for create/edit franchise unit |
| `src/pages/app/franqueados/FranchiseeDetail.tsx` | Unit info + edit Sheet + delete |
| `src/tests/hooks/useCustomers.test.ts` | Unit tests for useCustomers mutations and queries |
| `src/tests/hooks/useBrasilAPI.test.ts` | Unit tests for plate lookup |
| `src/tests/components/PriceTierBadge.test.tsx` | Render tests for badge labels |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/router/index.tsx` | Add 10 new routes under `/matriz` |
| `src/components/layout/TopBar.tsx` | Replace static map with function to handle `:id` dynamic routes |

---

### Task 1: Shared Components — DataTable, ConfirmDialog, PriceTierBadge

**Files:**
- Create: `src/components/shared/DataTable.tsx`
- Create: `src/components/shared/ConfirmDialog.tsx`
- Create: `src/components/shared/PriceTierBadge.tsx`
- Create: `src/tests/components/PriceTierBadge.test.tsx`

- [ ] **Step 1: Write failing test for PriceTierBadge**

```ts
// src/tests/components/PriceTierBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'

describe('PriceTierBadge', () => {
  it('renders "Cliente Final" for cliente_final', () => {
    render(<PriceTierBadge tier="cliente_final" />)
    expect(screen.getByText('Cliente Final')).toBeInTheDocument()
  })

  it('renders "Linha Leve" for franqueado_linha_leve', () => {
    render(<PriceTierBadge tier="franqueado_linha_leve" />)
    expect(screen.getByText('Linha Leve')).toBeInTheDocument()
  })

  it('renders "Full" for franqueado_full', () => {
    render(<PriceTierBadge tier="franqueado_full" />)
    expect(screen.getByText('Full')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/components/PriceTierBadge.test.tsx`
Expected: FAIL — `Cannot find module '@/components/shared/PriceTierBadge'`

- [ ] **Step 3: Create PriceTierBadge**

```tsx
// src/components/shared/PriceTierBadge.tsx
import type { PriceTier } from '@/types/app'

const TIER_LABELS: Record<PriceTier, string> = {
  cliente_final: 'Cliente Final',
  franqueado_linha_leve: 'Linha Leve',
  franqueado_full: 'Full',
}

const TIER_COLORS: Record<PriceTier, string> = {
  cliente_final: 'bg-slate-700 text-slate-200',
  franqueado_linha_leve: 'bg-blue-900 text-blue-200',
  franqueado_full: 'bg-red-900 text-red-200',
}

export function PriceTierBadge({ tier }: { tier: PriceTier }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/components/PriceTierBadge.test.tsx`
Expected: PASS — 3 tests passing

- [ ] **Step 5: Create DataTable**

```tsx
// src/components/shared/DataTable.tsx
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSearch?: (q: string) => void
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T extends { id: string }>({
  columns, data, isLoading, total, page, pageSize,
  onPageChange, onSearch, searchPlaceholder = 'Buscar...',
  onRowClick, emptyTitle = 'Nenhum registro', emptyDescription = 'Nenhum item encontrado.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const totalPages = Math.ceil(total / pageSize)

  function handleSearch(value: string) {
    setSearch(value)
    onSearch?.(value)
  }

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      )}

      <div className="pm-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <p className="font-medium text-foreground">{emptyTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-[hsl(var(--pm-gray-800))]' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} registros</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="icon"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>Página {page + 1} de {totalPages}</span>
            <Button
              variant="ghost" size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create ConfirmDialog**

```tsx
// src/components/shared/ConfirmDialog.tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  isLoading?: boolean
  confirmLabel?: string
}

export function ConfirmDialog({
  open, onOpenChange, title, description, onConfirm, isLoading, confirmLabel = 'Confirmar',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/DataTable.tsx src/components/shared/ConfirmDialog.tsx \
        src/components/shared/PriceTierBadge.tsx src/tests/components/PriceTierBadge.test.tsx
git commit -m "feat: add DataTable, ConfirmDialog, PriceTierBadge shared components"
```

---

### Task 2: useCustomers Hook

**Files:**
- Create: `src/hooks/useCustomers.ts`
- Create: `src/tests/hooks/useCustomers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/tests/hooks/useCustomers.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'

vi.mock('@/lib/supabase', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Test' }, error: null }),
  }
  chain.select.mockReturnValue({ ...chain, then: undefined, data: [{ id: 'c1', name: 'Test' }], error: null, count: 1 })
  return { supabase: { from: vi.fn().mockReturnValue(chain) } }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ id: 'user-1' })),
}))

vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCustomers', () => {
  it('returns customers data', async () => {
    const { result } = renderHook(() => useCustomers(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toBeDefined()
  })
})

describe('useCreateCustomer', () => {
  it('exposes mutate function', () => {
    const { result } = renderHook(() => useCreateCustomer(), { wrapper })
    expect(typeof result.current.mutate).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/hooks/useCustomers.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useCustomers'`

- [ ] **Step 3: Create useCustomers**

```ts
// src/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { PriceTier } from '@/types/app'

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  active: boolean
  price_tier: PriceTier
  franchise_unit_id: string | null
  created_at: string
}

interface ListFilter {
  q?: string
  page?: number
  pageSize?: number
}

export function useCustomers({ q = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['customers', q, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('customers')
        .select('*', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Customer[], total: (count as number) ?? 0 }
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').select('*').eq('id', id).single()
      if (error) throw error
      return data as Customer
    },
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: Omit<Customer, 'id' | 'created_at'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').insert(payload).select().single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      log({ entity: 'customer', entityId: c.id, action: 'created' })
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Customer> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('customers').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', c.id] })
      log({ entity: 'customer', entityId: c.id, action: 'updated' })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('customers').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      log({ entity: 'customer', entityId: id, action: 'deleted' })
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/hooks/useCustomers.test.ts`
Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCustomers.ts src/tests/hooks/useCustomers.test.ts
git commit -m "feat: add useCustomers hook with CRUD mutations"
```

---

### Task 3: CustomersPage

**Files:**
- Create: `src/pages/app/clientes/CustomersPage.tsx`

- [ ] **Step 1: Create CustomersPage**

```tsx
// src/pages/app/clientes/CustomersPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { useCustomers, type Customer } from '@/hooks/useCustomers'

const COLUMNS: Column<Customer>[] = [
  { key: 'name', header: 'Nome' },
  { key: 'email', header: 'E-mail', cell: (r) => r.email ?? '—' },
  { key: 'phone', header: 'Telefone', cell: (r) => r.phone ?? '—' },
  { key: 'document', header: 'CPF/CNPJ', cell: (r) => r.document ?? '—' },
  {
    key: 'price_tier', header: 'Tier',
    cell: (r) => <PriceTierBadge tier={r.price_tier} />,
  },
  {
    key: 'active', header: 'Status',
    cell: (r) => (
      <span className={`text-xs font-medium ${r.active ? 'text-green-400' : 'text-muted-foreground'}`}>
        {r.active ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
]

export default function CustomersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data, isLoading } = useCustomers({ q, page, pageSize: PAGE_SIZE })

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes cadastrados"
        actions={
          <Button
            onClick={() => navigate('/matriz/clientes/novo')}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            <UserPlus size={16} className="mr-2" />
            Novo Cliente
          </Button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchPlaceholder="Buscar por nome..."
        onRowClick={(r) => navigate(`/matriz/clientes/${r.id}`)}
        emptyTitle="Nenhum cliente"
        emptyDescription="Clique em Novo Cliente para adicionar o primeiro."
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/clientes/CustomersPage.tsx
git commit -m "feat: add CustomersPage list with search and pagination"
```

---

### Task 4: CustomerForm

**Files:**
- Create: `src/pages/app/clientes/CustomerForm.tsx`

- [ ] **Step 1: Create CustomerForm**

```tsx
// src/pages/app/clientes/CustomerForm.tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  useCustomer, useCreateCustomer, useUpdateCustomer,
} from '@/hooks/useCustomers'

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').or(z.literal('').transform(() => null)).nullable(),
  phone: z.string().nullable(),
  document: z.string().nullable(),
  price_tier: z.enum(['cliente_final', 'franqueado_linha_leve', 'franqueado_full']),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id ?? '')
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: null,
      phone: null,
      document: null,
      price_tier: 'cliente_final',
      active: true,
    },
  })

  useEffect(() => {
    if (customer) {
      setValue('name', customer.name)
      setValue('email', customer.email)
      setValue('phone', customer.phone)
      setValue('document', customer.document)
      setValue('price_tier', customer.price_tier)
      setValue('active', customer.active)
    }
  }, [customer, setValue])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      email: values.email ?? null,
      phone: values.phone ?? null,
      document: values.document ?? null,
      price_tier: values.price_tier,
      franchise_unit_id: null,
      active: values.active,
    }

    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    navigate('/matriz/clientes')
  }

  if (isEdit && loadingCustomer) {
    return <div className="pm-skeleton h-64 w-full rounded" />
  }

  const priceTier = watch('price_tier')

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle={isEdit ? `Editando ${customer?.name ?? ''}` : 'Preencha os dados do cliente'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/matriz/clientes')}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="pm-card max-w-2xl space-y-5">
        <div className="space-y-1">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="document">CPF / CNPJ</Label>
          <Input id="document" {...register('document')} placeholder="000.000.000-00" />
        </div>

        <div className="space-y-1">
          <Label>Tier de Preço</Label>
          <Select
            value={priceTier}
            onValueChange={(v) => setValue('price_tier', v as FormValues['price_tier'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cliente_final">Cliente Final</SelectItem>
              <SelectItem value="franqueado_linha_leve">Franqueado — Linha Leve</SelectItem>
              <SelectItem value="franqueado_full">Franqueado — Full</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            {...register('active')}
            className="h-4 w-4 rounded border-gray-600"
          />
          <Label htmlFor="active">Cliente ativo</Label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/matriz/clientes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/clientes/CustomerForm.tsx
git commit -m "feat: add CustomerForm with react-hook-form + zod validation"
```

---

### Task 5: useBrasilAPI + PlateLookup Component

**Files:**
- Create: `src/hooks/useBrasilAPI.ts`
- Create: `src/pages/app/clientes/PlateLookup.tsx`
- Create: `src/tests/hooks/useBrasilAPI.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/tests/hooks/useBrasilAPI.test.ts
import { renderHook } from '@testing-library/react'
import { useBrasilAPI } from '@/hooks/useBrasilAPI'

describe('useBrasilAPI', () => {
  it('returns null when API responds with error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    const { result } = renderHook(() => useBrasilAPI())
    const data = await result.current.lookupPlate('ABC1234')
    expect(data).toBeNull()
  })

  it('returns vehicle data when API succeeds', async () => {
    const mockVehicle = { tipo: 'automóvel', marca: 'VW', modelo: 'Golf', anoModelo: 2020 }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVehicle),
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useBrasilAPI())
    const data = await result.current.lookupPlate('ABC1234')
    expect(data).toEqual(mockVehicle)
  })

  it('strips non-alphanumeric chars and uppercases plate', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    const { result } = renderHook(() => useBrasilAPI())
    await result.current.lookupPlate('abc-1234')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('ABC1234'),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/hooks/useBrasilAPI.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useBrasilAPI'`

- [ ] **Step 3: Create useBrasilAPI**

```ts
// src/hooks/useBrasilAPI.ts
export interface VehicleInfo {
  tipo: string
  marca: string
  modelo: string
  anoModelo: number
}

export function useBrasilAPI() {
  async function lookupPlate(plate: string): Promise<VehicleInfo | null> {
    const clean = plate.replace(/\W/g, '').toUpperCase()
    try {
      const res = await fetch(`https://brasilapi.com.br/api/vehicles/v1/${clean}`)
      if (!res.ok) return null
      return (await res.json()) as VehicleInfo
    } catch {
      return null
    }
  }

  return { lookupPlate }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/hooks/useBrasilAPI.test.ts`
Expected: PASS — 3 tests passing

- [ ] **Step 5: Create PlateLookup component**

```tsx
// src/pages/app/clientes/PlateLookup.tsx
import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useBrasilAPI, type VehicleInfo } from '@/hooks/useBrasilAPI'

interface PlateLookupProps {
  value: string
  onChange: (plate: string) => void
  onFound: (info: VehicleInfo) => void
}

export function PlateLookup({ value, onChange, onFound }: PlateLookupProps) {
  const { lookupPlate } = useBrasilAPI()
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function handleLookup() {
    if (!value) return
    setLoading(true)
    setNotFound(false)
    const result = await lookupPlate(value)
    setLoading(false)
    if (result) {
      onFound(result)
    } else {
      setNotFound(true)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="ABC1234 ou BRA2E19"
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setNotFound(false) }}
          maxLength={8}
        />
        <Button type="button" variant="outline" onClick={handleLookup} disabled={loading || !value}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </Button>
      </div>
      {notFound && (
        <p className="text-xs text-amber-400">Placa não encontrada — preencha os campos manualmente.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useBrasilAPI.ts src/pages/app/clientes/PlateLookup.tsx \
        src/tests/hooks/useBrasilAPI.test.ts
git commit -m "feat: add useBrasilAPI hook and PlateLookup component"
```

---

### Task 6: useVehicles + VehicleForm (Sheet)

**Files:**
- Create: `src/hooks/useVehicles.ts`
- Create: `src/pages/app/clientes/VehicleForm.tsx`

- [ ] **Step 1: Create useVehicles**

```ts
// src/hooks/useVehicles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { VehicleType } from '@/types/app'

export interface Vehicle {
  id: string
  customer_id: string
  plate: string | null
  brand: string
  model: string
  year: number | null
  vehicle_type: VehicleType
  engine: string | null
  notes: string | null
  created_at: string
}

export function useVehicles(customerId: string) {
  return useQuery({
    queryKey: ['vehicles', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Vehicle[]
    },
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: Omit<Vehicle, 'id' | 'created_at'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles').insert(payload).select().single()
      if (error) throw error
      return data as Vehicle
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['vehicles', v.customer_id] })
      log({ entity: 'vehicle', entityId: v.id, action: 'created', metadata: { customerId: v.customer_id } })
    },
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('vehicles').delete().eq('id', id)
      if (error) throw error
      return { id, customerId }
    },
    onSuccess: ({ id, customerId }) => {
      qc.invalidateQueries({ queryKey: ['vehicles', customerId] })
      log({ entity: 'vehicle', entityId: id, action: 'deleted' })
    },
  })
}
```

- [ ] **Step 2: Create VehicleForm (Sheet)**

```tsx
// src/pages/app/clientes/VehicleForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PlateLookup } from './PlateLookup'
import { useCreateVehicle } from '@/hooks/useVehicles'
import type { VehicleInfo } from '@/hooks/useBrasilAPI'

const schema = z.object({
  plate: z.string().nullable(),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  year: z.coerce.number().int().min(1900).max(2100).nullable(),
  vehicle_type: z.enum(['automotivo', 'maquina_agricola', 'maquina_pesada', 'nautica']),
  engine: z.string().nullable(),
  notes: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  automotivo: 'Automotivo',
  maquina_agricola: 'Máquina Agrícola',
  maquina_pesada: 'Máquina Pesada',
  nautica: 'Náutica',
}

interface VehicleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

export function VehicleForm({ open, onOpenChange, customerId }: VehicleFormProps) {
  const createVehicle = useCreateVehicle()

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plate: null,
      brand: '',
      model: '',
      year: null,
      vehicle_type: 'automotivo',
      engine: null,
      notes: null,
    },
  })

  const plate = watch('plate')
  const vehicleType = watch('vehicle_type')

  function handlePlateLookupFound(info: VehicleInfo) {
    setValue('brand', info.marca)
    setValue('model', info.modelo)
    setValue('year', info.anoModelo)
  }

  async function onSubmit(values: FormValues) {
    await createVehicle.mutateAsync({
      customer_id: customerId,
      plate: values.plate ?? null,
      brand: values.brand,
      model: values.model,
      year: values.year ?? null,
      vehicle_type: values.vehicle_type,
      engine: values.engine ?? null,
      notes: values.notes ?? null,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adicionar Veículo</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label>Tipo de Veículo</Label>
            <Select
              value={vehicleType}
              onValueChange={(v) => setValue('vehicle_type', v as FormValues['vehicle_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vehicleType === 'automotivo' && (
            <div className="space-y-1">
              <Label>Placa (busca automática)</Label>
              <PlateLookup
                value={plate ?? ''}
                onChange={(v) => setValue('plate', v)}
                onFound={handlePlateLookupFound}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Marca *</Label>
              <Input {...register('brand')} />
              {errors.brand && <p className="text-xs text-red-400">{errors.brand.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Modelo *</Label>
              <Input {...register('model')} />
              {errors.model && <p className="text-xs text-red-400">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input type="number" {...register('year')} />
            </div>
            <div className="space-y-1">
              <Label>Motor</Label>
              <Input {...register('engine')} placeholder="2.0 TSI" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ background: 'hsl(var(--pm-red-500))' }}
            >
              {isSubmitting ? 'Salvando...' : 'Adicionar Veículo'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVehicles.ts src/pages/app/clientes/VehicleForm.tsx
git commit -m "feat: add useVehicles hook and VehicleForm sheet component"
```

---

### Task 7: CustomerDetail Page

**Files:**
- Create: `src/pages/app/clientes/CustomerDetail.tsx`

- [ ] **Step 1: Create CustomerDetail**

```tsx
// src/pages/app/clientes/CustomerDetail.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Plus, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { useVehicles, useDeleteVehicle } from '@/hooks/useVehicles'
import { VehicleForm } from './VehicleForm'

export default function CustomerDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [addVehicle, setAddVehicle] = useState(false)
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false)
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null)

  const { data: customer, isLoading } = useCustomer(id ?? '')
  const { data: vehicles = [] } = useVehicles(id ?? '')
  const deleteCustomer = useDeleteCustomer()
  const deleteVehicle = useDeleteVehicle()

  if (isLoading || !customer) {
    return <div className="pm-skeleton h-64 w-full rounded" />
  }

  async function handleDeleteCustomer() {
    await deleteCustomer.mutateAsync(customer.id)
    setDeleteCustomerOpen(false)
    navigate('/matriz/clientes')
  }

  async function handleDeleteVehicle() {
    if (!deleteVehicleId || !id) return
    await deleteVehicle.mutateAsync({ id: deleteVehicleId, customerId: id })
    setDeleteVehicleId(null)
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/matriz/clientes')}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => navigate(`/matriz/clientes/${id}/editar`)}>
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
            <Button variant="ghost" onClick={() => setDeleteCustomerOpen(true)}>
              <Trash2 size={16} />
            </Button>
          </div>
        }
      />

      {/* Customer Info */}
      <div className="pm-card mb-6 grid grid-cols-2 gap-4 max-w-2xl">
        <div>
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="text-sm text-foreground">{customer.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Telefone</p>
          <p className="text-sm text-foreground">{customer.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CPF / CNPJ</p>
          <p className="text-sm text-foreground">{customer.document ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tier de Preço</p>
          <PriceTierBadge tier={customer.price_tier} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <span className={`text-sm font-medium ${customer.active ? 'text-green-400' : 'text-muted-foreground'}`}>
            {customer.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Vehicles */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="pm-accent-line">Veículos ({vehicles.length})</h2>
        <Button size="sm" onClick={() => setAddVehicle(true)} style={{ background: 'hsl(var(--pm-red-500))' }}>
          <Plus size={14} className="mr-1" />
          Adicionar Veículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="pm-card flex flex-col items-center py-10 text-center gap-2">
          <Car size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
        </div>
      ) : (
        <div className="pm-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--pm-gray-700))]">
                <th className="text-left p-3 font-medium text-muted-foreground">Placa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Marca / Modelo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ano</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-[hsl(var(--pm-gray-700))] last:border-0">
                  <td className="p-3 font-mono">{v.plate ?? '—'}</td>
                  <td className="p-3">{v.brand} {v.model}</td>
                  <td className="p-3">{v.year ?? '—'}</td>
                  <td className="p-3 capitalize">{v.vehicle_type.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setDeleteVehicleId(v.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VehicleForm
        open={addVehicle}
        onOpenChange={setAddVehicle}
        customerId={id ?? ''}
      />

      <ConfirmDialog
        open={deleteCustomerOpen}
        onOpenChange={setDeleteCustomerOpen}
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir "${customer.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteCustomer}
        isLoading={deleteCustomer.isPending}
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={!!deleteVehicleId}
        onOpenChange={(v) => !v && setDeleteVehicleId(null)}
        title="Excluir Veículo"
        description="Tem certeza que deseja excluir este veículo?"
        onConfirm={handleDeleteVehicle}
        isLoading={deleteVehicle.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/clientes/CustomerDetail.tsx
git commit -m "feat: add CustomerDetail page with vehicles management"
```

---

### Task 8: useProducts Hook

**Files:**
- Create: `src/hooks/useProducts.ts`

- [ ] **Step 1: Create useProducts**

```ts
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { PriceTier } from '@/types/app'

export interface ProductPrice {
  id: string
  product_id: string
  tier: PriceTier
  price: number
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  description: string | null
  active: boolean
  stock: number
  created_at: string
  product_prices?: ProductPrice[]
}

export interface ProductWithPrices extends Product {
  product_prices: ProductPrice[]
}

interface ListFilter {
  q?: string
  category?: string
  page?: number
  pageSize?: number
}

export function useProducts({ q = '', category = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['products', q, category, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('products')
        .select('*, product_prices(*)', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      if (category) query = query.eq('category', category)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as ProductWithPrices[], total: (count as number) ?? 0 }
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*, product_prices(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as ProductWithPrices
    },
  })
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('category')
        .order('category')
      if (error) throw error
      const unique = [...new Set((data as { category: string }[]).map((r) => r.category))]
      return unique
    },
  })
}

interface UpsertProductPayload {
  id?: string
  sku: string
  name: string
  category: string
  description: string | null
  active: boolean
  stock: number
  prices: { tier: PriceTier; price: number }[]
}

export function useUpsertProduct() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ prices, ...product }: UpsertProductPayload) => {
      const isNew = !product.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      let productId: string
      if (isNew) {
        const { data, error } = await sb.from('products').insert({
          sku: product.sku,
          name: product.name,
          category: product.category,
          description: product.description,
          active: product.active,
          stock: product.stock,
        }).select('id').single()
        if (error) throw error
        productId = data.id
      } else {
        const { error } = await sb.from('products').update({
          sku: product.sku,
          name: product.name,
          category: product.category,
          description: product.description,
          active: product.active,
          stock: product.stock,
        }).eq('id', product.id)
        if (error) throw error
        productId = product.id!
      }

      // Upsert prices
      for (const { tier, price } of prices) {
        await sb.from('product_prices').upsert(
          { product_id: productId, tier, price },
          { onConflict: 'product_id,tier' },
        )
      }

      return productId
    },
    onSuccess: (id, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      log({ entity: 'product', entityId: id, action: vars.id ? 'updated' : 'created' })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('products').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      log({ entity: 'product', entityId: id, action: 'deleted' })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProducts.ts
git commit -m "feat: add useProducts hook with 3-tier price upsert"
```

---

### Task 9: ProductsPage

**Files:**
- Create: `src/pages/app/produtos/ProductsPage.tsx`

- [ ] **Step 1: Create ProductsPage**

```tsx
// src/pages/app/produtos/ProductsPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { useProducts, useProductCategories, type ProductWithPrices } from '@/hooks/useProducts'

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const COLUMNS: Column<ProductWithPrices>[] = [
  { key: 'sku', header: 'SKU', className: 'font-mono text-xs w-24' },
  { key: 'name', header: 'Produto' },
  { key: 'category', header: 'Categoria' },
  {
    key: 'price_cf', header: 'Preço (CF)',
    cell: (r) => {
      const p = r.product_prices?.find((x) => x.tier === 'cliente_final')
      return p ? formatCurrency(p.price) : '—'
    },
  },
  {
    key: 'stock', header: 'Estoque',
    cell: (r) => (
      <span className={r.stock <= 0 ? 'text-amber-400' : 'text-foreground'}>
        {r.stock}
      </span>
    ),
  },
  {
    key: 'active', header: 'Status',
    cell: (r) => (
      <span className={`text-xs font-medium ${r.active ? 'text-green-400' : 'text-muted-foreground'}`}>
        {r.active ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
]

export default function ProductsPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data, isLoading } = useProducts({ q, category, page, pageSize: PAGE_SIZE })
  const { data: categories = [] } = useProductCategories()

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo completo com 3 faixas de preço"
        actions={
          <Button
            onClick={() => navigate('/matriz/produtos/novo')}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            <Plus size={16} className="mr-2" />
            Novo Produto
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select value={category} onValueChange={(v) => { setCategory(v === '_all' ? '' : v); setPage(0) }}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por categoria..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchPlaceholder="Buscar por nome ou SKU..."
        onRowClick={(r) => navigate(`/matriz/produtos/${r.id}`)}
        emptyTitle="Nenhum produto"
        emptyDescription="Clique em Novo Produto para adicionar ao catálogo."
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/produtos/ProductsPage.tsx
git commit -m "feat: add ProductsPage with category filter and pagination"
```

---

### Task 10: ProductForm

**Files:**
- Create: `src/pages/app/produtos/ProductForm.tsx`

- [ ] **Step 1: Create ProductForm**

```tsx
// src/pages/app/produtos/ProductForm.tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProduct, useUpsertProduct } from '@/hooks/useProducts'

const schema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  name: z.string().min(2, 'Nome é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().nullable(),
  stock: z.coerce.number().int().min(0),
  active: z.boolean(),
  price_cliente_final: z.coerce.number().min(0, 'Preço inválido'),
  price_franqueado_linha_leve: z.coerce.number().min(0, 'Preço inválido'),
  price_franqueado_full: z.coerce.number().min(0, 'Preço inválido'),
})

type FormValues = z.infer<typeof schema>

export default function ProductForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: product, isLoading } = useProduct(id ?? '')
  const upsert = useUpsertProduct()

  const {
    register, handleSubmit, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: '',
      name: '',
      category: '',
      description: null,
      stock: 0,
      active: true,
      price_cliente_final: 0,
      price_franqueado_linha_leve: 0,
      price_franqueado_full: 0,
    },
  })

  useEffect(() => {
    if (product) {
      setValue('sku', product.sku)
      setValue('name', product.name)
      setValue('category', product.category)
      setValue('description', product.description)
      setValue('stock', product.stock)
      setValue('active', product.active)
      const prices = product.product_prices ?? []
      const cf = prices.find((p) => p.tier === 'cliente_final')
      const ll = prices.find((p) => p.tier === 'franqueado_linha_leve')
      const fu = prices.find((p) => p.tier === 'franqueado_full')
      if (cf) setValue('price_cliente_final', cf.price)
      if (ll) setValue('price_franqueado_linha_leve', ll.price)
      if (fu) setValue('price_franqueado_full', fu.price)
    }
  }, [product, setValue])

  async function onSubmit(values: FormValues) {
    await upsert.mutateAsync({
      ...(isEdit && id ? { id } : {}),
      sku: values.sku,
      name: values.name,
      category: values.category,
      description: values.description ?? null,
      stock: values.stock,
      active: values.active,
      prices: [
        { tier: 'cliente_final', price: values.price_cliente_final },
        { tier: 'franqueado_linha_leve', price: values.price_franqueado_linha_leve },
        { tier: 'franqueado_full', price: values.price_franqueado_full },
      ],
    })
    navigate('/matriz/produtos')
  }

  if (isEdit && isLoading) {
    return <div className="pm-skeleton h-64 w-full rounded" />
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Editar Produto' : 'Novo Produto'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/matriz/produtos')}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="pm-card max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" {...register('sku')} />
            {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="category">Categoria *</Label>
            <Input id="category" {...register('category')} />
            {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" {...register('description')} rows={3} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="stock">Estoque</Label>
          <Input id="stock" type="number" min={0} {...register('stock')} />
        </div>

        {/* 3-Tier Pricing */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Preços por Tier</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="price_cf">Cliente Final (R$)</Label>
              <Input id="price_cf" type="number" step="0.01" min={0} {...register('price_cliente_final')} />
              {errors.price_cliente_final && (
                <p className="text-xs text-red-400">{errors.price_cliente_final.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_ll">Linha Leve (R$)</Label>
              <Input id="price_ll" type="number" step="0.01" min={0} {...register('price_franqueado_linha_leve')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_fu">Full (R$)</Label>
              <Input id="price_fu" type="number" step="0.01" min={0} {...register('price_franqueado_full')} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input id="active" type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-600" />
          <Label htmlFor="active">Produto ativo</Label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/matriz/produtos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/produtos/ProductForm.tsx
git commit -m "feat: add ProductForm with 3-tier pricing inputs"
```

---

### Task 11: ProductDetail Page

**Files:**
- Create: `src/pages/app/produtos/ProductDetail.tsx`

- [ ] **Step 1: Create ProductDetail**

```tsx
// src/pages/app/produtos/ProductDetail.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useProduct, useDeleteProduct } from '@/hooks/useProducts'

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProductDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: product, isLoading } = useProduct(id ?? '')
  const deleteProduct = useDeleteProduct()

  if (isLoading || !product) {
    return <div className="pm-skeleton h-64 w-full rounded" />
  }

  async function handleDelete() {
    await deleteProduct.mutateAsync(product.id)
    setDeleteOpen(false)
    navigate('/matriz/produtos')
  }

  const prices = product.product_prices ?? []
  const tiers: Array<{ tier: 'cliente_final' | 'franqueado_linha_leve' | 'franqueado_full'; label: string }> = [
    { tier: 'cliente_final', label: 'Cliente Final' },
    { tier: 'franqueado_linha_leve', label: 'Franqueado Linha Leve' },
    { tier: 'franqueado_full', label: 'Franqueado Full' },
  ]

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`SKU: ${product.sku} — ${product.category}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/matriz/produtos')}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => navigate(`/matriz/produtos/${id}/editar`)}>
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Info */}
        <div className="pm-card space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Categoria</p>
            <p className="text-sm text-foreground">{product.category}</p>
          </div>
          {product.description && (
            <div>
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="text-sm text-foreground">{product.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Estoque</p>
            <p className={`text-sm font-medium ${product.stock <= 0 ? 'text-amber-400' : 'text-foreground'}`}>
              {product.stock} unidades
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <span className={`text-sm font-medium ${product.active ? 'text-green-400' : 'text-muted-foreground'}`}>
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="pm-card space-y-4">
          <p className="text-sm font-medium text-foreground">Preços por Tier</p>
          {tiers.map(({ tier, label }) => {
            const priceRow = prices.find((p) => p.tier === tier)
            return (
              <div key={tier} className="flex items-center justify-between">
                <PriceTierBadge tier={tier} />
                <span className="text-sm font-semibold text-foreground">
                  {priceRow ? formatCurrency(priceRow.price) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        isLoading={deleteProduct.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/produtos/ProductDetail.tsx
git commit -m "feat: add ProductDetail page with pricing tiers display"
```

---

### Task 12: useFranchiseUnits Hook

**Files:**
- Create: `src/hooks/useFranchiseUnits.ts`

- [ ] **Step 1: Create useFranchiseUnits**

```ts
// src/hooks/useFranchiseUnits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { ContractType } from '@/types/app'

export interface FranchiseUnit {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  contract_type: ContractType
  active: boolean
  commission_rate: number
  manager_id: string | null
  created_at: string
}

interface ListFilter {
  q?: string
  page?: number
  pageSize?: number
}

export function useFranchiseUnits({ q = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['franchise-units', q, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('franchise_units')
        .select('*', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as FranchiseUnit[], total: (count as number) ?? 0 }
    },
  })
}

export function useFranchiseUnit(id: string) {
  return useQuery({
    queryKey: ['franchise-unit', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').select('*').eq('id', id).single()
      if (error) throw error
      return data as FranchiseUnit
    },
  })
}

type CreatePayload = Omit<FranchiseUnit, 'id' | 'created_at'>

export function useCreateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').insert(payload).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'created' })
    },
  })
}

export function useUpdateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FranchiseUnit> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      qc.invalidateQueries({ queryKey: ['franchise-unit', u.id] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'updated' })
    },
  })
}

export function useDeleteFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('franchise_units').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: id, action: 'deleted' })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useFranchiseUnits.ts
git commit -m "feat: add useFranchiseUnits hook with CRUD mutations"
```

---

### Task 13: FranchiseeForm (Sheet) + FranchiseesPage

**Files:**
- Create: `src/pages/app/franqueados/FranchiseeForm.tsx`
- Create: `src/pages/app/franqueados/FranchiseesPage.tsx`

- [ ] **Step 1: Create FranchiseeForm (Sheet)**

```tsx
// src/pages/app/franqueados/FranchiseeForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCreateFranchiseUnit, useUpdateFranchiseUnit, type FranchiseUnit,
} from '@/hooks/useFranchiseUnits'

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  cnpj: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email('E-mail inválido').or(z.literal('').transform(() => null)).nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  contract_type: z.enum(['full', 'linha_leve']),
  commission_rate: z.coerce.number().min(0).max(100),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface FranchiseeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: FranchiseUnit
}

export function FranchiseeForm({ open, onOpenChange, unit }: FranchiseeFormProps) {
  const isEdit = !!unit
  const create = useCreateFranchiseUnit()
  const update = useUpdateFranchiseUnit()

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      cnpj: null,
      phone: null,
      email: null,
      address: null,
      city: null,
      state: null,
      contract_type: 'full',
      commission_rate: 0,
      active: true,
    },
  })

  useEffect(() => {
    if (unit) {
      setValue('name', unit.name)
      setValue('cnpj', unit.cnpj)
      setValue('phone', unit.phone)
      setValue('email', unit.email)
      setValue('address', unit.address)
      setValue('city', unit.city)
      setValue('state', unit.state)
      setValue('contract_type', unit.contract_type)
      setValue('commission_rate', unit.commission_rate)
      setValue('active', unit.active)
    } else {
      reset()
    }
  }, [unit, setValue, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      cnpj: values.cnpj ?? null,
      phone: values.phone ?? null,
      email: values.email ?? null,
      address: values.address ?? null,
      city: values.city ?? null,
      state: values.state ?? null,
      contract_type: values.contract_type,
      commission_rate: values.commission_rate,
      active: values.active,
      manager_id: unit?.manager_id ?? null,
    }

    if (isEdit && unit) {
      await update.mutateAsync({ id: unit.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const contractType = watch('contract_type')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar Unidade' : 'Nova Unidade Franqueada'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input {...register('cnpj')} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input {...register('phone')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Endereço</Label>
            <Input {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-1">
              <Label>Estado (UF)</Label>
              <Input {...register('state')} maxLength={2} placeholder="SP" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo de Contrato</Label>
            <Select
              value={contractType}
              onValueChange={(v) => setValue('contract_type', v as FormValues['contract_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="linha_leve">Linha Leve</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Comissão (%)</Label>
            <Input type="number" step="0.01" min={0} max={100} {...register('commission_rate')} />
          </div>

          <div className="flex items-center gap-2">
            <input id="active-fu" type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-600" />
            <Label htmlFor="active-fu">Unidade ativa</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ background: 'hsl(var(--pm-red-500))' }}
            >
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Unidade'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create FranchiseesPage**

```tsx
// src/pages/app/franqueados/FranchiseesPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FranchiseeForm } from './FranchiseeForm'
import { useFranchiseUnits, type FranchiseUnit } from '@/hooks/useFranchiseUnits'

const CONTRACT_LABELS: Record<string, string> = {
  full: 'Full',
  linha_leve: 'Linha Leve',
}

const COLUMNS: Column<FranchiseUnit>[] = [
  { key: 'name', header: 'Nome' },
  {
    key: 'location', header: 'Localidade',
    cell: (r) => r.city && r.state ? `${r.city} — ${r.state}` : r.city ?? r.state ?? '—',
  },
  {
    key: 'contract_type', header: 'Contrato',
    cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
        r.contract_type === 'full'
          ? 'bg-red-900 text-red-200'
          : 'bg-blue-900 text-blue-200'
      }`}>
        {CONTRACT_LABELS[r.contract_type]}
      </span>
    ),
  },
  {
    key: 'commission_rate', header: 'Comissão',
    cell: (r) => `${r.commission_rate}%`,
  },
  {
    key: 'active', header: 'Status',
    cell: (r) => (
      <span className={`text-xs font-medium ${r.active ? 'text-green-400' : 'text-muted-foreground'}`}>
        {r.active ? 'Ativa' : 'Inativa'}
      </span>
    ),
  },
]

export default function FranchiseesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const PAGE_SIZE = 20

  const { data, isLoading } = useFranchiseUnits({ q, page, pageSize: PAGE_SIZE })

  return (
    <div>
      <PageHeader
        title="Franqueados"
        subtitle="Unidades da rede Promax Tuner"
        actions={
          <Button
            onClick={() => setFormOpen(true)}
            style={{ background: 'hsl(var(--pm-red-500))' }}
          >
            <Plus size={16} className="mr-2" />
            Nova Unidade
          </Button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchPlaceholder="Buscar por nome..."
        onRowClick={(r) => navigate(`/matriz/franqueados/${r.id}`)}
        emptyTitle="Nenhuma unidade"
        emptyDescription="Clique em Nova Unidade para adicionar."
      />

      <FranchiseeForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/FranchiseeForm.tsx \
        src/pages/app/franqueados/FranchiseesPage.tsx
git commit -m "feat: add FranchiseesPage list and FranchiseeForm sheet"
```

---

### Task 14: FranchiseeDetail Page

**Files:**
- Create: `src/pages/app/franqueados/FranchiseeDetail.tsx`

- [ ] **Step 1: Create FranchiseeDetail**

```tsx
// src/pages/app/franqueados/FranchiseeDetail.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FranchiseeForm } from './FranchiseeForm'
import { useFranchiseUnit, useDeleteFranchiseUnit } from '@/hooks/useFranchiseUnits'

const CONTRACT_LABELS: Record<string, string> = {
  full: 'Full',
  linha_leve: 'Linha Leve',
}

export default function FranchiseeDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: unit, isLoading } = useFranchiseUnit(id ?? '')
  const deleteUnit = useDeleteFranchiseUnit()

  if (isLoading || !unit) {
    return <div className="pm-skeleton h-64 w-full rounded" />
  }

  async function handleDelete() {
    await deleteUnit.mutateAsync(unit.id)
    setDeleteOpen(false)
    navigate('/matriz/franqueados')
  }

  return (
    <div>
      <PageHeader
        title={unit.name}
        subtitle={unit.city && unit.state ? `${unit.city} — ${unit.state}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/matriz/franqueados')}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} />
            </Button>
          </div>
        }
      />

      <div className="pm-card max-w-2xl grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">CNPJ</p>
          <p className="text-sm text-foreground">{unit.cnpj ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Telefone</p>
          <p className="text-sm text-foreground">{unit.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="text-sm text-foreground">{unit.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Endereço</p>
          <p className="text-sm text-foreground">{unit.address ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo de Contrato</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            unit.contract_type === 'full'
              ? 'bg-red-900 text-red-200'
              : 'bg-blue-900 text-blue-200'
          }`}>
            {CONTRACT_LABELS[unit.contract_type]}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Comissão</p>
          <p className="text-sm text-foreground">{unit.commission_rate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <span className={`text-sm font-medium ${unit.active ? 'text-green-400' : 'text-muted-foreground'}`}>
            {unit.active ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>

      <FranchiseeForm open={editOpen} onOpenChange={setEditOpen} unit={unit} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Unidade"
        description={`Tem certeza que deseja excluir "${unit.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        isLoading={deleteUnit.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/franqueados/FranchiseeDetail.tsx
git commit -m "feat: add FranchiseeDetail page with edit sheet and delete confirm"
```

---

### Task 15: Router + TopBar Updates

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Update router with all new routes**

Replace `src/router/index.tsx` with:

```tsx
// src/router/index.tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'

const Landing          = lazy(() => import('@/pages/Landing'))
const Login            = lazy(() => import('@/pages/Login'))
const NotFound         = lazy(() => import('@/pages/NotFound'))
const Dashboard        = lazy(() => import('@/pages/app/Dashboard'))
const CustomersPage    = lazy(() => import('@/pages/app/clientes/CustomersPage'))
const CustomerForm     = lazy(() => import('@/pages/app/clientes/CustomerForm'))
const CustomerDetail   = lazy(() => import('@/pages/app/clientes/CustomerDetail'))
const ProductsPage     = lazy(() => import('@/pages/app/produtos/ProductsPage'))
const ProductForm      = lazy(() => import('@/pages/app/produtos/ProductForm'))
const ProductDetail    = lazy(() => import('@/pages/app/produtos/ProductDetail'))
const FranchiseesPage  = lazy(() => import('@/pages/app/franqueados/FranchiseesPage'))
const FranchiseeDetail = lazy(() => import('@/pages/app/franqueados/FranchiseeDetail'))

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="pm-skeleton h-8 w-32" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

function ProtectedLayout() {
  return (
    <AuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGuard>
  )
}

const router = createBrowserRouter([
  { path: '/',      element: <S><Landing /></S> },
  { path: '/login', element: <S><Login /></S> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/matriz/dashboard',           element: <S><Dashboard /></S> },
      { path: '/matriz/clientes',            element: <S><CustomersPage /></S> },
      { path: '/matriz/clientes/novo',       element: <S><CustomerForm /></S> },
      { path: '/matriz/clientes/:id',        element: <S><CustomerDetail /></S> },
      { path: '/matriz/clientes/:id/editar', element: <S><CustomerForm /></S> },
      { path: '/matriz/produtos',            element: <S><ProductsPage /></S> },
      { path: '/matriz/produtos/novo',       element: <S><ProductForm /></S> },
      { path: '/matriz/produtos/:id',        element: <S><ProductDetail /></S> },
      { path: '/matriz/produtos/:id/editar', element: <S><ProductForm /></S> },
      { path: '/matriz/franqueados',         element: <S><FranchiseesPage /></S> },
      { path: '/matriz/franqueados/:id',     element: <S><FranchiseeDetail /></S> },
    ],
  },
  { path: '*', element: <S><NotFound /></S> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Update TopBar with dynamic route titles**

Replace the ROUTE_TITLES lookup in `src/components/layout/TopBar.tsx` with a function:

```tsx
// src/components/layout/TopBar.tsx
import { Bell, LogOut } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

const EXACT_TITLES: Record<string, string> = {
  '/matriz/dashboard':     'Command Center',
  '/matriz/arquivos':      'Arquivos ECU',
  '/matriz/clientes':      'Clientes',
  '/matriz/clientes/novo': 'Novo Cliente',
  '/matriz/franqueados':   'Franqueados',
  '/matriz/produtos':      'Produtos',
  '/matriz/produtos/novo': 'Novo Produto',
  '/matriz/pedidos':       'Pedidos',
  '/matriz/pdv':           'PDV',
  '/matriz/financeiro':    'Financeiro',
  '/matriz/suporte':       'Suporte',
  '/matriz/auditoria':     'Auditoria',
  '/matriz/configuracoes': 'Configurações',
}

function getRouteTitle(pathname: string): string {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname]
  if (/^\/matriz\/clientes\/[^/]+\/editar$/.test(pathname)) return 'Editar Cliente'
  if (/^\/matriz\/clientes\/[^/]+$/.test(pathname)) return 'Detalhe do Cliente'
  if (/^\/matriz\/produtos\/[^/]+\/editar$/.test(pathname)) return 'Editar Produto'
  if (/^\/matriz\/produtos\/[^/]+$/.test(pathname)) return 'Detalhe do Produto'
  if (/^\/matriz\/franqueados\/[^/]+$/.test(pathname)) return 'Detalhe da Unidade'
  return 'Promax Tuner'
}

export function TopBar() {
  const location = useLocation()
  const { logout } = useAuth()
  const { profile } = useProfile()

  const title = getRouteTitle(location.pathname)
  const initials = profile?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'PT'

  return (
    <header className="pm-topbar">
      <h1 className="pm-page-title flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell size={18} />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarFallback
            className="text-xs font-bold"
            style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button variant="ghost" size="icon" onClick={logout} title="Sair">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/router/index.tsx src/components/layout/TopBar.tsx
git commit -m "feat: wire Cadastros routes and add dynamic TopBar titles"
```

---

### Task 16: Final Build Check

**Files:** No new files — verification only.

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS with no failures.

- [ ] **Step 2: Run TypeScript build**

Run: `npm run build`
Expected: Zero TypeScript errors, successful build output in `dist/`.

- [ ] **Step 3: Fix any type errors found**

If build reports errors:
- `Property 'X' does not exist` → check `(supabase as any)` cast is applied to the right side of the call chain
- `Type 'string | null' is not assignable to 'string'` → add `?? ''` or `?? null` as appropriate
- `Module has no exported member 'X'` → verify export in the hook file

Re-run `npm run build` after each fix until zero errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Fase 3 Cadastros complete — clientes, produtos, franqueados"
```

---

## Architectural Notes

**Supabase type workaround:** Every Supabase chain must start with `(supabase as any).from(...)`. The `database.ts` file is a stub until the project is created on supabase.com and `supabase gen types typescript` is run.

**Audit logging:** Always destructure as `const { log } = useAuditLog()`. Never use `logAction` — that export does not exist.

**Sheet vs AlertDialog:** `AlertDialog` is not installed. Use `ConfirmDialog` (built on `Dialog`) for all confirmations.

**BrasilAPI:** Plate lookup is best-effort. If the API returns 404 or network fails, `lookupPlate` returns `null` and the UI shows a "not found" message — user fills brand/model manually.

**Price tier isolation:** RLS on `product_prices` table restricts rows by `tier` based on the authenticated user's profile. Frontend never filters prices — it displays all rows returned by the query.

**Route ordering:** The router defines `/matriz/clientes/novo` before `/matriz/clientes/:id` so the literal path wins over the param route. React Router v7 handles this correctly when defined in order.
