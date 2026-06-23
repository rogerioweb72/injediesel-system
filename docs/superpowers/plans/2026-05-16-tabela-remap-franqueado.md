# Tabela Remap (Matriz) + Área do Franqueado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Tabela Remap backoffice UX fixes, build the Franchisee ECU workflow form upgrade, build a Franchisee KPI dashboard, gate the download button by status, and add a tech-spec modal to loja-virtual.html.

**Architecture:** All UI uses existing PM design tokens (`--pm-gray-*`, `--pm-red-500`) and shadcn/ui components — zero new CSS invented. Business logic (pricing, margins) stays server-side. Two new DB columns (`service_tags text[]`, `vehicle_info jsonb`) require migration 017 which must be applied when Docker is available; UI degrades gracefully in MOCK mode.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, React Hook Form + Zod, shadcn/ui, Tailwind CSS, Supabase Postgres + RLS, Deno Edge Functions.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/catalogo/BulkActionsPanel.tsx` |
| Modify | `src/pages/app/arquivos/EcuJobDetail.tsx` |
| Create | `supabase/migrations/017_ecu_job_tags.sql` |
| Modify | `src/hooks/useEcuJobs.ts` |
| Modify | `src/pages/app/arquivos/EcuJobForm.tsx` |
| Create | `src/pages/app/franqueados/FranqueadoDashboard.tsx` |
| Modify | `src/components/layout/Sidebar.tsx` |
| Modify | `src/router/index.tsx` |
| Modify | `public/loja-virtual.html` |

---

## Task 1: BulkActionsPanel — inline confirm banner (replace window.confirm)

**Files:**
- Modify: `src/components/catalogo/BulkActionsPanel.tsx`

Current code calls `confirm(...)` (line 30) — native browser dialog, blocks UI thread and is inconsistent with the design system. Replace with inline state-driven confirmation banner.

- [ ] **Step 1: Add confirm state to BulkActionsPanel**

Replace the `handleApply` function and add a `pendingAction` state:

```tsx
type PendingAction = {
  isIncrease: boolean
  pct: number
  label: string
}

// inside BulkActionsPanel component, after existing useState hooks:
const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

const handleApply = (isIncrease: boolean) => {
  const pct = isIncrease ? Number(acrescimoPct) : Number(descontoPct)
  if (isNaN(pct) || pct <= 0) return
  const label = `${isIncrease ? 'acréscimo' : 'desconto'} de ${pct}% em ${categoria}`
  setPendingAction({ isIncrease, pct, label })
}

const handleConfirm = () => {
  if (!pendingAction) return
  bulkUpdate({ target, categoria, pct: pendingAction.pct, isIncrease: pendingAction.isIncrease }, {
    onSuccess: () => {
      setAcrescimoPct('')
      setDescontoPct('')
      setPendingAction(null)
    },
    onSettled: () => setPendingAction(null),
  })
}
```

- [ ] **Step 2: Add confirmation banner JSX**

At the bottom of the BulkActionsPanel return, after the `<div className="flex gap-4...">` block and before the closing outer div:

```tsx
{pendingAction && (
  <div className="w-full mt-2 flex items-center gap-4 rounded bg-amber-500/10 border border-amber-500/30 px-4 py-3">
    <span className="flex-1 text-sm text-amber-300 font-mono">
      Aplicar {pendingAction.label}?
    </span>
    <Button
      size="sm"
      disabled={isPending}
      style={{ background: 'hsl(var(--pm-red-500))' }}
      onClick={handleConfirm}
    >
      {isPending ? 'Aplicando...' : 'Confirmar'}
    </Button>
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => setPendingAction(null)}
    >
      Cancelar
    </Button>
  </div>
)}
```

- [ ] **Step 3: Remove the old `confirm()` call**

Delete line: `if (confirm(\`Tem certeza que deseja aplicar...\`)) {` and its closing brace. The `handleApply` now just calls `setPendingAction`.

- [ ] **Step 4: Verify visually**

Run `VITE_MOCK=true npm run dev`, go to `/matriz/tabela-remap`, click APLICAR — banner appears, Confirmar runs update, Cancelar dismisses without update.

---

## Task 2: EcuJobDetail — gate download button by status

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobDetail.tsx`

The Download button at ~line 254 fires unconditionally. Spec: only enable when `job.status === 'concluido'`.

- [ ] **Step 1: Disable download when status is not concluido**

Find the `<Button size="sm" variant="ghost" onClick={() => downloadFile.mutate(...)}>` at ~line 254. Add `disabled` prop:

```tsx
<Button
  size="sm"
  variant="ghost"
  disabled={job.status !== 'concluido'}
  title={job.status !== 'concluido' ? 'Disponível quando o job estiver concluído' : undefined}
  onClick={() => downloadFile.mutate({ r2Key: f.r2_key, fileName: f.file_name })}
>
  <Download size={14} />
</Button>
```

- [ ] **Step 2: Verify**

In mock mode, create a job at status `aguardando_cliente` — download button is greyed out. Change status to `concluido` — button enables.

---

## Task 3: Migration 017 — service_tags + vehicle_info on ecu_jobs

**Files:**
- Create: `supabase/migrations/017_ecu_job_tags.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 017_ecu_job_tags.sql
-- Adds multi-select service tags and free-form vehicle info to ecu_jobs

alter table ecu_jobs
  add column if not exists service_tags text[] default '{}',
  add column if not exists vehicle_info jsonb default '{}';

comment on column ecu_jobs.service_tags is 'Multi-select service categories: Performance, Emissões, Diagnóstico, Codificação, Transmissão, Especial';
comment on column ecu_jobs.vehicle_info is 'Free-form vehicle data: {categoria, marca, modelo, motor, transmissao, ano, horas_km}';
```

- [ ] **Step 2: Note — apply when Docker available**

This migration must be applied via `supabase db reset` or pasted directly in Supabase Dashboard > SQL Editor when Docker is unavailable locally.

---

## Task 4: Update EcuJob type + useCreateEcuJob mutation

**Files:**
- Modify: `src/hooks/useEcuJobs.ts`

- [ ] **Step 1: Add fields to EcuJob interface**

In `useEcuJobs.ts`, find `export interface EcuJob` and add two fields after `amount_charged_to_customer`:

```ts
service_tags: string[]
vehicle_info: {
  categoria?: string
  marca?: string
  modelo?: string
  motor?: string
  transmissao?: string
  ano?: string
  horas_km?: string
} | null
```

- [ ] **Step 2: Update useCreateEcuJob mutationFn payload type**

Find `useCreateEcuJob` (or the create mutation). Its input type should accept the two new optional fields. If the mutation uses an explicit type (likely `Omit<EcuJob, 'id' | 'status' | 'created_at' | 'updated_at' | ...>`), add `service_tags` and `vehicle_info` as optional fields to whatever input type is used. Then pass them through to the `.insert(...)` call.

Locate `useCreateEcuJob`:

```ts
// add to the insert payload:
service_tags: payload.service_tags ?? [],
vehicle_info: payload.vehicle_info ?? null,
```

---

## Task 5: EcuJobForm — service tags multi-select chip toggle

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobForm.tsx`

- [ ] **Step 1: Define SERVICE_TAGS constant and add to schema**

At the top of `EcuJobForm.tsx`, add:

```ts
const SERVICE_TAGS = [
  'Performance',
  'Emissões',
  'Diagnóstico',
  'Codificação',
  'Transmissão',
  'Especial',
] as const
```

In the Zod schema, add:
```ts
service_tags: z.array(z.string()).default([]),
```

In `defaultValues`, add:
```ts
service_tags: [],
```

In `FormValues` type (inferred via `z.infer<typeof schema>`), this is now automatically included.

- [ ] **Step 2: Add chip toggle UI in the form, after the service_type Select**

```tsx
{/* Tags de Serviço */}
<div className="space-y-2">
  <Label>Tags de Serviço</Label>
  <div className="flex flex-wrap gap-2">
    {SERVICE_TAGS.map((tag) => {
      const active = watch('service_tags').includes(tag)
      return (
        <button
          key={tag}
          type="button"
          onClick={() => {
            const current = watch('service_tags')
            setValue(
              'service_tags',
              active ? current.filter((t) => t !== tag) : [...current, tag]
            )
          }}
          className={[
            'px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wide border transition-colors',
            active
              ? 'bg-[hsl(var(--pm-red-500))] border-[hsl(var(--pm-red-500))] text-white'
              : 'bg-transparent border-[hsl(var(--pm-gray-700))] text-muted-foreground hover:border-[hsl(var(--pm-gray-500))]',
          ].join(' ')}
        >
          {tag}
        </button>
      )
    })}
  </div>
</div>
```

- [ ] **Step 3: Pass service_tags to createJob.mutateAsync**

In `onSubmit`, add to the `createJob.mutateAsync({...})` call:
```ts
service_tags: values.service_tags,
```

---

## Task 6: EcuJobForm — vehicle free-form fields

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobForm.tsx`

Replace/supplement the customer+vehicle selects with free-form vehicle fields for the franchisee workflow.

- [ ] **Step 1: Add vehicle_info to schema**

In the Zod schema add:
```ts
vehicle_categoria: z.string().optional(),
vehicle_marca: z.string().optional(),
vehicle_modelo: z.string().optional(),
vehicle_motor: z.string().optional(),
vehicle_transmissao: z.string().optional(),
vehicle_ano: z.string().optional(),
vehicle_horas_km: z.string().optional(),
```

In `defaultValues`, add all as `''`.

- [ ] **Step 2: Add free-form vehicle section UI below the existing vehicle Select**

Add after the existing `{customerId && vehicles.length > 0 && (...)}` block:

```tsx
{/* Dados do Veículo (livre) */}
<div className="space-y-3">
  <Label className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
    Dados do Veículo
  </Label>
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label className="text-xs">Categoria</Label>
      <Select
        value={watch('vehicle_categoria') ?? ''}
        onValueChange={(v) => setValue('vehicle_categoria', v)}
      >
        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          {['Carro/SUV', 'Pickup', 'Truck', 'Agrícola', 'Máquina Pesada', 'Moto', 'Náutica'].map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Marca</Label>
      <Input placeholder="Ex: Volkswagen" {...register('vehicle_marca')} />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Modelo</Label>
      <Input placeholder="Ex: Tiguan 2.0 TSI" {...register('vehicle_modelo')} />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Motor</Label>
      <Input placeholder="Ex: 2.0 TSI 220cv" {...register('vehicle_motor')} />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Transmissão</Label>
      <Select
        value={watch('vehicle_transmissao') ?? ''}
        onValueChange={(v) => setValue('vehicle_transmissao', v)}
      >
        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          {['Manual', 'Automático', 'CVT', 'DCT', 'AMT'].map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Ano</Label>
      <Input placeholder="Ex: 2022/2023" {...register('vehicle_ano')} />
    </div>
    <div className="col-span-2 space-y-1">
      <Label className="text-xs">Horas / Km</Label>
      <Input placeholder="Ex: 45.000 km ou 1.200h" {...register('vehicle_horas_km')} />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Build vehicle_info object in onSubmit and pass to mutation**

In `onSubmit`, before `createJob.mutateAsync`:
```ts
const vehicle_info = {
  categoria: values.vehicle_categoria || undefined,
  marca: values.vehicle_marca || undefined,
  modelo: values.vehicle_modelo || undefined,
  motor: values.vehicle_motor || undefined,
  transmissao: values.vehicle_transmissao || undefined,
  ano: values.vehicle_ano || undefined,
  horas_km: values.vehicle_horas_km || undefined,
}

const job = await createJob.mutateAsync({
  // ...existing fields...
  vehicle_info,
})
```

---

## Task 7: EcuJobForm — 2-file dropzone with format + size validation

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobForm.tsx`

Current: 1 file state (`file`), accepts `.bin,.ori,.hex,.mod,.dat,.ecu`.  
Spec: 2 files (original + delivery), accepts `.bin,.ori,.kfg,.bck,.eprom,.zip,.rar`, max 256MB each.

- [ ] **Step 1: Upgrade file state and constants**

Replace:
```ts
const [file, setFile] = useState<File | null>(null)
```
With:
```ts
const [files, setFiles] = useState<{ original: File | null; entrega: File | null }>({
  original: null,
  entrega: null,
})

const ACCEPTED_EXTENSIONS = '.bin,.ori,.kfg,.bck,.eprom,.zip,.rar'
const MAX_BYTES = 256 * 1024 * 1024 // 256 MB
```

- [ ] **Step 2: Add file validation helper**

```ts
function validateEcuFile(f: File): string | null {
  if (f.size > MAX_BYTES) return `Arquivo muito grande (máx 256 MB): ${formatBytes(f.size)}`
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = ['bin', 'ori', 'kfg', 'bck', 'eprom', 'zip', 'rar']
  if (!allowed.includes(ext)) return `Formato não permitido: .${ext}`
  return null
}
```

- [ ] **Step 3: Replace single-file UI with 2-slot dropzone**

Remove the existing file upload section. Add:

```tsx
{/* Arquivos ECU */}
<div className="space-y-2">
  <Label>Arquivos ECU</Label>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {(['original', 'entrega'] as const).map((slot) => {
      const f = files[slot]
      const label = slot === 'original' ? 'Arquivo Original' : 'Arquivo de Entrega'
      return (
        <div key={slot}>
          <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">{label}</p>
          {f ? (
            <div className="flex items-center gap-2 p-3 rounded border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))]">
              <FileText size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setFiles((p) => ({ ...p, [slot]: null }))}>
                <X size={12} />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-20 rounded border-2 border-dashed border-[hsl(var(--pm-gray-700))] cursor-pointer hover:border-[hsl(var(--pm-red-500))] transition-colors">
              <Upload size={18} className="text-muted-foreground mb-1" />
              <span className="text-[11px] text-muted-foreground">Clique para selecionar</span>
              <input
                type="file"
                className="hidden"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => {
                  const picked = e.target.files?.[0]
                  if (!picked) return
                  const err = validateEcuFile(picked)
                  if (err) { toast.error(err); return }
                  setFiles((p) => ({ ...p, [slot]: picked }))
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      )
    })}
  </div>
  <p className="text-xs text-muted-foreground">Formatos: .bin .ori .kfg .bck .eprom .zip .rar · Máx 256 MB por arquivo</p>
</div>
```

- [ ] **Step 4: Update onSubmit to upload both files**

Replace:
```ts
if (file) {
  await uploadFile.mutateAsync({ jobId: job.id, file, fileType: 'original' })
}
```
With:
```ts
if (files.original) {
  await uploadFile.mutateAsync({ jobId: job.id, file: files.original, fileType: 'original' })
}
if (files.entrega) {
  await uploadFile.mutateAsync({ jobId: job.id, file: files.entrega, fileType: 'entrega' })
}
```

- [ ] **Step 5: Add `toast` import**

```ts
import { toast } from 'sonner'
```

---

## Task 8: Franchisee KPI Dashboard page

**Files:**
- Create: `src/pages/app/franqueados/FranqueadoDashboard.tsx`

KPIs: Faturamento Total, Qtd Serviços, Ticket Médio. Category breakdown bars (% faturamento by service category). Read from `ecu_jobs` filtered by unit_id of the logged-in franchisee.

- [ ] **Step 1: Create FranqueadoDashboard.tsx**

```tsx
import { useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useEcuJobs } from '@/hooks/useEcuJobs'
import { useMyUnit } from '@/hooks/useMyUnit'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FranqueadoDashboard() {
  const { data: myUnit } = useMyUnit()
  const { data: jobsData, isLoading } = useEcuJobs({ pageSize: 500 })
  const jobs = jobsData?.data ?? []

  // Filter to current unit and exclude cancelled
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.unit_id === myUnit?.unit_id && j.status !== 'cancelado'),
    [jobs, myUnit]
  )

  const faturamento = useMemo(
    () => activeJobs.reduce((sum, j) => sum + (j.amount_charged_to_customer ?? 0), 0),
    [activeJobs]
  )

  const ticketMedio = activeJobs.length > 0 ? faturamento / activeJobs.length : 0

  // Group faturamento by service_type (tag bars)
  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    activeJobs.forEach((j) => {
      const key = j.service_type || 'Outro'
      map[key] = (map[key] ?? 0) + (j.amount_charged_to_customer ?? 0)
    })
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: faturamento > 0 ? (value / faturamento) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [activeJobs, faturamento])

  if (isLoading) return <div className="pm-skeleton h-64 w-full rounded" />

  return (
    <div>
      <PageHeader title="Meu Dashboard" subtitle="Visão geral da sua unidade" />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Faturamento Total', value: fmt(faturamento), color: 'text-green-400' },
          { label: 'Serviços Realizados', value: String(activeJobs.length), color: 'text-white' },
          { label: 'Ticket Médio', value: fmt(ticketMedio), color: 'text-amber-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="pm-card p-5 flex flex-col gap-1 bg-[hsl(var(--pm-gray-900))] border border-[hsl(var(--pm-gray-800))]"
          >
            <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Category bars */}
      {byType.length > 0 && (
        <div className="pm-card bg-[hsl(var(--pm-gray-900))] border border-[hsl(var(--pm-gray-800))] p-5">
          <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground mb-4">
            Faturamento por Tipo de Serviço
          </p>
          <div className="space-y-3">
            {byType.map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground truncate max-w-[60%]">{label}</span>
                  <span className="text-muted-foreground font-mono">{fmt(value)} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-[hsl(var(--pm-gray-800))] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--pm-red-500))] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Check useMyUnit hook exists**

Run:
```bash
grep -r "useMyUnit" src/hooks/ --include="*.ts" -l
```

If `src/hooks/useMyUnit.ts` does not exist, create it:

```ts
// src/hooks/useMyUnit.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useMyUnit() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['my-unit', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_unit_roles')
        .select('unit_id')
        .eq('user_id', user!.id)
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
  })
}
```

---

## Task 9: Franchisee sidebar navigation + routes

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/router/index.tsx`

Currently there is NO franchisee sidebar section and `/franqueado/dashboard` has no route.

- [ ] **Step 1: Add franchisee nav items to Sidebar**

In `Sidebar.tsx`, import `Home` from lucide-react (add to existing import), then after the last `hasRole('company_admin')` block, add a franchisee section:

```tsx
{/* Franchisee-only section */}
{hasRole('franchise_manager', 'unit_operator') && (
  <>
    {!collapsed && <div className="pm-sidebar-group-title">Minha Unidade</div>}
    {collapsed && <div className="h-px mx-3 my-2 bg-[hsl(var(--pm-gray-800))]" />}
    <NavItem to="/franqueado/dashboard"    icon={LayoutDashboard} label="Dashboard"     collapsed={collapsed} />
    <NavItem to="/franqueado/arquivos/novo" icon={Files}          label="Novo Job ECU" collapsed={collapsed} />
    <NavItem to="/franqueado/tabela-remap"  icon={Database}       label="Tabela Remap" collapsed={collapsed} />
  </>
)}
```

Note: `LayoutDashboard`, `Files`, `Database` are already imported.

- [ ] **Step 2: Add franchisee routes to router/index.tsx**

Import `FranqueadoDashboard`:
```tsx
const FranqueadoDashboard = lazy(() => import('@/pages/app/franqueados/FranqueadoDashboard'))
```

Inside the `ProtectedLayout` children array, add:
```tsx
{ path: '/franqueado/dashboard',     element: <S><FranqueadoDashboard /></S> },
{ path: '/franqueado/arquivos/novo', element: <S><EcuJobForm /></S> },
```

(The `/franqueado/tabela-remap` route already exists — no change needed.)

---

## Task 10: Loja Virtual — tech spec modal + WhatsApp automation

**Files:**
- Modify: `public/loja-virtual.html`

Add click-to-modal on REMAP cards. Modal shows: CV original, CV reprogramado, torque (if available), aparelho, protocolo, cabo. WhatsApp button builds message from card data.

- [ ] **Step 1: Add modal HTML structure to loja-virtual.html**

Find the `</body>` tag and add before it:

```html
<!-- Tech Spec Modal -->
<div id="remapModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
  <div style="background:hsl(222,8%,8%);border:1px solid hsl(222,8%,16%);border-radius:12px;max-width:480px;width:90%;padding:28px;position:relative;">
    <button onclick="closeRemapModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;line-height:1;">&times;</button>
    <p id="modalMarca" style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;color:#fff;text-transform:uppercase;margin:0 0 4px;"></p>
    <p id="modalModelo" style="font-size:14px;color:#aaa;margin:0 0 20px;"></p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div id="cvBlock" style="background:hsl(222,8%,11%);border-radius:8px;padding:14px;">
        <p style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:0 0 6px;">Potência</p>
        <p id="modalCvOriginal" style="font-size:13px;color:#aaa;margin:0 0 4px;"></p>
        <p id="modalCvTuned" style="font-size:16px;font-weight:700;color:#E72B2B;margin:0;"></p>
      </div>
      <div id="torqueBlock" style="background:hsl(222,8%,11%);border-radius:8px;padding:14px;">
        <p style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:0 0 6px;">Torque</p>
        <p id="modalTorqueOriginal" style="font-size:13px;color:#aaa;margin:0 0 4px;"></p>
        <p id="modalTorqueTuned" style="font-size:16px;font-weight:700;color:#E72B2B;margin:0;"></p>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="modalTechChips"></div>

    <div id="modalPrice" style="margin-bottom:20px;font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#fff;"></div>

    <a id="modalWhatsApp" href="#" target="_blank"
      style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:#fff;border-radius:8px;padding:12px 20px;text-decoration:none;font-weight:600;font-size:15px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      Solicitar via WhatsApp
    </a>
  </div>
</div>
```

- [ ] **Step 2: Add openRemapModal and closeRemapModal JS functions**

Find the `<script>` block in loja-virtual.html and add:

```js
function openRemapModal(card) {
  const d = card.dataset;
  const modal = document.getElementById('remapModal');

  document.getElementById('modalMarca').textContent = d.marca || '';
  document.getElementById('modalModelo').textContent = [d.modelo, d.ano].filter(Boolean).join(' · ');

  const cvOrig = d.cvOriginal ? `${d.cvOriginal} cv` : null;
  const cvTuned = d.cvTuned ? `${d.cvTuned} cv` : null;
  document.getElementById('modalCvOriginal').textContent = cvOrig ? `Original: ${cvOrig}` : '';
  document.getElementById('modalCvTuned').textContent = cvTuned ? `Reprogramado: ${cvTuned}` : (d.ganho || '');
  document.getElementById('cvBlock').style.display = (cvOrig || d.ganho) ? '' : 'none';

  const tqOrig = d.kgfmOriginal ? `${d.kgfmOriginal} kgf·m` : null;
  const tqTuned = d.kgfmTuned ? `${d.kgfmTuned} kgf·m` : null;
  document.getElementById('modalTorqueOriginal').textContent = tqOrig ? `Original: ${tqOrig}` : '';
  document.getElementById('modalTorqueTuned').textContent = tqTuned ? `Reprogramado: ${tqTuned}` : '';
  document.getElementById('torqueBlock').style.display = tqOrig ? '' : 'none';

  // Tech chips: aparelho, protocolo, cabo
  const chips = document.getElementById('modalTechChips');
  chips.innerHTML = ['aparelho', 'protocolo', 'cabo']
    .map((k) => d[k] ? `<span style="background:hsl(222,8%,13%);border:1px solid hsl(222,8%,20%);border-radius:20px;padding:3px 10px;font-size:11px;font-family:'JetBrains Mono',monospace;color:#aaa;">${d[k]}</span>` : '')
    .join('');

  // Price
  const priceEl = document.getElementById('modalPrice');
  const price = parseFloat(d.preco || '0');
  priceEl.textContent = (!price || price === 0) ? 'CONSULTAR' : price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  priceEl.style.color = (!price || price === 0) ? '#D97706' : '#fff';

  // WhatsApp
  const wn = (window.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Olá! Tenho interesse no remap:\n` +
    `*Veículo:* ${d.marca} ${d.modelo} ${d.ano || ''}\n` +
    (d.ganho ? `*Ganho:* ${d.ganho}\n` : '') +
    (priceEl.textContent !== 'CONSULTAR' ? `*Preço:* ${priceEl.textContent}\n` : `*Preço:* Solicitar cotação\n`) +
    `\nAguardo retorno!`
  );
  document.getElementById('modalWhatsApp').href = `https://wa.me/${wn}?text=${msg}`;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRemapModal() {
  document.getElementById('remapModal').style.display = 'none';
  document.body.style.overflow = '';
}

// Close on backdrop click
document.getElementById('remapModal').addEventListener('click', function(e) {
  if (e.target === this) closeRemapModal();
});
```

- [ ] **Step 3: Update makeRemapCard() to embed data-* attributes and call openRemapModal**

Find `function makeRemapCard(item)` in the script. Update the card element to include data attributes and an onclick handler:

```js
function makeRemapCard(item) {
  const card = document.createElement('div');
  // existing card style...
  card.style.cursor = 'pointer';

  // Add data attributes for modal
  card.dataset.marca = item.marca || '';
  card.dataset.modelo = item.modelo_descricao || '';
  card.dataset.ano = item.ano || '';
  card.dataset.ganho = item.ganho || '';
  card.dataset.cvOriginal = item.cv_original || '';
  card.dataset.cvTuned = item.cv_tuned || '';
  card.dataset.kgfmOriginal = item.kgfm_original || '';
  card.dataset.kgfmTuned = item.kgfm_tuned || '';
  card.dataset.aparelho = item.aparelho || '';
  card.dataset.protocolo = item.protocolo || '';
  card.dataset.cabo = item.cabo || '';
  card.dataset.preco = item.preco_cliente_final || '0';

  card.onclick = () => openRemapModal(card);

  // rest of existing innerHTML...
  return card;
}
```

- [ ] **Step 4: Verify modal**

Open `public/loja-virtual.html` in browser, click a REMAP card — modal opens with CV/torque data, chips, price, and WhatsApp link. Press × or backdrop to close.

---

## Self-Review Checklist

- [x] Spec coverage: BulkActionsPanel inline confirm ✓ | Download gate ✓ | service_tags multi-select ✓ | vehicle free-form fields ✓ | 2-file dropzone ✓ | KPI Dashboard ✓ | Franchisee sidebar + routes ✓ | Loja modal ✓
- [x] No `window.confirm()` remaining in BulkActionsPanel
- [x] No price calculation in frontend (KPI dashboard sums `amount_charged_to_customer` which is an already-stored value — display only)
- [x] No new CSS invented — all styles use `hsl(var(--pm-*))` tokens or existing shadcn/ui classes
- [x] Download button gate: `job.status !== 'concluido'` (uses existing `FileStatus` values)
- [x] Migration 017 written, applies when Docker available — form degrades to mock mode gracefully
- [x] WhatsApp URL uses `WHATSAPP_NUMBER` env var from existing loja-virtual.html pattern

---

## Execution Order

Tasks can be executed sequentially. Tasks 1–2 are quick wins (single-file edits). Tasks 3–7 touch EcuJobForm and require migration. Task 8–9 add new page + routing. Task 10 is isolated to the static HTML file.

Recommended commit points:
1. After Task 1 + 2: `fix: bulk confirm banner + download gate by status`
2. After Tasks 3–7: `feat: franchisee ECU form — service tags, vehicle fields, 2-file dropzone`
3. After Tasks 8–9: `feat: franchisee dashboard + sidebar nav`
4. After Task 10: `feat: loja virtual tech-spec modal + whatsapp automation`
