# Faturas + Badges de Status Financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Faturas" read-only no painel da franquia + componente BadgeStatusFinanceiro reutilizável em todas as listagens de arquivos ECU.

**Architecture:** Sem migration (colunas `matrix_payment_status`, `amount_charged_by_matrix`, `matrix_paid_at` já existem da migration 070). Hook `useFaturas.ts` lê ecu_jobs filtrado por unidade; `BadgeStatusFinanceiro` é componente puro. `FranqueadoFaturasPage` é read-only — sem ações. Matriz continua operando pelo FranquiasTab.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Supabase JS v2, Radix UI, Tailwind + CSS vars `hsl(var(--pm-gray-*))`.

**Colunas DB usadas (já existem):**
- `ecu_jobs.matrix_payment_status` — `'em_aberto' | 'pago'`
- `ecu_jobs.amount_charged_by_matrix` — NUMERIC, pode ser NULL
- `ecu_jobs.matrix_paid_at` — TIMESTAMPTZ
- `ecu_jobs.matrix_paid_by` — UUID

---

## Mapa de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| CREATE | `src/components/shared/BadgeStatusFinanceiro.tsx` | Badge reutilizável PAGO/EM ABERTO |
| CREATE | `src/hooks/useFaturas.ts` | Hooks read-only para visão da franquia |
| CREATE | `src/pages/app/franqueados/FranqueadoFaturasPage.tsx` | Página completa da franquia |
| MODIFY | `src/router/index.tsx` | Adicionar rota `/faturas` |
| MODIFY | `src/components/layout/FranqueadoSidebar.tsx` | Adicionar NavItem Faturas |
| MODIFY | `src/hooks/useEcuJobs.ts` | Adicionar `matrix_payment_status` ao tipo `EcuJob` |
| MODIFY | `src/pages/app/arquivos/EcuJobsPage.tsx` | Adicionar coluna badge na listagem |
| MODIFY | `src/pages/app/franqueados/CobrancasEcuTab.tsx` | Cards resumo + substituir StatusBadge local |
| MODIFY | `src/pages/app/financeiro/FranquiasTab.tsx` | Badge na tabela expandida |

---

## Task 1: BadgeStatusFinanceiro — Componente Reutilizável

**Files:**
- Create: `src/components/shared/BadgeStatusFinanceiro.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/shared/BadgeStatusFinanceiro.tsx
type FinancialStatus = 'em_aberto' | 'pago' | null | undefined

interface Props {
  status: FinancialStatus
}

export function BadgeStatusFinanceiro({ status }: Props) {
  if (!status) return null

  if (status === 'pago') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
        style={{
          background: '#0f2a1a',
          color: '#22c55e',
          border: '1px solid #166534',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
        PAGO
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        background: '#2a0f0f',
        color: '#ef4444',
        border: '1px solid #991b1b',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] inline-block" />
      EM ABERTO
    </span>
  )
}
```

- [ ] **Step 2: Verificar TS**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep BadgeStatusFinanceiro | head -5
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/components/shared/BadgeStatusFinanceiro.tsx
git commit -m "feat(ui): BadgeStatusFinanceiro — badge reutilizável PAGO/EM ABERTO"
```

---

## Task 2: useFaturas.ts — Hooks Read-Only para Franquia

**Files:**
- Create: `src/hooks/useFaturas.ts`

**Contexto:** `useMyUnit()` retorna `{ data: { unit_id, franchise_units } }`. A franquia só vê arquivos onde `amount_charged_by_matrix IS NOT NULL` — sem cobrança = não é fatura ainda.

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useFaturas.ts
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMyUnit } from '@/hooks/useMyUnit'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface FaturaItem {
  id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number
  matrix_payment_status: 'em_aberto' | 'pago'
  matrix_paid_at: string | null
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
}

export function useFaturasEmAberto(unitId: string) {
  return useQuery({
    queryKey: ['faturas-em-aberto', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'em_aberto')
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FaturaItem[]
    },
    refetchInterval: 60_000,
  })
}

export function useFaturasPagas(unitId: string, mes?: string) {
  return useQuery({
    queryKey: ['faturas-pagas', unitId, mes],
    enabled: !!unitId,
    queryFn: async () => {
      let query = sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'pago')
        .not('amount_charged_by_matrix', 'is', null)
        .order('matrix_paid_at', { ascending: false })

      if (mes) {
        const [ano, m] = mes.split('-')
        const inicio = `${ano}-${m}-01`
        const fimDate = new Date(Number(ano), Number(m), 0)
        const fim = fimDate.toISOString().split('T')[0]
        query = query.gte('matrix_paid_at', inicio).lte('matrix_paid_at', fim + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as FaturaItem[]
    },
  })
}

export function useFaturasMyUnit() {
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id ?? ''
  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const emAberto = useFaturasEmAberto(unitId)
  const pagosMesAtual = useFaturasPagas(unitId, mesAtual)
  const todosPageos  = useFaturasPagas(unitId)

  const resumo = useMemo(() => ({
    totalEmAberto:    emAberto.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    totalPagoMes:     pagosMesAtual.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    totalHistorico:   todosPageos.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    qtdEmAberto:      emAberto.data?.length ?? 0,
  }), [emAberto.data, pagosMesAtual.data, todosPageos.data])

  return { unitId, emAberto, pagosMesAtual, todosPageos, resumo, isLoading: emAberto.isLoading }
}

export function fmtFatura(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function diasAberto(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function diasColor(dias: number): string {
  if (dias > 15) return '#ef4444'
  if (dias >= 5) return '#eab308'
  return 'hsl(var(--pm-gray-400))'
}
```

- [ ] **Step 2: Verificar TS**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep useFaturas | head -5
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useFaturas.ts
git commit -m "feat(hooks): useFaturas — visão read-only de faturas ECU para franquia"
```

---

## Task 3: FranqueadoFaturasPage.tsx

**Files:**
- Create: `src/pages/app/franqueados/FranqueadoFaturasPage.tsx`

**Contexto:** Página exclusivamente de leitura. `useMyUnit()` fornece o unitId. Sem ações financeiras — só visualização e export CSV.

- [ ] **Step 1: Criar a página completa**

```tsx
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Summary card ───────────────────────────────────────────────────────────────

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

// ── Tabela genérica de faturas ─────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function FranqueadoFaturasPage() {
  const { emAberto, todosPageos, pagosMesAtual, resumo, isLoading } = useFaturasMyUnit()
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

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ResumoCard
          label="Em Aberto"
          value={resumo.totalEmAberto}
          color="#ef4444"
          bg="rgba(239,68,68,0.06)"
          border="rgba(239,68,68,0.2)"
        />
        <ResumoCard
          label="Pago este mês"
          value={resumo.totalPagoMes}
          color="#22c55e"
          bg="rgba(34,197,94,0.06)"
          border="rgba(34,197,94,0.2)"
        />
        <ResumoCard
          label="Total histórico pago"
          value={resumo.totalHistorico}
          color="hsl(var(--pm-gray-300))"
          bg="hsl(var(--pm-gray-900))"
          border="rgba(255,255,255,0.06)"
        />
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

            {/* Rodapé com total */}
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-white">
                Total em aberto:{' '}
                <span style={{ color: '#ef4444' }}>{fmtFatura(resumo.totalEmAberto)}</span>
              </p>
            </div>
          </>
        )}

        {/* Banner informativo */}
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
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => { setMesFiltro(e.target.value); setPagHistorico(0) }}
            style={selectStyle}
          />
          {mesFiltro && (
            <button onClick={() => { setMesFiltro(''); setPagHistorico(0) }}
              className="text-xs underline" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Limpar
            </button>
          )}
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

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  disabled={pagHistorico === 0}
                  onClick={() => setPagHistorico((p) => p - 1)}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-300))' }}
                >
                  Anterior
                </button>
                <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  {pagHistorico + 1} / {totalPaginas}
                </span>
                <button
                  disabled={pagHistorico >= totalPaginas - 1}
                  onClick={() => setPagHistorico((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-300))' }}
                >
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
```

- [ ] **Step 2: Verificar TS**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "FranqueadoFaturasPage\|useFaturas\|BadgeStatusFinanceiro" | head -10
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/franqueados/FranqueadoFaturasPage.tsx
git commit -m "feat(ui): FranqueadoFaturasPage — visão read-only de faturas ECU"
```

---

## Task 4: Router + Sidebar — Rota /faturas e NavItem

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/FranqueadoSidebar.tsx`

- [ ] **Step 1: Ler router atual**

```bash
cat -n "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/router/index.tsx" | head -70
```

- [ ] **Step 2: Adicionar import lazy no topo do router**

Após a linha com `const FranqueadoPerfilPage`, adicione:

```typescript
const FranqueadoFaturasPage = lazy(() => import('@/pages/app/franqueados/FranqueadoFaturasPage'))
```

- [ ] **Step 3: Adicionar rota no bloco de rotas de franqueado**

Dentro do bloco `{ path: '/:unitSlug/:agentSlug', children: [...] }`, após a linha com `{ path: 'perfil', ... }`, adicione:

```typescript
{ path: 'faturas', element: <S><FranqueadoFaturasPage /></S> },
```

- [ ] **Step 4: Adicionar NavItem na sidebar**

Ler o sidebar:
```bash
cat -n "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/components/layout/FranqueadoSidebar.tsx" | grep -n "import\|NavItem.*caixa\|NavItem.*clientes\|Gestão" | head -15
```

No topo do arquivo `FranqueadoSidebar.tsx`, adicionar `FileText` ao import do lucide-react (já existe `Files` — adicionar `FileText` se não tiver):

```typescript
import {
  LayoutDashboard, Files, ShoppingBag, ShoppingCart,
  Users, BarChart3, Headphones,
  Megaphone, User, HelpCircle, BookOpen, FileText,
} from 'lucide-react'
```

Dentro do bloco `{permFinanceiro.canView && (...)` da seção Gestão, **após** o NavItem de Caixa, adicionar:

```tsx
{permFinanceiro.canView && (
  <NavItem to={`${prefix}/faturas`} icon={FileText} label="Faturas" collapsed={collapsed} />
)}
```

- [ ] **Step 5: Build para verificar**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

Esperado: `✓ built in Xs` sem erros.

- [ ] **Step 6: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/router/index.tsx src/components/layout/FranqueadoSidebar.tsx
git commit -m "feat(nav): rota /faturas + NavItem Faturas na sidebar da franquia"
```

---

## Task 5: EcuJob Type + Badge na EcuJobsPage

**Files:**
- Modify: `src/hooks/useEcuJobs.ts`
- Modify: `src/pages/app/arquivos/EcuJobsPage.tsx`

**Contexto:** O select já usa `*` então `matrix_payment_status` já vem do Supabase. Só falta o tipo TS e a coluna na tabela.

- [ ] **Step 1: Adicionar `matrix_payment_status` ao interface EcuJob**

Abrir `src/hooks/useEcuJobs.ts`. Localizar o interface `EcuJob` (começa por volta da linha 32). Após a linha com `franchise_margin_percentage: number | null`, adicionar:

```typescript
  matrix_payment_status: 'em_aberto' | 'pago' | null
  matrix_paid_at: string | null
```

- [ ] **Step 2: Adicionar import do badge em EcuJobsPage**

No topo de `src/pages/app/arquivos/EcuJobsPage.tsx`, após os imports existentes, adicionar:

```typescript
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'
```

- [ ] **Step 3: Adicionar coluna na tabela buildColumns**

Localizar a função `buildColumns` em `EcuJobsPage.tsx`. No array de colunas `cols`, após a coluna `elapsed` (última coluna), adicionar:

```typescript
{
  key: 'financeiro', header: 'Financeiro',
  cell: (r) => r.amount_charged_by_matrix != null
    ? <BadgeStatusFinanceiro status={r.matrix_payment_status} />
    : null,
},
```

- [ ] **Step 4: Verificar TS + build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "EcuJob\|EcuJobsPage" | head -10
npm run build 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useEcuJobs.ts src/pages/app/arquivos/EcuJobsPage.tsx
git commit -m "feat(ui): badge financeiro na listagem de arquivos ECU"
```

---

## Task 6: CobrancasEcuTab — Cards Resumo + BadgeStatusFinanceiro

**Files:**
- Modify: `src/pages/app/franqueados/CobrancasEcuTab.tsx`

**Contexto:** Este arquivo tem uma `function StatusBadge` local. Deve ser removida e substituída por `BadgeStatusFinanceiro`. Também adicionar 3 summary cards no topo.

- [ ] **Step 1: Ler arquivo atual completo**

```bash
cat -n "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/franqueados/CobrancasEcuTab.tsx"
```

- [ ] **Step 2: Substituir import e remover StatusBadge local**

No topo do arquivo, **após** os imports existentes, adicionar:
```typescript
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'
```

Remover a função `StatusBadge` local (as linhas que definem `function StatusBadge(...)`).

- [ ] **Step 3: Trocar uso de StatusBadge → BadgeStatusFinanceiro**

Localizar a linha com `<StatusBadge status={item.matrix_payment_status} />` e substituir por:

```tsx
<BadgeStatusFinanceiro status={item.matrix_payment_status} />
```

- [ ] **Step 4: Adicionar 3 summary cards no início do return**

Dentro do `return (...)` de `CobrancasEcuTab`, antes do `<div className="flex flex-wrap items-center gap-3 justify-between">` (bloco de filtros), inserir:

```tsx
{/* Resumo financeiro */}
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
```

- [ ] **Step 5: Verificar TS + build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep CobrancasEcuTab | head -5
npm run build 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/franqueados/CobrancasEcuTab.tsx
git commit -m "feat(ui): CobrancasEcuTab — cards resumo + BadgeStatusFinanceiro"
```

---

## Task 7: FranquiasTab — Badge na Tabela Expandida + Push Final

**Files:**
- Modify: `src/pages/app/financeiro/FranquiasTab.tsx`

**Contexto:** A tabela expandida do `FranchiseCard` tem colunas: checkbox, Arquivo, Tipo, Veículo, Data, Valor, Dias. Adicionar coluna "Financeiro" sempre mostrando `BadgeStatusFinanceiro status="em_aberto"` (todos os itens nessa lista são em_aberto por definição, pois já filtra por `matrix_payment_status='em_aberto'`). Na prática reforça visualmente o status para o operador de caixa.

- [ ] **Step 1: Ler FranquiasTab**

```bash
cat -n "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/financeiro/FranquiasTab.tsx" | head -30
```

- [ ] **Step 2: Adicionar import**

No topo de `FranquiasTab.tsx`, após imports existentes:

```typescript
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'
```

- [ ] **Step 3: Adicionar cabeçalho da coluna na tabela**

Localizar o array `{['', 'Arquivo', 'Tipo', 'Veículo', 'Data', 'Valor', 'Dias'].map(...)}` e adicionar `'Status'` ao array:

```typescript
{['', 'Arquivo', 'Tipo', 'Veículo', 'Data', 'Valor', 'Dias', 'Status'].map((h) => (
  <th key={h} ...>{h}</th>
))}
```

- [ ] **Step 4: Adicionar célula de status nas rows**

Localizar as `<tr>` das rows da tabela. Após a `<td>` da coluna `Dias` (que mostra `{dias}d`), adicionar:

```tsx
<td className="px-3 py-2.5">
  <BadgeStatusFinanceiro status="em_aberto" />
</td>
```

- [ ] **Step 5: Build final + push**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

Esperado: `✓ built in Xs` sem erros.

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/financeiro/FranquiasTab.tsx
git commit -m "feat(ui): FranquiasTab — BadgeStatusFinanceiro na tabela expandida"
git push origin main
```

---

## Verificação Final (checklist manual)

- [ ] Sidebar da franquia mostra "Faturas" com ícone
- [ ] Rota `/faturas` carrega FranqueadoFaturasPage
- [ ] 3 cards mostram totais corretos (em aberto, pago mês, histórico)
- [ ] Tabela "Em Aberto": ordenada por mais antigo, sem checkboxes nem botões
- [ ] Badge EM ABERTO aparece vermelho escuro em todos os itens em aberto
- [ ] Dias em aberto: vermelho > 15d, amarelo 5-15d, neutro < 5d
- [ ] Banner "entre em contato com a matriz" aparece abaixo da tabela em aberto
- [ ] Seção "Pagos" lista com badge PAGO verde escuro
- [ ] Paginação funciona (20 itens por página)
- [ ] Export CSV gera arquivo com todos os itens
- [ ] EcuJobsPage mostra coluna "Financeiro" só quando amount_charged_by_matrix != null
- [ ] CobrancasEcuTab (matrix view) tem 3 cards no topo
- [ ] FranquiasTab mostra BadgeStatusFinanceiro na tabela expandida
- [ ] Estado vazio: "Nenhuma fatura em aberto ✓" quando não há débitos
