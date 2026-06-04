# Permissões de Relatório + Exportação por Unidade Franqueada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 4 permissões de relatório por colaborador da matriz + botão "Relatórios" na ficha de franquia + drawer de exportação ECU/Financeiro/Franquia com CSV e XLSX.

**Architecture:** Migration 072 adiciona colunas BOOLEAN em `profiles` + RPCs com SECURITY DEFINER. Frontend: toggles no UsersTab existente; novo `RelatorioFranchiseeDrawer` sheet lateral; botão no `FranchiseeDetail`. Exportação 100% client-side via `xlsx` (já instalado). Admins (`company_admin`, `operations_admin`) têm acesso total.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Supabase JS v2, Radix UI Sheet, xlsx ^0.18.5.

**Mapeamento spec → codebase:**
- `colaboradores` → `profiles`
- `arquivos_ecu` → `ecu_jobs`
- `franquias` → `franchise_units`
- `nome_fantasia` → `franchise_units.name`
- `tipo_remapeamento` → `ecu_jobs.service_type`
- `valor_cobrado` → `ecu_jobs.amount_charged_by_matrix`
- `status_pagamento` → `ecu_jobs.matrix_payment_status`
- `pago_em` → `ecu_jobs.matrix_paid_at`
- `veiculo/placa` → derived from `ecu_jobs.vehicle_info` JSON + `vehicles` join

---

## Mapa de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| CREATE | `supabase/migrations/072_relatorio_permissions.sql` | Colunas profiles + RPCs |
| MODIFY | `src/hooks/useUsers.ts` | Adicionar campos ao Profile type e UpdateUserPayload |
| CREATE | `src/hooks/useRelatorios.ts` | useRelatorioPerm + fetch + export helpers |
| MODIFY | `src/pages/app/configuracoes/UsersTab.tsx` | Seção "Acesso a Relatórios" no form |
| CREATE | `src/pages/app/franqueados/RelatorioFranchiseeDrawer.tsx` | Drawer completo de exportação |
| MODIFY | `src/pages/app/franqueados/FranchiseeDetail.tsx` | Botão "Relatórios" nos actions |

---

## Task 1: Migration 072

**Files:**
- Create: `supabase/migrations/072_relatorio_permissions.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/072_relatorio_permissions.sql

-- 1. Permissões de relatório em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relatorio_financeiro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_ecu        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_vendas     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS relatorio_franquias  BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Função auxiliar de verificação de permissão
CREATE OR REPLACE FUNCTION public.check_relatorio_permission(permissao TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role   TEXT;
  v_result BOOLEAN := FALSE;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  -- Admins têm acesso total
  IF v_role IN ('company_admin', 'operations_admin', 'system_ti') THEN
    RETURN TRUE;
  END IF;

  SELECT CASE permissao
    WHEN 'financeiro' THEN relatorio_financeiro
    WHEN 'ecu'        THEN relatorio_ecu
    WHEN 'vendas'     THEN relatorio_vendas
    WHEN 'franquias'  THEN relatorio_franquias
    ELSE FALSE
  END INTO v_result
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_result, FALSE);
END;
$$;

-- 3. RPC: exportar relatório ECU (verifica permissão + tenant)
CREATE OR REPLACE FUNCTION public.exportar_relatorio_ecu(
  p_unidade_id  UUID,
  p_data_inicio DATE,
  p_data_fim    DATE
)
RETURNS TABLE (
  unidade_nome      TEXT,
  cidade            TEXT,
  uf                TEXT,
  data_solicitacao  TIMESTAMPTZ,
  veiculo           TEXT,
  placa             TEXT,
  tipo_remapeamento TEXT,
  status_financeiro TEXT,
  pago_em           TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  -- Verificar permissão
  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_ecu FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório ECU';
    END IF;
  END IF;

  -- Verificar que unidade pertence ao tenant do usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.franchise_units fu
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE fu.id = p_unidade_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: unidade inválida';
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    j.created_at,
    COALESCE(
      v.brand || ' ' || v.model,
      (j.vehicle_info->>'marca') || ' ' || (j.vehicle_info->>'modelo'),
      '—'
    )::TEXT,
    COALESCE(v.plate, j.vehicle_info->>'placa', '—')::TEXT,
    j.service_type::TEXT,
    j.matrix_payment_status::TEXT,
    j.matrix_paid_at
  FROM public.ecu_jobs j
  JOIN public.franchise_units fu ON fu.id = j.unit_id
  LEFT JOIN public.vehicles v ON v.id = j.vehicle_id
  WHERE j.unit_id = p_unidade_id
    AND j.amount_charged_by_matrix IS NOT NULL
    AND j.created_at::date BETWEEN p_data_inicio AND p_data_fim
  ORDER BY j.created_at DESC;
END;
$$;

-- 4. RPC: exportar relatório Financeiro
CREATE OR REPLACE FUNCTION public.exportar_relatorio_financeiro(
  p_unidade_id  UUID,
  p_data_inicio DATE,
  p_data_fim    DATE
)
RETURNS TABLE (
  unidade_nome     TEXT,
  cidade           TEXT,
  uf               TEXT,
  cnpj             TEXT,
  data_cobranca    TIMESTAMPTZ,
  descricao        TEXT,
  valor_cobrado    NUMERIC,
  status_pagamento TEXT,
  pago_em          TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_financeiro FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório Financeiro';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.franchise_units WHERE id = p_unidade_id) THEN
    RAISE EXCEPTION 'Acesso negado: unidade inválida';
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    fu.cnpj::TEXT,
    j.created_at,
    j.service_type::TEXT,
    j.amount_charged_by_matrix,
    j.matrix_payment_status::TEXT,
    j.matrix_paid_at
  FROM public.ecu_jobs j
  JOIN public.franchise_units fu ON fu.id = j.unit_id
  WHERE j.unit_id = p_unidade_id
    AND j.amount_charged_by_matrix IS NOT NULL
    AND j.created_at::date BETWEEN p_data_inicio AND p_data_fim
  ORDER BY j.created_at DESC;
END;
$$;

-- 5. RPC: exportar relatório Franquia (dados cadastrais)
CREATE OR REPLACE FUNCTION public.exportar_relatorio_franquia(p_unidade_id UUID)
RETURNS TABLE (
  nome_fantasia    TEXT,
  razao_social     TEXT,
  cnpj             TEXT,
  cidade           TEXT,
  uf               TEXT,
  telefone         TEXT,
  email            TEXT,
  raio_km          NUMERIC,
  cidades_atendidas TEXT,
  tipo_contrato    TEXT,
  contrato_inicio  DATE,
  contrato_fim     DATE,
  status_unidade   TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('company_admin', 'operations_admin', 'system_ti') THEN
    IF NOT COALESCE((SELECT relatorio_franquias FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
      RAISE EXCEPTION 'Acesso negado: sem permissão para relatório Franquias';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    fu.name::TEXT,
    fu.razao_social::TEXT,
    fu.cnpj::TEXT,
    fu.city::TEXT,
    fu.state::TEXT,
    fu.phone::TEXT,
    fu.email::TEXT,
    fu.raio_atendimento_km,
    array_to_string(fu.cidades_atendidas, ', ')::TEXT,
    fu.contract_type::TEXT,
    fu.contract_start_date,
    fu.contract_end_date,
    fu.status::TEXT
  FROM public.franchise_units fu
  WHERE fu.id = p_unidade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_relatorio_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_ecu(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_financeiro(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_relatorio_franquia(UUID) TO authenticated;
```

- [ ] **Step 2: Aplicar migration**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
supabase db push 2>&1
```

Esperado: migration 072 aplicada.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add supabase/migrations/072_relatorio_permissions.sql
git commit -m "feat(db): migration 072 — permissões relatorio em profiles + RPCs exportar"
```

---

## Task 2: useUsers.ts + useRelatorios.ts

**Files:**
- Modify: `src/hooks/useUsers.ts`
- Create: `src/hooks/useRelatorios.ts`

- [ ] **Step 1: Adicionar campos de relatório ao Profile type em useUsers.ts**

Ler o arquivo. Localizar `interface Profile` (começa na linha ~6). Após `salary: number | null`, adicionar:

```typescript
  // report permissions
  relatorio_financeiro: boolean
  relatorio_ecu: boolean
  relatorio_vendas: boolean
  relatorio_franquias: boolean
```

- [ ] **Step 2: Adicionar campos ao UpdateUserPayload em useUsers.ts**

Localizar `interface UpdateUserPayload` (linha ~66). Após `salary?: number | null`, adicionar:

```typescript
  relatorio_financeiro?: boolean
  relatorio_ecu?: boolean
  relatorio_vendas?: boolean
  relatorio_franquias?: boolean
```

- [ ] **Step 3: Criar useRelatorios.ts**

```typescript
// src/hooks/useRelatorios.ts
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

const ADMIN_ROLES = ['company_admin', 'operations_admin', 'system_ti'] as const

export interface RelatorioPerm {
  ecu: boolean
  financeiro: boolean
  franquias: boolean
  vendas: boolean
  hasAny: boolean
}

export function useRelatorioPerm(): RelatorioPerm {
  const { profile } = useProfile()
  if (!profile) return { ecu: false, financeiro: false, franquias: false, vendas: false, hasAny: false }

  const isAdmin = ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])
  const ecu        = isAdmin || !!profile.relatorio_ecu
  const financeiro = isAdmin || !!profile.relatorio_financeiro
  const franquias  = isAdmin || !!profile.relatorio_franquias
  const vendas     = isAdmin || !!profile.relatorio_vendas

  return { ecu, financeiro, franquias, vendas, hasAny: ecu || financeiro || franquias || vendas }
}

export interface EcuRow {
  unidade_nome: string; cidade: string; uf: string
  data_solicitacao: string; veiculo: string; placa: string
  tipo_remapeamento: string; status_financeiro: string; pago_em: string | null
}

export interface FinanceiroRow {
  unidade_nome: string; cidade: string; uf: string; cnpj: string
  data_cobranca: string; descricao: string; valor_cobrado: number
  status_pagamento: string; pago_em: string | null
}

export interface FranquiaRow {
  nome_fantasia: string; razao_social: string; cnpj: string
  cidade: string; uf: string; telefone: string; email: string
  raio_km: number; cidades_atendidas: string; tipo_contrato: string
  contrato_inicio: string | null; contrato_fim: string | null; status_unidade: string
}

export async function fetchEcuRelatorio(
  unitId: string, dataInicio: string, dataFim: string
): Promise<EcuRow[]> {
  const { data, error } = await sb().rpc('exportar_relatorio_ecu', {
    p_unidade_id: unitId,
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as EcuRow[]
}

export async function fetchFinanceiroRelatorio(
  unitId: string, dataInicio: string, dataFim: string
): Promise<FinanceiroRow[]> {
  const { data, error } = await sb().rpc('exportar_relatorio_financeiro', {
    p_unidade_id: unitId,
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as FinanceiroRow[]
}

export async function fetchFranquiaRelatorio(unitId: string): Promise<FranquiaRow[]> {
  const { data, error } = await sb().rpc('exportar_relatorio_franquia', {
    p_unidade_id: unitId,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as FranquiaRow[]
}

// ── Export helpers ──────────────────────────────────────────────────────────────

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = rows.map((r) =>
    headers.map((h) => {
      const v = r[h] ?? ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  )
  const BOM = '﻿'
  const csv = BOM + [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function exportToXLSX(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) cell.s = { font: { bold: true } }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  XLSX.writeFile(wb, filename)
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
```

- [ ] **Step 4: Verificar TS**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep -E "useUsers|useRelatorios" | head -10
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useUsers.ts src/hooks/useRelatorios.ts
git commit -m "feat(hooks): relatorio_* em Profile + useRelatorios com fetch e export helpers"
```

---

## Task 3: UsersTab.tsx — Seção "Acesso a Relatórios"

**Files:**
- Modify: `src/pages/app/configuracoes/UsersTab.tsx`

**Contexto:** Arquivo de 1192 linhas com um Sheet lateral de edição de usuário. Há um form com seções como "Desconto", "Comissão", "Permissões de módulo". Deve ser adicionada uma nova seção "Acesso a Relatórios" APÓS a seção de permissões de módulo existente, DENTRO do SheetContent de edição.

- [ ] **Step 1: Ler o arquivo para localizar o ponto de inserção**

```bash
grep -n "relatorio\|Relatório\|Permissões\|seção\|SheetContent\|Comissão\|discount\|commission" \
  "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/configuracoes/UsersTab.tsx" \
  | tail -40
```

Identificar a linha do último `</div>` da seção de permissões existente (antes do `<div className="flex gap-2` dos botões Salvar/Cancelar).

- [ ] **Step 2: Adicionar import do Switch (se não existir)**

Verificar se `Switch` já está importado:
```bash
grep "Switch" "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/configuracoes/UsersTab.tsx" | head -3
```

Se não importado, adicionar:
```typescript
import { Switch } from '@/components/ui/switch'
```

- [ ] **Step 3: Adicionar campos de relatório no estado do form de edição**

Localizar o `useState` do usuário em edição (provavelmente algo como `editUser` state ou form state). Adicionar campos de relatório aos valores iniciais:

```typescript
relatorio_financeiro: user?.relatorio_financeiro ?? false,
relatorio_ecu:        user?.relatorio_ecu ?? false,
relatorio_vendas:     user?.relatorio_vendas ?? false,
relatorio_franquias:  user?.relatorio_franquias ?? false,
```

- [ ] **Step 4: Incluir campos no payload de save**

Localizar onde `updateUser.mutate(...)` é chamado. Adicionar os 4 campos ao payload:

```typescript
relatorio_financeiro: formState.relatorio_financeiro,
relatorio_ecu:        formState.relatorio_ecu,
relatorio_vendas:     formState.relatorio_vendas,
relatorio_franquias:  formState.relatorio_franquias,
```

- [ ] **Step 5: Adicionar seção de toggles no SheetContent**

Imediatamente ANTES do bloco dos botões Salvar/Cancelar (último div do form), inserir:

```tsx
{/* ── Acesso a Relatórios ─────────────────────────────────── */}
<div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
    Acesso a Relatórios
  </p>
  {[
    { key: 'relatorio_ecu' as const,        label: 'ECU',        desc: 'Histórico de arquivos por unidade e período' },
    { key: 'relatorio_financeiro' as const, label: 'Financeiro', desc: 'Extratos, cobranças ECU, faturas por unidade' },
    { key: 'relatorio_franquias' as const,  label: 'Franquias',  desc: 'Ficha, dados cadastrais e contratos' },
    { key: 'relatorio_vendas' as const,     label: 'Vendas',     desc: 'Pedidos B2B, produtos, faturamento (em breve)' },
  ].map(({ key, label, desc }) => (
    <div key={key} className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>{desc}</p>
      </div>
      <Switch
        checked={!!formState[key]}
        onCheckedChange={(v) => setFormState((s) => ({ ...s, [key]: v }))}
      />
    </div>
  ))}
</div>
```

**Nota:** `formState` e `setFormState` devem corresponder ao nome real do estado do form. Adapte conforme o código encontrado no Step 1.

- [ ] **Step 6: Build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -6
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/configuracoes/UsersTab.tsx
git commit -m "feat(ui): UsersTab — seção Acesso a Relatórios com 4 toggles"
```

---

## Task 4: RelatorioFranchiseeDrawer.tsx — Drawer Completo de Exportação

**Files:**
- Create: `src/pages/app/franqueados/RelatorioFranchiseeDrawer.tsx`

**Contexto:** Usa `Sheet` do Radix UI (já usado no projeto). 4 passos: período → módulo → campos → export.

- [ ] **Step 1: Criar o componente**

```tsx
// src/pages/app/franqueados/RelatorioFranchiseeDrawer.tsx
import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useRelatorioPerm,
  fetchEcuRelatorio, fetchFinanceiroRelatorio, fetchFranquiaRelatorio,
  exportToCSV, exportToXLSX, formatDateBR, fmtBRL,
  type EcuRow, type FinanceiroRow, type FranquiaRow,
} from '@/hooks/useRelatorios'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'

// ── Tipos e constantes ─────────────────────────────────────────────────────────

type Modulo = 'ecu' | 'financeiro' | 'franquia'

const PERIODO_ATALHOS = [
  { label: 'Este mês',      fn: () => { const n = new Date(); return { de: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, ate: n.toISOString().slice(0,10) } } },
  { label: 'Mês anterior',  fn: () => { const n = new Date(); n.setMonth(n.getMonth()-1); return { de: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, ate: new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().slice(0,10) } } },
  { label: 'Últimos 3m',    fn: () => { const n = new Date(); const i = new Date(n); i.setMonth(i.getMonth()-3); return { de: i.toISOString().slice(0,10), ate: n.toISOString().slice(0,10) } } },
  { label: 'Este ano',      fn: () => { const n = new Date(); return { de: `${n.getFullYear()}-01-01`, ate: n.toISOString().slice(0,10) } } },
]

const ECU_CAMPOS = [
  { key: 'unidade_nome', label: 'Unidade' }, { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' }, { key: 'data_solicitacao', label: 'Data Solicitação' },
  { key: 'veiculo', label: 'Veículo' }, { key: 'placa', label: 'Placa' },
  { key: 'tipo_remapeamento', label: 'Tipo de Remapeamento' },
  { key: 'status_financeiro', label: 'Status Financeiro' }, { key: 'pago_em', label: 'Data Pagamento' },
]

const FIN_CAMPOS = [
  { key: 'unidade_nome', label: 'Unidade' }, { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' }, { key: 'cnpj', label: 'CNPJ' },
  { key: 'data_cobranca', label: 'Data Cobrança' }, { key: 'descricao', label: 'Descrição' },
  { key: 'valor_cobrado', label: 'Valor Cobrado' }, { key: 'status_pagamento', label: 'Status' },
  { key: 'pago_em', label: 'Data Pagamento' },
]

const FRQ_CAMPOS = [
  { key: 'nome_fantasia', label: 'Nome Fantasia' }, { key: 'razao_social', label: 'Razão Social' },
  { key: 'cnpj', label: 'CNPJ' }, { key: 'cidade', label: 'Cidade' }, { key: 'uf', label: 'UF' },
  { key: 'telefone', label: 'Telefone' }, { key: 'email', label: 'E-mail' },
  { key: 'raio_km', label: 'Raio (km)' }, { key: 'cidades_atendidas', label: 'Cidades Atendidas' },
  { key: 'tipo_contrato', label: 'Tipo de Contrato' }, { key: 'contrato_inicio', label: 'Início Contrato' },
  { key: 'contrato_fim', label: 'Término Contrato' }, { key: 'status_unidade', label: 'Status' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10) }
function firstOfMonth() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01` }

function normalizarEcu(rows: EcuRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Unidade': r.unidade_nome, 'Cidade': r.cidade, 'UF': r.uf,
    'Data Solicitação': formatDateBR(r.data_solicitacao),
    'Veículo': r.veiculo, 'Placa': r.placa,
    'Tipo Remapeamento': r.tipo_remapeamento,
    'Status Financeiro': r.status_financeiro === 'pago' ? 'PAGO' : 'EM ABERTO',
    'Data Pagamento': formatDateBR(r.pago_em),
  }))
}

function normalizarFin(rows: FinanceiroRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Unidade': r.unidade_nome, 'Cidade': r.cidade, 'UF': r.uf, 'CNPJ': r.cnpj,
    'Data Cobrança': formatDateBR(r.data_cobranca),
    'Descrição': r.descricao,
    'Valor Cobrado': r.valor_cobrado,
    'Status': r.status_pagamento === 'pago' ? 'PAGO' : 'EM ABERTO',
    'Data Pagamento': formatDateBR(r.pago_em),
  }))
}

function normalizarFrq(rows: FranquiaRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Nome Fantasia': r.nome_fantasia, 'Razão Social': r.razao_social, 'CNPJ': r.cnpj,
    'Cidade': r.cidade, 'UF': r.uf, 'Telefone': r.telefone, 'E-mail': r.email,
    'Raio (km)': r.raio_km, 'Cidades Atendidas': r.cidades_atendidas,
    'Tipo Contrato': r.tipo_contrato,
    'Início Contrato': formatDateBR(r.contrato_inicio),
    'Término Contrato': formatDateBR(r.contrato_fim),
    'Status': r.status_unidade,
  }))
}

function filtrarCampos(
  rows: Record<string, unknown>[],
  campos: { key: string; label: string }[],
  selected: Set<string>
): Record<string, unknown>[] {
  const labels = campos.filter((c) => selected.has(c.key)).map((c) => c.label)
  return rows.map((r) => {
    const out: Record<string, unknown> = {}
    labels.forEach((l) => { out[l] = r[l] })
    return out
  })
}

// ── Componente principal ───────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  unit: Pick<FranchiseUnit, 'id' | 'name' | 'city' | 'state'>
}

export function RelatorioFranchiseeDrawer({ open, onClose, unit }: Props) {
  const perm = useRelatorioPerm()

  const defaultModulo: Modulo = perm.ecu ? 'ecu' : perm.financeiro ? 'financeiro' : 'franquia'

  const [de, setDe] = useState(firstOfMonth)
  const [ate, setAte] = useState(today)
  const [modulo, setModulo] = useState<Modulo>(defaultModulo)
  const [camposAtivos, setCamposAtivos] = useState<Set<string>>(
    new Set(ECU_CAMPOS.map((c) => c.key))
  )
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)

  const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--pm-gray-200))',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none',
  }

  function selectModulo(m: Modulo) {
    setModulo(m)
    setPreview(null)
    const campos = m === 'ecu' ? ECU_CAMPOS : m === 'financeiro' ? FIN_CAMPOS : FRQ_CAMPOS
    setCamposAtivos(new Set(campos.map((c) => c.key)))
  }

  function toggleCampo(key: string) {
    setCamposAtivos((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function fetchData(): Promise<Record<string, unknown>[]> {
    if (modulo === 'ecu') {
      const rows = await fetchEcuRelatorio(unit.id, de, ate)
      return filtrarCampos(normalizarEcu(rows), ECU_CAMPOS, camposAtivos)
    }
    if (modulo === 'financeiro') {
      const rows = await fetchFinanceiroRelatorio(unit.id, de, ate)
      return filtrarCampos(normalizarFin(rows), FIN_CAMPOS, camposAtivos)
    }
    const rows = await fetchFranquiaRelatorio(unit.id)
    return filtrarCampos(normalizarFrq(rows), FRQ_CAMPOS, camposAtivos)
  }

  async function handlePreview() {
    setLoading(true)
    try {
      const data = await fetchData()
      if (!data.length) { toast.error('Nenhum registro encontrado para o período selecionado'); return }
      setPreview(data)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'csv' | 'xlsx') {
    setLoading(true)
    try {
      const data = preview ?? await fetchData()
      if (!data.length) { toast.error('Nenhum registro encontrado para o período selecionado'); return }
      const filename = `relatorio-${unit.name.replace(/\s+/g, '-')}-${modulo}-${de}-${ate}.${format}`
      if (format === 'csv') exportToCSV(data, filename)
      else exportToXLSX(data, filename)
      toast.success(`Relatório ${format.toUpperCase()} exportado`)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  const camposAtual = modulo === 'ecu' ? ECU_CAMPOS : modulo === 'financeiro' ? FIN_CAMPOS : FRQ_CAMPOS

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" style={{ background: 'hsl(var(--pm-gray-950,#0f1117))' }}>
        <SheetHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <SheetTitle className="text-white">
            Exportar Relatório
            <span className="block text-xs font-normal mt-0.5" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              {unit.name} — {unit.city}/{unit.state}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">

          {/* Período */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Período
            </p>
            <div className="flex items-center gap-2">
              <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} style={inputStyle} />
              <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>até</span>
              <input type="date" value={ate} min={de} max={today()} onChange={(e) => setAte(e.target.value)} style={inputStyle} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERIODO_ATALHOS.map((a) => (
                <button key={a.label} onClick={() => { const r = a.fn(); setDe(r.de); setAte(r.ate); setPreview(null) }}
                  className="px-2.5 py-1 rounded text-[11px] transition-colors"
                  style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-400))' }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Módulo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Módulo
            </p>
            <div className="flex flex-col gap-1.5">
              {perm.ecu && (
                <button onClick={() => selectModulo('ecu')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{ background: modulo === 'ecu' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))', border: modulo === 'ecu' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent', color: modulo === 'ecu' ? '#fff' : 'hsl(var(--pm-gray-400))' }}>
                  <span className="text-sm font-medium">ECU — Histórico de Arquivos</span>
                </button>
              )}
              {perm.financeiro && (
                <button onClick={() => selectModulo('financeiro')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{ background: modulo === 'financeiro' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))', border: modulo === 'financeiro' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent', color: modulo === 'financeiro' ? '#fff' : 'hsl(var(--pm-gray-400))' }}>
                  <span className="text-sm font-medium">Financeiro — Faturas</span>
                </button>
              )}
              {perm.franquias && (
                <button onClick={() => selectModulo('franquia')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{ background: modulo === 'franquia' ? 'hsl(var(--pm-red-500)/0.15)' : 'hsl(var(--pm-gray-800))', border: modulo === 'franquia' ? '1px solid hsl(var(--pm-red-500)/0.4)' : '1px solid transparent', color: modulo === 'franquia' ? '#fff' : 'hsl(var(--pm-gray-400))' }}>
                  <span className="text-sm font-medium">Franquia — Cadastro</span>
                </button>
              )}
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Campos
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCamposAtivos(new Set(camposAtual.map((c) => c.key)))}
                  className="text-[11px] underline" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Todos
                </button>
                <button onClick={() => setCamposAtivos(new Set())}
                  className="text-[11px] underline" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Nenhum
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {camposAtual.map((c) => (
                <label key={c.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={camposAtivos.has(c.key)}
                    onChange={() => toggleCampo(c.key)} className="accent-red-500" />
                  <span className="text-sm" style={{ color: 'hsl(var(--pm-gray-300))' }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview (primeiros 5) */}
          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Preview ({Math.min(5, preview.length)} de {preview.length} registros)
              </p>
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="text-[11px] w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {Object.keys(preview[0]).map((k) => (
                        <th key={k} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                          style={{ color: 'hsl(var(--pm-gray-600))' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                            {String(v ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!preview && (
              <Button onClick={handlePreview} disabled={loading || camposAtivos.size === 0}
                variant="outline" className="w-full gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Pré-visualizar dados
              </Button>
            )}
            <div className="flex gap-2">
              <Button onClick={() => handleExport('csv')} disabled={loading || camposAtivos.size === 0}
                className="flex-1 gap-2 text-white border-0"
                style={{ background: 'hsl(var(--pm-gray-700))' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                CSV
              </Button>
              <Button onClick={() => handleExport('xlsx')} disabled={loading || camposAtivos.size === 0}
                className="flex-1 gap-2 text-white border-0"
                style={{ background: 'hsl(var(--pm-red-500))' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                XLSX
              </Button>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verificar TS + build**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep RelatorioFranchiseeDrawer | head -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/franqueados/RelatorioFranchiseeDrawer.tsx
git commit -m "feat(ui): RelatorioFranchiseeDrawer — exportação ECU/Financeiro/Franquia CSV+XLSX"
```

---

## Task 5: FranchiseeDetail.tsx — Botão Relatórios + Push

**Files:**
- Modify: `src/pages/app/franqueados/FranchiseeDetail.tsx`

- [ ] **Step 1: Ler o arquivo para localizar a área de actions**

```bash
grep -n "PageHeader\|actions\|Upgrade\|Renovar\|Bloquear\|Relatório" \
  "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/franqueados/FranchiseeDetail.tsx" \
  | head -20
```

- [ ] **Step 2: Adicionar imports**

No topo do arquivo, após imports existentes:

```typescript
import { BarChart3 } from 'lucide-react'
import { RelatorioFranchiseeDrawer } from '@/pages/app/franqueados/RelatorioFranchiseeDrawer'
import { useRelatorioPerm } from '@/hooks/useRelatorios'
```

- [ ] **Step 3: Adicionar hook e estado**

Dentro de `FranchiseeDetail`, após as declarações de hooks existentes:

```typescript
const relatorioPerm  = useRelatorioPerm()
const [relatorioOpen, setRelatorioOpen] = useState(false)
```

- [ ] **Step 4: Adicionar botão no PageHeader actions**

Localizar o prop `actions` do `<PageHeader>`. Dentro do fragmento de actions, ANTES do botão "Voltar" ou em posição proeminente, adicionar:

```tsx
{relatorioPerm.hasAny && unit && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setRelatorioOpen(true)}
    className="gap-1.5"
  >
    <BarChart3 size={14} />
    Relatórios
  </Button>
)}
```

- [ ] **Step 5: Adicionar drawer no final do return (antes do fechamento)**

Imediatamente ANTES do `</div>` final do return (após os modais existentes):

```tsx
{unit && (
  <RelatorioFranchiseeDrawer
    open={relatorioOpen}
    onClose={() => setRelatorioOpen(false)}
    unit={{ id: unit.id, name: unit.name, city: unit.city ?? '—', state: unit.state ?? '—' }}
  />
)}
```

- [ ] **Step 6: Build final + push**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npm run build 2>&1 | tail -8
```

```bash
git add src/pages/app/franqueados/FranchiseeDetail.tsx
git commit -m "feat(ui): FranchiseeDetail — botão Relatórios + RelatorioFranchiseeDrawer"
git push origin main
```

---

## Verificação Final

- [ ] Cadastro de colaborador mostra seção "Acesso a Relatórios" com 4 toggles
- [ ] Toggles salvam no DB (profiles.relatorio_*)
- [ ] `company_admin` e `operations_admin` veem botão Relatórios sem precisar toggle
- [ ] Usuário sem nenhuma permissão NÃO vê botão Relatórios
- [ ] Drawer abre com nome da unidade no cabeçalho
- [ ] Atalhos de período (Este mês, Mês anterior, etc.) funcionam
- [ ] Apenas módulos com permissão aparecem no seletor
- [ ] Checklist de campos funciona com "Todos / Nenhum"
- [ ] Preview mostra primeiros 5 registros
- [ ] CSV exportado com BOM UTF-8 (abre corretamente no Excel)
- [ ] XLSX exportado com cabeçalho em negrito
- [ ] Toast "Nenhum registro" quando período sem dados
- [ ] RPCs recusam acesso sem permissão (testável no SQL Editor)
