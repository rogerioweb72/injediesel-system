# Financeiro — Aba Franquias + Conta Corrente por Unidade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Franquias" no Financeiro com conta corrente por unidade franqueada (saldo devedor, pagamento em lote, badge de alerta) e aba "Cobranças ECU" no perfil de cada franquia.

**Architecture:** FinanceiroPage converte para sistema de abas (Radix Tabs); conteúdo existente vai intacto para aba "Em Aberto"; nova aba "Franquias" usa accordion por unidade com polling de 60s; pagamento em lote cria registro em `financeiro_pagamentos` e marca jobs como pagos atomicamente.

**Tech Stack:** React 19, TypeScript, Radix UI Tabs, TanStack Query v5, Supabase JS v2, Sonner toasts, Tailwind CSS + CSS vars `hsl(var(--pm-gray-*))`.

---

## Mapa de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| CRIAR | `supabase/migrations/070_financeiro_franquias.sql` | Campos de pagamento em ecu_jobs, tabela financeiro_pagamentos, view vw_saldo_franquias |
| CRIAR | `src/hooks/useFranquiasFinanceiro.ts` | Todos os hooks de dados desta feature |
| CRIAR | `src/pages/app/financeiro/FranquiasTab.tsx` | Componente completo da aba Franquias |
| CRIAR | `src/pages/app/franqueados/CobrancasEcuTab.tsx` | Componente completo da aba Cobranças ECU |
| EDITAR | `src/pages/app/financeiro/FinanceiroPage.tsx` | Adicionar sistema de abas Radix Tabs |
| EDITAR | `src/pages/app/franqueados/FranchiseeDetail.tsx` | Adicionar aba Cobranças ECU |

---

## Task 1: Migration de Banco de Dados

**Files:**
- Create: `supabase/migrations/070_financeiro_franquias.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/070_financeiro_franquias.sql

-- 1. Campos de controle de pagamento matriz em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS matrix_payment_status TEXT NOT NULL DEFAULT 'em_aberto'
    CHECK (matrix_payment_status IN ('em_aberto', 'pago')),
  ADD COLUMN IF NOT EXISTS matrix_paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matrix_paid_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS matrix_payment_id     UUID;

-- 2. Tabela de eventos de pagamento
CREATE TABLE IF NOT EXISTS public.financeiro_pagamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES public.franchise_units(id),
  realizado_por UUID NOT NULL REFERENCES auth.users(id),
  realizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_valor   NUMERIC(12,2) NOT NULL,
  qtd_arquivos  INTEGER NOT NULL,
  observacao    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. FK de ecu_jobs → financeiro_pagamentos
ALTER TABLE public.ecu_jobs
  ADD CONSTRAINT IF NOT EXISTS fk_matrix_payment_id
  FOREIGN KEY (matrix_payment_id) REFERENCES public.financeiro_pagamentos(id);

-- 4. RLS em financeiro_pagamentos
ALTER TABLE public.financeiro_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "matrix_read_pagamentos"
  ON public.financeiro_pagamentos FOR SELECT
  USING (is_matrix_user());

CREATE POLICY IF NOT EXISTS "matrix_insert_pagamentos"
  ON public.financeiro_pagamentos FOR INSERT
  WITH CHECK (is_matrix_user());

-- 5. Índice para queries de saldo
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_matrix_payment
  ON public.ecu_jobs(unit_id, matrix_payment_status)
  WHERE matrix_payment_status = 'em_aberto';

-- 6. View de saldo por unidade (base do polling)
CREATE OR REPLACE VIEW public.vw_saldo_franquias AS
SELECT
  fu.id                              AS unit_id,
  fu.name                            AS nome,
  fu.city                            AS cidade,
  fu.state                           AS uf,
  COUNT(j.id)::INTEGER               AS qtd_abertos,
  COALESCE(SUM(j.amount_charged_by_matrix), 0)::NUMERIC(12,2) AS total_em_aberto,
  MIN(j.created_at)                  AS data_mais_antiga
FROM public.franchise_units fu
JOIN public.ecu_jobs j ON j.unit_id = fu.id
WHERE j.matrix_payment_status = 'em_aberto'
  AND j.amount_charged_by_matrix IS NOT NULL
GROUP BY fu.id, fu.name, fu.city, fu.state
HAVING SUM(j.amount_charged_by_matrix) > 0;

-- Grant leitura da view para roles autenticados (RLS de ecu_jobs já protege)
GRANT SELECT ON public.vw_saldo_franquias TO authenticated;
GRANT SELECT ON public.financeiro_pagamentos TO authenticated;
```

- [ ] **Step 2: Aplicar migration**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
supabase db push
```

Esperado: `Applying migration 070_financeiro_franquias.sql... done`

- [ ] **Step 3: Verificar no Supabase Dashboard**

Acesse Table Editor → confirme que `ecu_jobs` tem coluna `matrix_payment_status` e que tabela `financeiro_pagamentos` existe.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/070_financeiro_franquias.sql
git commit -m "feat(db): migration 070 — financeiro_pagamentos, matrix_payment_status, vw_saldo_franquias"
```

---

## Task 2: Hook useFranquiasFinanceiro.ts

**Files:**
- Create: `src/hooks/useFranquiasFinanceiro.ts`

- [ ] **Step 1: Criar arquivo com todos os tipos e hooks**

```typescript
// src/hooks/useFranquiasFinanceiro.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SaldoFranquia {
  unit_id: string
  nome: string
  cidade: string | null
  uf: string | null
  qtd_abertos: number
  total_em_aberto: number
  data_mais_antiga: string
}

export interface FranchiseEcuJob {
  id: string
  unit_id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
}

export interface FinanceiroPagamento {
  id: string
  unit_id: string
  realizado_em: string
  total_valor: number
  qtd_arquivos: number
  observacao: string | null
  profiles: { name: string } | null
  ecu_jobs: { id: string; service_type: string; amount_charged_by_matrix: number }[]
}

export interface CobrancaEcuItem {
  id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number | null
  matrix_payment_status: 'em_aberto' | 'pago'
  matrix_paid_at: string | null
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
}

// ── Saldo por unidade (polling 60s) ───────────────────────────────────────────

export function useSaldoFranquias() {
  return useQuery({
    queryKey: ['saldo-franquias'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('vw_saldo_franquias')
        .select('*')
        .order('total_em_aberto', { ascending: false })
      if (error) throw error
      return (data ?? []) as SaldoFranquia[]
    },
    refetchInterval: 60_000,
  })
}

// ── Jobs em aberto de uma unidade ─────────────────────────────────────────────

export function useFranchiseOpenJobs(unitId: string) {
  return useQuery({
    queryKey: ['franchise-open-jobs', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select('id, unit_id, service_type, created_at, amount_charged_by_matrix, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'em_aberto')
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FranchiseEcuJob[]
    },
  })
}

// ── Badge: count de jobs novos desde última visita ────────────────────────────

const LS_KEY = 'franquias_last_seen'

export function getLastSeen(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString()
}

export function markFranchiseTabSeen() {
  localStorage.setItem(LS_KEY, new Date().toISOString())
}

export function useUnseenFranchiseCount() {
  const { data: saldos = [] } = useSaldoFranquias()
  const lastSeen = getLastSeen()
  // Conta unidades com data_mais_antiga > last_seen (proxy: nova atividade)
  return saldos.filter((s) => s.data_mais_antiga > lastSeen).length
}

// ── Mutation: quitar N jobs de uma unidade ────────────────────────────────────

interface PayJobsPayload {
  unitId: string
  unitNome: string
  jobIds: string[]
  totalValor: number
  observacao?: string
}

export function usePayFranchiseJobs() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ unitId, jobIds, totalValor, observacao }: PayJobsPayload) => {
      // 1. Cria registro de pagamento
      const { data: pagamento, error: errPag } = await sb()
        .from('financeiro_pagamentos')
        .insert({
          unit_id:       unitId,
          realizado_por: user!.id,
          total_valor:   totalValor,
          qtd_arquivos:  jobIds.length,
          observacao:    observacao ?? null,
        })
        .select('id')
        .single()
      if (errPag) throw errPag

      // 2. Marca todos os jobs como pagos
      const { error: errJobs } = await sb()
        .from('ecu_jobs')
        .update({
          matrix_payment_status: 'pago',
          matrix_paid_at:        new Date().toISOString(),
          matrix_paid_by:        user!.id,
          matrix_payment_id:     pagamento.id,
        })
        .in('id', jobIds)
      if (errJobs) throw errJobs

      return pagamento.id as string
    },
    onSuccess: (_pagId, vars) => {
      qc.invalidateQueries({ queryKey: ['saldo-franquias'] })
      qc.invalidateQueries({ queryKey: ['franchise-open-jobs', vars.unitId] })
      qc.invalidateQueries({ queryKey: ['franchise-job-history', vars.unitId] })
      toast.success(
        `${vars.jobIds.length} arquivo${vars.jobIds.length > 1 ? 's' : ''} quitado${vars.jobIds.length > 1 ? 's' : ''} — ${fmtBRL(vars.totalValor)} registrados para ${vars.unitNome}`
      )
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  })
}

// ── Histórico de cobranças por unidade (CobrancasEcuTab) ──────────────────────

export function useFranchiseJobHistory(
  unitId: string,
  filters: { status: 'todos' | 'em_aberto' | 'pago'; mes?: string }
) {
  return useQuery({
    queryKey: ['franchise-job-history', unitId, filters],
    enabled: !!unitId,
    queryFn: async () => {
      let query = sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: false })

      if (filters.status !== 'todos') {
        query = query.eq('matrix_payment_status', filters.status)
      }
      if (filters.mes) {
        const [ano, mes] = filters.mes.split('-')
        const inicio = `${ano}-${mes}-01`
        const fimDate = new Date(Number(ano), Number(mes), 0)
        const fim = fimDate.toISOString().split('T')[0]
        query = query.gte('created_at', inicio).lte('created_at', fim + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as CobrancaEcuItem[]
    },
  })
}

// ── Utilitário ────────────────────────────────────────────────────────────────

export function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function diasEmAberto(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros relacionados a `useFranquiasFinanceiro.ts`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFranquiasFinanceiro.ts
git commit -m "feat(hooks): useFranquiasFinanceiro — saldo, jobs em aberto, pagamento, histórico, badge"
```

---

## Task 3: FranquiasTab.tsx

**Files:**
- Create: `src/pages/app/financeiro/FranquiasTab.tsx`

- [ ] **Step 1: Criar componente FranquiasTab**

```tsx
// src/pages/app/financeiro/FranquiasTab.tsx
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, Building2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useSaldoFranquias, useFranchiseOpenJobs, usePayFranchiseJobs, markFranchiseTabSeen,
  fmtBRL, diasEmAberto, type SaldoFranquia, type FranchiseEcuJob,
} from '@/hooks/useFranquiasFinanceiro'
import { useEffect } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────────

function diasColor(dias: number) {
  if (dias > 15) return '#F87171'
  if (dias >= 5) return '#FBBF24'
  return 'hsl(var(--pm-gray-400))'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function exportCSV(jobs: FranchiseEcuJob[], nomeUnidade: string) {
  const header = 'Arquivo,Tipo,Cliente,Veículo,Data Envio,Valor'
  const rows = jobs.map((j) => {
    const veiculo = j.vehicles
      ? `${j.vehicles.brand} ${j.vehicles.model}`
      : [j.vehicle_info?.marca, j.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
    return [
      j.id.slice(0, 8).toUpperCase(),
      j.service_type,
      j.customers?.name ?? '—',
      veiculo,
      fmtDate(j.created_at),
      j.amount_charged_by_matrix.toFixed(2).replace('.', ','),
    ].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cobrancas-${nomeUnidade.replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── FranchiseCard (accordion) ─────────────────────────────────────────────────

function FranchiseCard({ saldo, searchQ }: { saldo: SaldoFranquia; searchQ: string }) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payOpen, setPayOpen] = useState(false)
  const [obs, setObs] = useState('')

  const { data: jobs = [], isLoading } = useFranchiseOpenJobs(expanded ? saldo.unit_id : '')
  const pay = usePayFranchiseJobs()

  const diasAntigo = diasEmAberto(saldo.data_mais_antiga)
  const cor = diasColor(diasAntigo)

  const selectedJobs = jobs.filter((j) => selected.has(j.id))
  const selectedTotal = selectedJobs.reduce((s, j) => s + j.amount_charged_by_matrix, 0)

  function toggleAll() {
    if (selected.size === jobs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(jobs.map((j) => j.id)))
    }
  }

  function toggleJob(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handlePay() {
    await pay.mutateAsync({
      unitId: saldo.unit_id,
      unitNome: saldo.nome,
      jobIds: [...selected],
      totalValor: selectedTotal,
      observacao: obs.trim() || undefined,
    })
    setPayOpen(false)
    setSelected(new Set())
    setObs('')
  }

  // Filtra busca no nome/cidade
  const nomeCompleto = `${saldo.nome} ${saldo.cidade ?? ''} ${saldo.uf ?? ''}`.toLowerCase()
  if (searchQ && !nomeCompleto.includes(searchQ.toLowerCase())) return null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header do card */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Building2 size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{saldo.nome}</p>
          <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {saldo.cidade ?? '—'}/{saldo.uf ?? '—'} · {saldo.qtd_abertos} arquivo{saldo.qtd_abertos !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0 mr-3">
          <p className="text-sm font-bold text-white">{fmtBRL(saldo.total_em_aberto)}</p>
          <p className="text-[11px] font-medium" style={{ color: cor }}>
            {diasAntigo > 0 ? `há ${diasAntigo}d em aberto` : 'hoje'}
          </p>
        </div>
        {expanded ? <ChevronUp size={15} style={{ color: 'hsl(var(--pm-gray-500))' }} /> : <ChevronDown size={15} style={{ color: 'hsl(var(--pm-gray-500))' }} />}
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-sm py-6" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhum arquivo em aberto</p>
          ) : (
            <>
              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['', 'Arquivo', 'Tipo', 'Veículo', 'Data', 'Valor', 'Dias'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-600))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const dias = diasEmAberto(job.created_at)
                      const veiculo = job.vehicles
                        ? `${job.vehicles.brand} ${job.vehicles.model}`
                        : [job.vehicle_info?.marca, job.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
                      return (
                        <tr
                          key={job.id}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                          onClick={() => toggleJob(job.id)}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selected.has(job.id)}
                              onChange={() => toggleJob(job.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="accent-red-500"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-white">{job.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-300))' }}>{job.service_type}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>{veiculo}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{fmtDate(job.created_at)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-white">{fmtBRL(job.amount_charged_by_matrix)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: diasColor(dias) }}>{dias}d</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAll}
                    className="text-xs underline underline-offset-2"
                    style={{ color: 'hsl(var(--pm-gray-500))' }}
                  >
                    {selected.size === jobs.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  {selected.size > 0 && (
                    <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                      {selected.size} selecionado{selected.size > 1 ? 's' : ''} — {fmtBRL(selectedTotal)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV(jobs, saldo.nome)}
                    className="gap-1.5 text-xs"
                  >
                    <Download size={12} /> Exportar CSV
                  </Button>
                  <Button
                    size="sm"
                    disabled={selected.size === 0}
                    onClick={() => setPayOpen(true)}
                    style={{ background: selected.size > 0 ? 'hsl(var(--pm-red-500))' : undefined }}
                    className="gap-1.5 text-xs text-white border-0"
                  >
                    Pagar Selecionados
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de confirmação de pagamento */}
      <Dialog open={payOpen} onOpenChange={(v) => !v && setPayOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Unidade: <span className="text-foreground font-semibold">{saldo.nome}</span>
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedJobs.map((j, i) => (
                <div key={j.id} className="flex justify-between items-center px-3 py-2 text-xs" style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'hsl(var(--pm-gray-400))' }}>{j.service_type}</span>
                  <span className="font-semibold text-white">{fmtBRL(j.amount_charged_by_matrix)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-2.5 text-sm font-bold" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: 'hsl(var(--pm-gray-300))' }}>Total</span>
                <span className="text-white">{fmtBRL(selectedTotal)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>Observação (opcional)</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Ex: Pix ref. maio/2026"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
                style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--pm-gray-200))', '--tw-ring-color': 'hsl(var(--pm-red-500))' } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={pay.isPending}>Cancelar</Button>
              <Button
                onClick={handlePay}
                disabled={pay.isPending}
                style={{ background: 'hsl(var(--pm-red-500))' }}
                className="text-white border-0 min-w-[100px]"
              >
                {pay.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── FranquiasTab (exportado) ───────────────────────────────────────────────────

export default function FranquiasTab() {
  const { data: saldos = [], isLoading } = useSaldoFranquias()
  const [searchQ, setSearchQ] = useState('')
  const [onlyAtrasado, setOnlyAtrasado] = useState(false)

  // Marca aba como vista ao montar
  useEffect(() => { markFranchiseTabSeen() }, [])

  const filtrados = useMemo(() => {
    return saldos.filter((s) => {
      if (onlyAtrasado && diasEmAberto(s.data_mais_antiga) <= 15) return false
      return true
    })
  }, [saldos, onlyAtrasado])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar unidade ou cidade..."
          className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-1"
          style={{
            background: 'hsl(var(--pm-gray-800))',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'hsl(var(--pm-gray-200))',
          }}
        />
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'hsl(var(--pm-gray-400))' }}>
          <input
            type="checkbox"
            checked={onlyAtrasado}
            onChange={(e) => setOnlyAtrasado(e.target.checked)}
            className="accent-red-500"
          />
          Atraso &gt; 15 dias
        </label>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <CheckCircle2 size={32} style={{ color: 'hsl(var(--pm-gray-700))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>
            Nenhuma unidade com saldo em aberto 🎉
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((s) => (
            <FranchiseCard key={s.unit_id} saldo={s} searchQ={searchQ} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "FranquiasTab\|useFranquias" | head -10
```

Esperado: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/financeiro/FranquiasTab.tsx
git commit -m "feat(ui): FranquiasTab — accordion por unidade, pagamento em lote, export CSV"
```

---

## Task 4: FinanceiroPage.tsx — Sistema de Abas

**Files:**
- Modify: `src/pages/app/financeiro/FinanceiroPage.tsx`

- [ ] **Step 1: Adicionar imports e wrapper de abas**

Substitua o conteúdo atual do `FinanceiroPage.tsx` com a versão com abas. O conteúdo existente (seções Em Aberto, Inter-Franquias, Lançamentos) vai intacto para dentro das abas correspondentes.

Adicione ao topo do arquivo (após imports existentes):

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FranquiasTab from '@/pages/app/financeiro/FranquiasTab'
import { useUnseenFranchiseCount } from '@/hooks/useFranquiasFinanceiro'
```

- [ ] **Step 2: Substituir o return do FinanceiroPage**

Encontre o `return (` em `FinanceiroPage` e substitua todo o JSX pelo wrapper de abas:

```tsx
return (
  <div className="space-y-6 w-full">
    <PageHeader title="Financeiro" subtitle="Caixa e lançamentos da matriz" />

    <Tabs defaultValue="em-aberto" className="w-full">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <TabsList className="h-9" style={{ background: 'hsl(var(--pm-gray-900))' }}>
          <TabsTrigger value="em-aberto" className="text-xs px-3">Em Aberto</TabsTrigger>
          <TabsTrigger value="franquias" className="text-xs px-3 relative">
            Franquias
            {unseenCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}>
                {unseenCount > 9 ? '9+' : unseenCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inter-franquias" className="text-xs px-3">Inter-Franquias</TabsTrigger>
          <TabsTrigger value="lancamentos" className="text-xs px-3">Lançamentos</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs px-3" disabled>Histórico</TabsTrigger>
        </TabsList>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#2563EB' }}
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Summary cards — aparecem em todas as abas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Saldo do Período" value={resumo.saldo} icon={Scale}
          color={resumo.saldo >= 0 ? '#4ADE80' : '#F87171'}
          bg={resumo.saldo >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'} />
        <SummaryCard label="Total Receitas" value={resumo.receitas} icon={TrendingUp} color="#4ADE80" bg="rgba(74,222,128,0.1)" />
        <SummaryCard label="Total Despesas" value={resumo.despesas} icon={TrendingDown} color="#F87171" bg="rgba(248,113,113,0.1)" />
      </div>

      {/* ── ABA: Em Aberto ── */}
      <TabsContent value="em-aberto" className="space-y-6 mt-0">
        {/* COLE AQUI o conteúdo das seções "Em Aberto — ECU diretos + pedidos" e
            "Cobranças ECU Pendentes" e "Serviços ECU Realizados" sem modificar */}
      </TabsContent>

      {/* ── ABA: Franquias ── */}
      <TabsContent value="franquias" className="mt-0">
        <FranquiasTab />
      </TabsContent>

      {/* ── ABA: Inter-Franquias ── */}
      <TabsContent value="inter-franquias" className="space-y-6 mt-0">
        {/* COLE AQUI o conteúdo da seção "Faturamento Inter-Franquias" sem modificar */}
      </TabsContent>

      {/* ── ABA: Lançamentos ── */}
      <TabsContent value="lancamentos" className="space-y-6 mt-0">
        {/* COLE AQUI o conteúdo da seção "Lançamentos Manuais" sem modificar */}
      </TabsContent>

      {/* ── ABA: Histórico (placeholder) ── */}
      <TabsContent value="historico" className="mt-0">
        <div className="flex items-center justify-center py-16 rounded-xl"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Em breve — histórico de pagamentos</p>
        </div>
      </TabsContent>
    </Tabs>

    {selected && (
      <EcuPaymentSheet payment={selected} maxDiscountPct={maxDiscountPct} onClose={() => setSelected(null)} />
    )}
    {modalOpen && (
      <NovoLancamentoModal unitId={unitId} onClose={() => setModalOpen(false)} />
    )}
  </div>
)
```

- [ ] **Step 3: Adicionar hook unseenCount no componente**

Dentro de `FinanceiroPage`, logo após as declarações de hooks existentes, adicione:

```typescript
const unseenCount = useUnseenFranchiseCount()
```

- [ ] **Step 4: Build para verificar**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -5
```

Esperado: `✓ built in Xs` sem erros

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/financeiro/FinanceiroPage.tsx
git commit -m "feat(ui): FinanceiroPage — sistema de abas Radix Tabs, aba Franquias integrada"
```

---

## Task 5: CobrancasEcuTab.tsx

**Files:**
- Create: `src/pages/app/franqueados/CobrancasEcuTab.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/pages/app/franqueados/CobrancasEcuTab.tsx
import { useState, useMemo } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useFranchiseJobHistory, fmtBRL, diasEmAberto,
  type CobrancaEcuItem,
} from '@/hooks/useFranquiasFinanceiro'

type StatusFilter = 'todos' | 'em_aberto' | 'pago'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }: { status: 'em_aberto' | 'pago' }) {
  return status === 'pago' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>Pago</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>Em Aberto</span>
  )
}

function exportCSV(items: CobrancaEcuItem[], unitName: string) {
  const header = 'Arquivo,Tipo,Cliente,Veículo,Data Envio,Valor,Status,Pago em'
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
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
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

      {/* Tabela */}
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
        <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Arquivo', 'Tipo', 'Veículo', 'Data Envio', 'Valor', 'Status', 'Pago em'].map((h) => (
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
                      <td className="px-4 py-3"><StatusBadge status={item.matrix_payment_status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        {item.matrix_paid_at ? fmtDate(item.matrix_paid_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé com totais */}
          <div className="flex flex-wrap items-center gap-6 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/app/franqueados/CobrancasEcuTab.tsx
git commit -m "feat(ui): CobrancasEcuTab — extrato de cobranças ECU por unidade"
```

---

## Task 6: FranchiseeDetail.tsx — Aba Cobranças ECU

**Files:**
- Modify: `src/pages/app/franqueados/FranchiseeDetail.tsx`

- [ ] **Step 1: Adicionar imports**

No topo de `FranchiseeDetail.tsx`, adicione:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CobrancasEcuTab from '@/pages/app/franqueados/CobrancasEcuTab'
```

- [ ] **Step 2: Envolver conteúdo em tabs**

Localize o JSX de retorno. Encontre onde começa o conteúdo principal (após o `<PageHeader>` e botões de ação) e envolva-o em:

```tsx
<Tabs defaultValue="dados" className="w-full mt-6">
  <TabsList style={{ background: 'hsl(var(--pm-gray-900))' }}>
    <TabsTrigger value="dados" className="text-xs px-4">Dados da Unidade</TabsTrigger>
    <TabsTrigger value="cobrancas" className="text-xs px-4">Cobranças ECU</TabsTrigger>
  </TabsList>

  <TabsContent value="dados" className="mt-4">
    {/* TODO: mova aqui todo o conteúdo existente do FranchiseeDetail (grid de info, seções, etc.) */}
  </TabsContent>

  <TabsContent value="cobrancas" className="mt-4">
    <CobrancasEcuTab unitId={id ?? ''} unitName={unit?.name ?? ''} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: Build final**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

Esperado: `✓ built in Xs` sem erros TypeScript

- [ ] **Step 4: Commit + Push**

```bash
git add src/pages/app/franqueados/FranchiseeDetail.tsx
git commit -m "feat(ui): FranchiseeDetail — aba Cobranças ECU integrada"
git push origin main
```

---

## Verificação Final

- [ ] FinanceiroPage abre na aba "Em Aberto" (conteúdo existente intacto)
- [ ] Aba "Franquias" mostra badge com count se há jobs novos
- [ ] Badge some ao clicar na aba Franquias
- [ ] Cards de unidade aparecem ordenados por maior saldo
- [ ] Accordion expande/fecha corretamente
- [ ] Checkbox "selecionar todos" funciona
- [ ] Botão "Pagar Selecionados" desabilitado sem seleção
- [ ] Modal de pagamento confirma e remove itens pagos com fade
- [ ] Card some da lista se saldo zerar
- [ ] Toast aparece após pagamento
- [ ] Export CSV gera arquivo válido
- [ ] FranchiseeDetail tem aba "Cobranças ECU" funcional
- [ ] Filtros de status e mês funcionam em CobrancasEcuTab
- [ ] Totais do rodapé somam corretamente
