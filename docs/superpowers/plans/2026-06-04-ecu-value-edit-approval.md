# Edição de Valor ECU com Auditoria e Aprovação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que operadores da matriz solicitem edição de `amount_charged_by_matrix` em jobs ECU com `matrix_payment_status='em_aberto'`, com registro de auditoria e aprovação obrigatória pelo financeiro antes de aplicar o novo valor.

**Architecture:** Migration 073 cria `historico_edicoes_valor` + 2 colunas em `ecu_jobs`. Hook `useEcuValueEdit.ts` gerencia request/approve/reject. Modal `EcuValueEditModal.tsx` captura novo valor + motivo. EcuJobDetail ganha ícone lápis e seção histórico. FinanceiroPage ganha card "Edições Pendentes" na aba Em Aberto.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Supabase JS v2, Sonner toasts, Radix Dialog.

**Mapeamento spec → codebase:**
- `arquivos_ecu` → `ecu_jobs`
- `valor_cobrado` → `amount_charged_by_matrix`
- `status_pagamento = 'EM_ABERTO'` → `matrix_payment_status = 'em_aberto'`

---

## Mapa de Arquivos

| Ação | Arquivo |
|------|---------|
| CREATE | `supabase/migrations/073_ecu_value_edit_history.sql` |
| MODIFY | `src/hooks/useEcuJobs.ts` — adicionar campos ao tipo EcuJob |
| CREATE | `src/hooks/useEcuValueEdit.ts` |
| CREATE | `src/pages/app/arquivos/EcuValueEditModal.tsx` |
| MODIFY | `src/pages/app/arquivos/EcuJobDetail.tsx` — ícone lápis + seção histórico |
| MODIFY | `src/pages/app/financeiro/FinanceiroPage.tsx` — card Edições Pendentes |

---

## Task 1: Migration 073

**Files:**
- Create: `supabase/migrations/073_ecu_value_edit_history.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/073_ecu_value_edit_history.sql

-- 1. Tabela de auditoria de edições de valor
CREATE TABLE IF NOT EXISTS public.historico_edicoes_valor (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  arquivo_id       UUID NOT NULL REFERENCES public.ecu_jobs(id) ON DELETE CASCADE,
  valor_anterior   NUMERIC(12,2) NOT NULL,
  valor_novo       NUMERIC(12,2) NOT NULL,
  motivo           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'AGUARDANDO_APROVACAO'
    CHECK (status IN ('AGUARDANDO_APROVACAO', 'APROVADO', 'RECUSADO', 'CANCELADO_PAGAMENTO')),
  solicitado_por   UUID NOT NULL REFERENCES auth.users(id),
  solicitado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_por     UUID REFERENCES auth.users(id),
  aprovado_em      TIMESTAMPTZ,
  motivo_recusa    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS: apenas matriz (is_matrix_user é função existente no projeto)
ALTER TABLE public.historico_edicoes_valor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matriz_all_hev" ON public.historico_edicoes_valor
  FOR ALL USING (is_matrix_user());

-- 3. Colunas de controle em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS edicao_valor_pendente     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edicao_valor_historico_id UUID REFERENCES public.historico_edicoes_valor(id);

-- 4. Índice parcial para o painel do financeiro
CREATE INDEX IF NOT EXISTS idx_historico_edicoes_pendentes
  ON public.historico_edicoes_valor(solicitado_em)
  WHERE status = 'AGUARDANDO_APROVACAO';
```

- [ ] **Step 2: Aplicar**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
supabase db push 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/073_ecu_value_edit_history.sql
git commit -m "feat(db): migration 073 — historico_edicoes_valor + flags em ecu_jobs"
```

---

## Task 2: useEcuJobs.ts + useEcuValueEdit.ts

**Files:**
- Modify: `src/hooks/useEcuJobs.ts`
- Create: `src/hooks/useEcuValueEdit.ts`

- [ ] **Step 1: Adicionar campos ao tipo EcuJob em useEcuJobs.ts**

Ler o arquivo. Localizar `interface EcuJob`. Após `matrix_paid_at: string | null`, adicionar:

```typescript
  edicao_valor_pendente: boolean
  edicao_valor_historico_id: string | null
```

- [ ] **Step 2: Criar useEcuValueEdit.ts**

```typescript
// src/hooks/useEcuValueEdit.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface HistoricoEdicaoValor {
  id: string
  arquivo_id: string
  valor_anterior: number
  valor_novo: number
  motivo: string
  status: 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO_PAGAMENTO'
  solicitado_em: string
  aprovado_em: string | null
  motivo_recusa: string | null
  solicitado_profile: { name: string } | null
  aprovado_profile: { name: string } | null
  ecu_jobs: {
    id: string
    service_type: string
    franchise_units: { name: string; city: string | null; state: string | null } | null
  } | null
}

// ── Lista pendentes (para o financeiro) ───────────────────────────────────────

export function usePendingValueEdits() {
  return useQuery({
    queryKey: ['pending-value-edits'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('historico_edicoes_valor')
        .select(`
          id, arquivo_id, valor_anterior, valor_novo, motivo, status, solicitado_em,
          aprovado_em, motivo_recusa,
          solicitado_profile:profiles!solicitado_por(name),
          ecu_jobs(id, service_type, franchise_units(name, city, state))
        `)
        .eq('status', 'AGUARDANDO_APROVACAO')
        .order('solicitado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as HistoricoEdicaoValor[]
    },
    refetchInterval: 30_000,
  })
}

// ── Histórico de um arquivo específico ────────────────────────────────────────

export function useJobValueEditHistory(jobId: string) {
  return useQuery({
    queryKey: ['value-edit-history', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('historico_edicoes_valor')
        .select(`
          id, valor_anterior, valor_novo, motivo, status, solicitado_em,
          aprovado_em, motivo_recusa,
          solicitado_profile:profiles!solicitado_por(name),
          aprovado_profile:profiles!aprovado_por(name)
        `)
        .eq('arquivo_id', jobId)
        .order('solicitado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as HistoricoEdicaoValor[]
    },
  })
}

// ── Solicitar edição de valor ─────────────────────────────────────────────────

export function useRequestValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      jobId, valorAnterior, valorNovo, motivo,
    }: {
      jobId: string; valorAnterior: number; valorNovo: number; motivo: string
    }) => {
      // Inserir no histórico
      const { data: historico, error: errH } = await sb()
        .from('historico_edicoes_valor')
        .insert({
          arquivo_id:    jobId,
          tenant_id:     '00000000-0000-0000-0000-000000000000', // placeholder — RLS usa função
          valor_anterior: valorAnterior,
          valor_novo:     valorNovo,
          motivo,
          solicitado_por: user!.id,
        })
        .select('id')
        .single()
      if (errH) throw errH

      // Marcar flag no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({
          edicao_valor_pendente:     true,
          edicao_valor_historico_id: historico.id,
        })
        .eq('id', jobId)
      if (errJ) throw errJ

      return historico.id as string
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      toast.success('Solicitação enviada. Aguardando aprovação do financeiro.')
    },
    onError: () => toast.error('Erro ao solicitar edição de valor'),
  })
}

// ── Aprovar edição ────────────────────────────────────────────────────────────

export function useApproveValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ historicoId, jobId, valorNovo }: { historicoId: string; jobId: string; valorNovo: number }) => {
      // Aplica novo valor no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({
          amount_charged_by_matrix:  valorNovo,
          edicao_valor_pendente:      false,
          edicao_valor_historico_id:  null,
          updated_at:                 new Date().toISOString(),
        })
        .eq('id', jobId)
      if (errJ) throw errJ

      // Atualiza histórico
      const { error: errH } = await sb()
        .from('historico_edicoes_valor')
        .update({ status: 'APROVADO', aprovado_por: user!.id, aprovado_em: new Date().toISOString() })
        .eq('id', historicoId)
      if (errH) throw errH
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['saldo-franquias'] })
      toast.success('Alteração aprovada. Novo valor aplicado.')
    },
    onError: () => toast.error('Erro ao aprovar edição'),
  })
}

// ── Recusar edição ────────────────────────────────────────────────────────────

export function useRejectValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ historicoId, jobId, motivoRecusa }: { historicoId: string; jobId: string; motivoRecusa: string }) => {
      // Reverte flag no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({ edicao_valor_pendente: false, edicao_valor_historico_id: null })
        .eq('id', jobId)
      if (errJ) throw errJ

      // Registra recusa
      const { error: errH } = await sb()
        .from('historico_edicoes_valor')
        .update({
          status: 'RECUSADO',
          motivo_recusa: motivoRecusa,
          aprovado_por:  user!.id,
          aprovado_em:   new Date().toISOString(),
        })
        .eq('id', historicoId)
      if (errH) throw errH
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      toast.success('Edição recusada. Valor original mantido.')
    },
    onError: () => toast.error('Erro ao recusar edição'),
  })
}

export function fmtDiff(anterior: number, novo: number): string {
  const diff = novo - anterior
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
}
```

- [ ] **Step 3: Verificar TS**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep -E "useEcuValueEdit|useEcuJobs" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEcuJobs.ts src/hooks/useEcuValueEdit.ts
git commit -m "feat(hooks): useEcuValueEdit — solicitar, aprovar e recusar edição de valor ECU"
```

---

## Task 3: EcuValueEditModal.tsx

**Files:**
- Create: `src/pages/app/arquivos/EcuValueEditModal.tsx`

- [ ] **Step 1: Criar o modal**

```tsx
// src/pages/app/arquivos/EcuValueEditModal.tsx
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRequestValueEdit } from '@/hooks/useEcuValueEdit'

const CHIPS = [
  'Erro de digitação no valor original',
  'Ajuste após renegociação com a unidade',
  'Correção de tipo de serviço aplicado',
  'Outro motivo',
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  jobCode: string
  valorAtual: number
}

export function EcuValueEditModal({ open, onClose, jobId, jobCode, valorAtual }: Props) {
  const [novoValor, setNovoValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const request = useRequestValueEdit()

  const valorNum = parseFloat(novoValor.replace(',', '.'))
  const valorValido = !isNaN(valorNum) && valorNum > 0 && valorNum !== valorAtual
  const motivoValido = motivo.trim().length >= 20
  const canSubmit = valorValido && motivoValido && !request.isPending

  function handleClose() {
    if (request.isPending) return
    setNovoValor('')
    setMotivo('')
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    await request.mutateAsync({
      jobId,
      valorAnterior: valorAtual,
      valorNovo:     valorNum,
      motivo:        motivo.trim(),
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar valor do arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Identificação */}
          <p className="text-xs font-mono" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            {jobCode}
          </p>

          {/* Aviso */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#FBBF24' }}>
              Este arquivo já foi enviado para a franquia/cliente.
              A alteração de valor exige aprovação do financeiro.
            </p>
          </div>

          {/* Valor atual */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor atual</p>
            <p className="text-sm font-semibold" style={{ color: '#F87171' }}>{fmtBRL(valorAtual)}</p>
          </div>

          {/* Novo valor */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Novo valor <span style={{ color: '#F87171' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(var(--pm-gray-200))',
                '--tw-ring-color': 'hsl(var(--pm-red-500))',
              } as React.CSSProperties}
            />
            {novoValor && !isNaN(valorNum) && valorNum === valorAtual && (
              <p className="text-[11px] mt-1" style={{ color: '#F87171' }}>
                O novo valor deve ser diferente do valor atual.
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Motivo da edição <span style={{ color: '#F87171' }}>*</span>
              <span className="ml-2" style={{ color: motivo.trim().length >= 20 ? '#4ADE80' : 'hsl(var(--pm-gray-600))' }}>
                ({motivo.trim().length}/20 mín.)
              </span>
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                background: 'hsl(var(--pm-gray-800))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(var(--pm-gray-200))',
              } as React.CSSProperties}
            />
            {/* Chips de sugestão */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMotivo(chip)}
                  className="px-2 py-0.5 rounded-full text-[11px] transition-colors"
                  style={{
                    background: motivo === chip ? 'hsl(var(--pm-red-500)/0.2)' : 'hsl(var(--pm-gray-800))',
                    color: motivo === chip ? '#fff' : 'hsl(var(--pm-gray-400))',
                    border: `1px solid ${motivo === chip ? 'hsl(var(--pm-red-500)/0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={request.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ background: canSubmit ? 'hsl(var(--pm-red-500))' : undefined }}
              className="text-white border-0 min-w-[140px]"
            >
              {request.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : 'Solicitar alteração'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verificar TS + build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep EcuValueEditModal | head -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/arquivos/EcuValueEditModal.tsx
git commit -m "feat(ui): EcuValueEditModal — solicitar edição de valor com motivo"
```

---

## Task 4: EcuJobDetail.tsx — Ícone Lápis + Seção Histórico

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobDetail.tsx`

**Contexto:** Arquivo grande (~790 linhas). Leia antes de editar.

- [ ] **Step 1: Ler seção financeira e área de imports**

```bash
grep -n "import\|amount_charged_by_matrix\|editingPrice\|Informar valor\|formatCurrency\|Pencil\|Edit\|pencil" \
  "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/arquivos/EcuJobDetail.tsx" \
  | head -30
```

- [ ] **Step 2: Adicionar imports**

No topo do arquivo, após imports existentes, adicionar:

```typescript
import { Pencil, Clock } from 'lucide-react'
import { EcuValueEditModal } from '@/pages/app/arquivos/EcuValueEditModal'
import { useJobValueEditHistory } from '@/hooks/useEcuValueEdit'
```

- [ ] **Step 3: Adicionar estado do modal no componente**

Dentro de `EcuJobDetail`, após declarações de estado existentes:

```typescript
const [valueEditOpen, setValueEditOpen] = useState(false)
const { data: editHistory = [] } = useJobValueEditHistory(isMatrixUser() ? (id ?? '') : '')
```

- [ ] **Step 4: Modificar a exibição do campo "Cobrado pela matriz"**

Localizar (em torno da linha 476-480):
```tsx
) : (
  <p className="text-sm font-medium text-red-400">
    {formatCurrency(job.amount_charged_by_matrix)}
  </p>
)}
```

Substituir por:
```tsx
) : (
  <div className="flex items-center gap-2">
    <p className="text-sm font-medium text-red-400">
      {formatCurrency(job.amount_charged_by_matrix)}
    </p>
    {isMatrixUser() && job.matrix_payment_status === 'em_aberto' && (
      job.edicao_valor_pendente ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.3)' }}
          title="Já existe uma alteração pendente de aprovação"
        >
          <Clock size={10} />
          Edição pendente
        </span>
      ) : (
        <button
          onClick={() => setValueEditOpen(true)}
          title="Solicitar edição de valor"
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'hsl(var(--pm-gray-500))' }}
        >
          <Pencil size={12} />
        </button>
      )
    )}
  </div>
)}
```

- [ ] **Step 5: Adicionar seção histórico de edições**

No final do bloco `lg:col-span-2` (seção de arquivos), após o botão "Enviar Arquivo Pronto" (em torno da linha 591), adicionar:

```tsx
{/* Histórico de edições de valor — apenas matriz */}
{isMatrixUser() && editHistory.length > 0 && (
  <div className="space-y-2">
    <div className="pm-accent-line">Histórico de alterações de valor</div>
    <div className="pm-card p-0 divide-y divide-[hsl(var(--pm-gray-700))]">
      {editHistory.map((h) => {
        const statusColor = h.status === 'APROVADO' ? '#4ADE80' : h.status === 'RECUSADO' ? '#F87171' : '#FBBF24'
        const statusLabel = h.status === 'APROVADO' ? 'Aprovado' : h.status === 'RECUSADO' ? 'Recusado' : h.status === 'CANCELADO_PAGAMENTO' ? 'Cancelado' : 'Aguardando'
        const diff = h.valor_novo - h.valor_anterior
        const sign = diff >= 0 ? '+' : ''
        return (
          <div key={h.id} className="p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white">
                  {h.valor_anterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {' → '}
                  {h.valor_novo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: diff >= 0 ? '#4ADE80' : '#F87171' }}>
                  ({sign}{diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                </span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${statusColor}22`, color: statusColor }}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              {h.motivo}
            </p>
            <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>
              Solicitado por {(h.solicitado_profile as any)?.name ?? '—'} em{' '}
              {new Date(h.solicitado_em).toLocaleString('pt-BR')}
              {h.aprovado_em && (
                <> · {h.status === 'APROVADO' ? 'Aprovado' : 'Recusado'} por {(h.aprovado_profile as any)?.name ?? '—'}</>
              )}
              {h.motivo_recusa && (
                <span style={{ color: '#F87171' }}> · Motivo: {h.motivo_recusa}</span>
              )}
            </p>
          </div>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 6: Adicionar modal no return**

Antes do fechamento `</div>` principal do return, após os outros modals:

```tsx
{valueEditOpen && job.amount_charged_by_matrix != null && (
  <EcuValueEditModal
    open={valueEditOpen}
    onClose={() => setValueEditOpen(false)}
    jobId={job.id}
    jobCode={`#${job.id.slice(0, 8).toUpperCase()}`}
    valorAtual={job.amount_charged_by_matrix}
  />
)}
```

- [ ] **Step 7: Build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

Fix any errors. Build MUST pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/app/arquivos/EcuJobDetail.tsx
git commit -m "feat(ui): EcuJobDetail — ícone edição de valor + badge pendente + seção histórico"
```

---

## Task 5: FinanceiroPage.tsx — Edições Pendentes + Push

**Files:**
- Modify: `src/pages/app/financeiro/FinanceiroPage.tsx`

**Contexto:** O arquivo tem sistema de abas. A seção "Edições de Valor Pendentes" vai na aba "Em Aberto" (value="em-aberto"), ANTES das seções existentes (antes de "Em Aberto — ECU diretos").

- [ ] **Step 1: Ler imports e início da aba em-aberto**

```bash
grep -n "import\|TabsContent.*em-aberto\|Em Aberto\|openJobs\|AlertTriangle" \
  "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/financeiro/FinanceiroPage.tsx" \
  | head -30
```

- [ ] **Step 2: Adicionar imports**

No topo do arquivo, após imports existentes:

```typescript
import { usePendingValueEdits, useApproveValueEdit, useRejectValueEdit, fmtDiff } from '@/hooks/useEcuValueEdit'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
```

- [ ] **Step 3: Adicionar hooks e estado dentro do componente**

Dentro de `FinanceiroPage`, após declarações existentes:

```typescript
const { data: pendingEdits = [] } = usePendingValueEdits()
const approveEdit = useApproveValueEdit()
const rejectEdit  = useRejectValueEdit()

const [approveTarget, setApproveTarget] = useState<{ historicoId: string; jobId: string; valorNovo: number } | null>(null)
const [rejectTarget, setRejectTarget]   = useState<{ historicoId: string; jobId: string } | null>(null)
const [rejectMotivo, setRejectMotivo]   = useState('')
```

- [ ] **Step 4: Adicionar seção "Edições Pendentes" no TabsContent value="em-aberto"**

Localizar a abertura do `<TabsContent value="em-aberto" ...>`. Imediatamente após a abertura da tag (antes do primeiro `{(openJobs.length > 0 || ...`), inserir:

```tsx
{/* Edições de Valor Pendentes */}
{pendingEdits.length > 0 && (
  <section>
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FB923C' }}>
        Edições de Valor Pendentes
      </p>
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C' }}>
        {pendingEdits.length}
      </span>
    </div>
    <div className="space-y-3">
      {pendingEdits.map((edit) => {
        const unit = edit.ecu_jobs?.franchise_units
        const diff = edit.valor_novo - edit.valor_anterior
        return (
          <div key={edit.id} className="rounded-xl p-4 space-y-3"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(251,146,60,0.2)' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-white">
                  #{edit.arquivo_id.slice(0, 8).toUpperCase()}
                  {edit.ecu_jobs?.service_type && (
                    <span className="font-normal text-muted-foreground"> · {edit.ecu_jobs.service_type}</span>
                  )}
                </p>
                {unit && (
                  <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                    {unit.name}{unit.city ? ` — ${unit.city}/${unit.state}` : ''}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  {fmtBRL(edit.valor_anterior)} → <span className="text-white font-semibold">{fmtBRL(edit.valor_novo)}</span>
                </p>
                <p className="text-xs font-semibold" style={{ color: diff >= 0 ? '#4ADE80' : '#F87171' }}>
                  {fmtDiff(edit.valor_anterior, edit.valor_novo)}
                </p>
              </div>
            </div>
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'hsl(var(--pm-gray-400))' }}>
              {edit.motivo}
            </p>
            <p className="text-[11px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>
              Solicitado em {new Date(edit.solicitado_em).toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setApproveTarget({ historicoId: edit.id, jobId: edit.arquivo_id, valorNovo: edit.valor_novo })}
                disabled={approveEdit.isPending || rejectEdit.isPending}
                className="flex-1 text-white border-0 text-xs"
                style={{ background: '#166534' }}
              >
                Estou ciente — Aprovar alteração
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setRejectTarget({ historicoId: edit.id, jobId: edit.arquivo_id }); setRejectMotivo('') }}
                disabled={approveEdit.isPending || rejectEdit.isPending}
                className="text-xs"
                style={{ color: '#F87171' }}
              >
                Recusar
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  </section>
)}
```

**Nota:** `fmtBRL` já existe no arquivo como função local — use a função existente, não importe outra.

- [ ] **Step 5: Adicionar modals de confirmação no final do return**

Antes do `{selected && <EcuPaymentSheet ...` existente, adicionar:

```tsx
{/* Modal: aprovar edição */}
<ConfirmDialog
  open={!!approveTarget}
  onOpenChange={(v) => !v && setApproveTarget(null)}
  title="Confirmar aprovação de alteração de valor?"
  description="Esta ação registrará seu aceite para fins de auditoria e aplicará o novo valor imediatamente."
  confirmLabel="Confirmar e aprovar"
  onConfirm={async () => {
    if (!approveTarget) return
    await approveEdit.mutateAsync(approveTarget)
    setApproveTarget(null)
  }}
  isLoading={approveEdit.isPending}
/>

{/* Modal: recusar edição */}
<Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Recusar alteração de valor</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 py-2">
      <p className="text-sm text-muted-foreground">Informe o motivo da recusa (obrigatório):</p>
      <textarea
        rows={3}
        value={rejectMotivo}
        onChange={(e) => setRejectMotivo(e.target.value)}
        placeholder="Ex: Comprovante insuficiente, valor não autorizado..."
        className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
        style={{ background: 'hsl(var(--pm-gray-800))', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(var(--pm-gray-200))' } as React.CSSProperties}
      />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={rejectEdit.isPending}>
          Cancelar
        </Button>
        <Button
          disabled={rejectMotivo.trim().length < 5 || rejectEdit.isPending}
          onClick={async () => {
            if (!rejectTarget) return
            await rejectEdit.mutateAsync({ ...rejectTarget, motivoRecusa: rejectMotivo.trim() })
            setRejectTarget(null)
          }}
          className="bg-red-700 hover:bg-red-600 text-white border-0"
        >
          {rejectEdit.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar recusa'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Adicionar imports Dialog/DialogContent se não existirem**

Verificar se `Dialog, DialogContent, DialogHeader, DialogTitle` já estão importados no arquivo. Se não, adicionar:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

- [ ] **Step 7: Build final + push**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

Fix any TypeScript errors. Then:

```bash
git add src/pages/app/financeiro/FinanceiroPage.tsx
git commit -m "feat(ui): FinanceiroPage — edições de valor pendentes com aprovar/recusar"
git push origin main
```

---

## Verificação Final

- [ ] Ícone lápis aparece ao lado de `amount_charged_by_matrix` quando `matrix_payment_status='em_aberto'` e valor está definido
- [ ] Ícone lápis oculto quando value is null (mostra "Informar valor" como antes) ou quando status != 'em_aberto'
- [ ] Badge laranja "Edição pendente" aparece quando `edicao_valor_pendente=true`
- [ ] Modal abre ao clicar no lápis: valor atual readonly, campo novo valor, textarea motivo, chips de sugestão
- [ ] Chips preenchem o textarea ao clicar
- [ ] "Solicitar alteração" desabilitado sem valor válido ou sem 20 chars no motivo
- [ ] Após solicitar: badge "Edição pendente" aparece no job, modal fecha, toast exibido
- [ ] Financeiro → aba "Em Aberto" mostra card laranja com dados da edição
- [ ] Botão "Estou ciente — Aprovar": modal de confirmação → ao aprovar, valor é atualizado no job
- [ ] Botão "Recusar": modal com campo de motivo → ao recusar, flag volta a FALSE
- [ ] Seção "Histórico de alterações de valor" aparece na ficha do job apenas para matriz
- [ ] Histórico mostra todos os registros com status colorido
