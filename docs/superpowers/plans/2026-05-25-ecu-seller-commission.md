# ECU Seller Assignment, Finance Flow & Commission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar seleção de vendedor no formulário ECU, fluxo "Finalizar e enviar para o financeiro", página Caixa para registro de pagamento com desconto limitado, e histórico de comissões no perfil do vendedor.

**Architecture:** Quatro subsistemas encadeados — (1) seller_id no job + valor obrigatório, (2) mutation `useSendToFinance` cria `financial_entries` pendente, (3) `CaixaPage` registra pagamento e cria `commission_entries`, (4) histórico de comissões no perfil existente. Nenhum estado global novo — tudo via TanStack Query.

**Tech Stack:** React 19, TypeScript, Supabase Postgres, TanStack Query 5, Zod, Tailwind CSS com tokens `--pm-*`, Lucide React

---

## Contexto crítico do projeto

- **Padrão DB:** `supabase as any` em todas as queries — não use tipos gerados do Supabase.
- **Queries:** Sempre `const sb = () => supabase as any` e chama `sb().from(...)`.
- **Hook pattern:** `useQuery` / `useMutation` do `@tanstack/react-query`, `queryKey` sempre array.
- **TypeScript:** Verificar com `./node_modules/.bin/tsc --noEmit --project tsconfig.json` (sem npx).
- **Styling:** Tokens `hsl(var(--pm-gray-900))`, `hsl(var(--pm-gray-800))` etc. Botões vermelhos: `hsl(var(--pm-red-500))`.
- **Franchise context:** `useMyUnit()` retorna `{ unit_id, franchise_units: {...} }` ou `null` para matriz.
- **Roles de vendedor:** `unit_seller` (franquia), `seller` (matriz). Para CaixaPage: `finance_staff`, `unit_manager`, `franchise_manager`.
- **Arquivo financeiro:** `src/hooks/useFinancial.ts` (NÃO `useFinancialEntries.ts`). Campos: `period_year`, `period_month` (NÃO `year`/`month`).
- **`max_discount_pct`:** Já existe em `profiles` mas ainda NÃO em `franchise_units` — será adicionado na migration.

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `supabase/migrations/055_ecu_seller_commission.sql` |
| Modificar | `src/hooks/useEcuJobs.ts` — add seller_id, useSendToFinance, useEcuJobFinancialEntry |
| Modificar | `src/hooks/useFinancial.ts` — extend FinancialEntry interface |
| Modificar | `src/hooks/useMyUnit.ts` — add max_discount_pct to franchise_units select |
| Modificar | `src/hooks/useAuditLog.ts` — add sent_to_finance, payment_registered labels |
| Modificar | `src/pages/app/arquivos/EcuJobForm.tsx` — seller picker + required amount |
| Modificar | `src/pages/app/arquivos/EcuJobDetail.tsx` — botão Finalizar + badges de status |
| Criar | `src/hooks/useCaixa.ts` — usePendingPayments, useRegisterPayment, useCommissions |
| Criar | `src/pages/app/caixa/CaixaPage.tsx` — página de caixa da franquia |
| Modificar | `src/pages/app/franqueados/FranqueadoPerfilPage.tsx` — seção Minhas Comissões |
| Modificar | `src/components/layout/FranqueadoSidebar.tsx` — NavItem Caixa |
| Modificar | `src/router/index.tsx` — rota /:unitSlug/:agentSlug/caixa |

---

## Task 1: Migration — Alterações no Banco de Dados

**Files:**
- Create: `supabase/migrations/055_ecu_seller_commission.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/055_ecu_seller_commission.sql

-- 1. seller_id em ecu_jobs
ALTER TABLE public.ecu_jobs
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);

-- 2. Campos de controle de pagamento em financial_entries
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS ecu_job_id UUID REFERENCES public.ecu_jobs(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR;

-- Entradas legacy recebem status='pago' (DEFAULT já faz isso em runtime,
-- mas garantir para rows existentes:)
UPDATE public.financial_entries SET status = 'pago' WHERE status IS NULL;

-- 3. Tabela commission_entries
CREATE TABLE IF NOT EXISTS public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecu_job_id UUID NOT NULL REFERENCES public.ecu_jobs(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  gross_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para commission_entries (mesmo padrão das outras tabelas do projeto)
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read own commissions"
  ON public.commission_entries FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());
CREATE POLICY "service role full access on commission_entries"
  ON public.commission_entries FOR ALL
  TO service_role
  USING (true);

-- 4. max_discount_pct em franchise_units
ALTER TABLE public.franchise_units
  ADD COLUMN IF NOT EXISTS max_discount_pct DECIMAL(5,2) NOT NULL DEFAULT 10;
```

- [ ] **Step 2: Verificar que a migration está no diretório correto**

```bash
ls /Users/rogeriolima/Documents/projetos\ lovable/promax\ tuner/promax-tuner/supabase/migrations/ | tail -5
```

Esperado: arquivo `055_ecu_seller_commission.sql` listado.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add supabase/migrations/055_ecu_seller_commission.sql
git commit -m "feat: migration 055 — seller_id em ecu_jobs, financial_entries status/ecu_job_id, commission_entries, max_discount_pct"
```

---

## Task 2: Estender Interfaces TypeScript

**Files:**
- Modify: `src/hooks/useFinancial.ts`
- Modify: `src/hooks/useMyUnit.ts`
- Modify: `src/hooks/useAuditLog.ts`

- [ ] **Step 1: Estender `FinancialEntry` em `useFinancial.ts`**

Localizar a interface `FinancialEntry` (linha ~14) e substituir por:

```typescript
export interface FinancialEntry {
  id: string
  category_id: string | null
  unit_id: string | null
  type: 'receita' | 'despesa'
  amount: number
  description: string | null
  reference_id: string | null
  period_year: number
  period_month: number
  created_by: string | null
  created_at: string
  financial_categories?: FinancialCategory | null
  // novos campos
  ecu_job_id: string | null
  status: 'pendente' | 'pago'
  discount_amount: number
  payment_method: string | null
}
```

- [ ] **Step 2: Estender `useMyUnit` para incluir `max_discount_pct`**

Em `src/hooks/useMyUnit.ts`, localizar o select da query (`.select(\`unit_id, franchise_units(...)\``)`).

Adicionar `max_discount_pct` dentro da lista de campos de `franchise_units`:

```typescript
.select(`unit_id, franchise_units(
  id, name, city, state, cep, logradouro, numero, complemento, bairro,
  contract_type, contract_start_date, contract_end_date,
  contract_blocked, contract_blocked_reason,
  razao_social, cnpj, inscricao_estadual, data_abertura,
  plan, financial_status, file_limit,
  commercial_phone, commercial_email, business_hours, main_technician,
  max_discount_pct
)`)
```

No tipo de retorno da query, adicionar `max_discount_pct: number` dentro do objeto `franchise_units`:

```typescript
franchise_units: {
  id: string; name: string
  city: string | null; state: string | null
  cep: string | null; logradouro: string | null
  numero: string | null; complemento: string | null; bairro: string | null
  contract_type: 'full' | 'linha_leve'
  contract_start_date: string | null
  contract_end_date: string | null
  contract_blocked: boolean
  contract_blocked_reason: string | null
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  data_abertura: string | null
  plan: string | null
  financial_status: string | null
  file_limit: number | null
  commercial_phone: string | null
  commercial_email: string | null
  business_hours: string | null
  main_technician: { name: string; contact: string } | null
  max_discount_pct: number
}
```

- [ ] **Step 3: Adicionar labels de audit em `useAuditLog.ts`**

Localizar `ACTION_LABELS` e adicionar:

```typescript
export const ACTION_LABELS: Record<string, string> = {
  created:              'Criou',
  updated:              'Editou',
  deleted:              'Excluiu',
  status_changed:       'Alterou status',
  matrix_price_set:     'Definiu preço matriz',
  assigned:             'Atribuiu técnico',
  file_downloaded:      'Baixou arquivo',
  sent_to_finance:      'Enviou para financeiro',   // novo
  payment_registered:   'Registrou pagamento',       // novo
}
```

Localizar `ENTITY_LABELS` e adicionar:

```typescript
export const ENTITY_LABELS: Record<string, string> = {
  ecu_job:          'Arquivo ECU',
  financial_entry:  'Lançamento Financeiro',
  monthly_closing:  'Fechamento Mensal',
  profile:          'Usuário',
  pos_sale:         'Venda PDV',
  order:            'Pedido',
  franchise_unit:   'Unidade Franqueada',
  product:          'Produto',
  customer:         'Cliente',
  vehicle:          'Veículo',
  support_ticket:   'Ticket de Suporte',
  company_settings: 'Configurações',
  commission_entry: 'Comissão',   // novo
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: sem output (0 erros).

- [ ] **Step 5: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useFinancial.ts src/hooks/useMyUnit.ts src/hooks/useAuditLog.ts
git commit -m "feat: estender interfaces FinancialEntry, MyUnit e labels de audit"
```

---

## Task 3: Estender Hook `useEcuJobs` — seller_id + useSendToFinance

**Files:**
- Modify: `src/hooks/useEcuJobs.ts`

- [ ] **Step 1: Adicionar `seller_id` à interface `EcuJob`**

Localizar a interface `EcuJob` e adicionar logo após `created_by`:

```typescript
seller_id: string | null
seller?: { id: string; name: string } | null
```

- [ ] **Step 2: Adicionar `seller_id` ao `CreatePayload`**

Localizar a interface `CreatePayload` e adicionar:

```typescript
interface CreatePayload {
  customer_id: string | null
  vehicle_id: string | null
  unit_id: string | null
  service_type: string
  priority: string
  problem_description: string
  due_at: string | null
  created_by: string | null
  amount_charged_to_customer: number
  service_tags?: string[]
  vehicle_info?: Record<string, unknown>
  seller_id?: string | null  // novo
}
```

- [ ] **Step 3: Adicionar `seller_id` ao insert em `useCreateEcuJob`**

Na `mutationFn` de `useCreateEcuJob`, o insert já desestrutura `payload`. Verificar que `seller_id` está sendo passado (se o payload o contém, a desestruturação via spread já o inclui — confirmar que o insert usa `...payload` e não campos individuais).

Se o insert usar spread `...payload`, nada mais é necessário. Se listar campos individualmente, adicionar `seller_id: payload.seller_id ?? null`.

- [ ] **Step 4: Adicionar `seller` ao select de `useEcuJob`**

Localizar o `.select(...)` em `useEcuJob` (single fetch) e adicionar `profiles!seller_id(id,name)` ao join.

O alias `profiles!seller_id` instrui o Supabase a fazer join via FK `seller_id`. Resultado: `r.profiles` no shape do seller.

No mapeamento do resultado, adicionar:

```typescript
seller_id: r.seller_id ?? null,
seller: r.profiles ?? null,  // profiles!seller_id
```

- [ ] **Step 5: Adicionar `useEcuJobFinancialEntry` — verifica se job já foi enviado ao financeiro**

Ao final do arquivo `useEcuJobs.ts`, adicionar:

```typescript
export function useEcuJobFinancialEntry(jobId: string) {
  return useQuery({
    queryKey: ['ecu-job-financial-entry', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await sb()
        .from('financial_entries')
        .select('id, status, amount, discount_amount, payment_method')
        .eq('ecu_job_id', jobId)
        .maybeSingle()
      return data as {
        id: string
        status: 'pendente' | 'pago'
        amount: number
        discount_amount: number
        payment_method: string | null
      } | null
    },
  })
}
```

- [ ] **Step 6: Adicionar `useSendToFinance` mutation**

```typescript
export function useSendToFinance() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      jobId,
      unitId,
      amount,
      serviceType,
      customerName,
    }: {
      jobId: string
      unitId: string
      amount: number
      serviceType: string
      customerName: string
    }) => {
      const now = new Date()
      const { data, error } = await sb()
        .from('financial_entries')
        .insert({
          type: 'receita',
          status: 'pendente',
          amount,
          ecu_job_id: jobId,
          unit_id: unitId,
          description: `ECU: ${serviceType} — ${customerName}`,
          period_year: now.getFullYear(),
          period_month: now.getMonth() + 1,
          discount_amount: 0,
          payment_method: null,
          created_by: user?.id ?? null,
          category_id: null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data as { id: string }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', variables.jobId] })
      qc.invalidateQueries({ queryKey: ['ecu-job-financial-entry', variables.jobId] })
      qc.invalidateQueries({ queryKey: ['caixa-pendentes'] })
      log({
        entity: 'ecu_job',
        entityId: variables.jobId,
        action: 'sent_to_finance',
        metadata: { amount: variables.amount },
      })
    },
  })
}
```

- [ ] **Step 7: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 8: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useEcuJobs.ts
git commit -m "feat: seller_id em EcuJob, useEcuJobFinancialEntry e useSendToFinance"
```

---

## Task 4: EcuJobForm — Seller Picker + Valor Obrigatório

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobForm.tsx`

**Contexto:** O formulário usa Zod + react-hook-form. `amount_charged_to_customer` já existe mas é opcional. Adicionar `seller_id` opcional e tornar o amount obrigatório.

- [ ] **Step 1: Adicionar `seller_id` ao schema Zod**

Localizar o objeto Zod do formulário (começa por volta da linha 28 com `const schema = z.object({...})`).

Adicionar ao schema:

```typescript
seller_id: z.string().uuid().nullable().optional(),
```

E tornar `amount_charged_to_customer` obrigatório:

```typescript
amount_charged_to_customer: z.number({ invalid_type_error: 'Informe o valor' }).min(0.01, 'Valor deve ser maior que zero'),
```

- [ ] **Step 2: Adicionar `seller_id` ao tipo `FormValues`**

Se `FormValues` for inferido via `z.infer<typeof schema>`, a adição ao schema já o inclui. Caso seja definido manualmente, adicionar:

```typescript
seller_id?: string | null
```

- [ ] **Step 3: Adicionar import e hook de usuários**

No topo do arquivo, junto dos imports existentes, adicionar:

```typescript
import { useUsers } from '@/hooks/useUsers'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
```

No corpo do componente `EcuJobForm`, junto dos outros hooks:

```typescript
const { data: usersData = [] } = useUsers()
const { data: myUnit } = useMyUnit()
const { isFranchiseUser } = useProfile()
const isFranchise = !!myUnit?.unit_id

const sellers = usersData.filter(
  (u) => u.active && (u.role === 'unit_seller') && isFranchise
)
```

- [ ] **Step 4: Adicionar o select de vendedor no JSX**

Localizar a área do campo de cliente no JSX (deve ter um label "Cliente" e um select/combobox). Logo abaixo desse campo, inserir:

```tsx
{isFranchise && (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: 'hsl(var(--pm-gray-300))' }}>
      Vendedor responsável
    </label>
    <select
      {...form.register('seller_id')}
      style={{
        background: 'hsl(var(--pm-gray-800))',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 14,
        outline: 'none',
      }}
    >
      <option value="">Empresa (sem vendedor)</option>
      {sellers.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
    {form.formState.errors.seller_id && (
      <span className="text-xs text-red-400">{form.formState.errors.seller_id.message}</span>
    )}
  </div>
)}
```

- [ ] **Step 5: Passar `seller_id` ao `createJob.mutateAsync`**

Localizar a função `onSubmit` e onde chama `createJob.mutateAsync(...)`. Adicionar `seller_id` ao payload:

```typescript
seller_id: values.seller_id || null,
```

- [ ] **Step 6: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 7: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/arquivos/EcuJobForm.tsx
git commit -m "feat: seller picker e valor obrigatório no formulário de job ECU"
```

---

## Task 5: EcuJobDetail — Botão "Finalizar e enviar para o financeiro"

**Files:**
- Modify: `src/pages/app/arquivos/EcuJobDetail.tsx`

**Contexto:** A página existe e mostra detalhes do job. Na visão da franquia, quando `job.status === 'concluido'`, adicionar botão/badge de envio ao financeiro.

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar:

```typescript
import { useEcuJobFinancialEntry, useSendToFinance } from '@/hooks/useEcuJobs'
import { useMyUnit } from '@/hooks/useMyUnit'
```

- [ ] **Step 2: Instanciar hooks no componente**

Dentro de `EcuJobDetail`, junto dos outros hooks:

```typescript
const { data: myUnit } = useMyUnit()
const isFranchise = !!myUnit?.unit_id
const { data: financialEntry } = useEcuJobFinancialEntry(job?.id ?? '')
const sendToFinance = useSendToFinance()
```

- [ ] **Step 3: Adicionar handler**

```typescript
async function handleSendToFinance() {
  if (!job) return
  await sendToFinance.mutateAsync({
    jobId: job.id,
    unitId: job.unit_id ?? '',
    amount: job.amount_charged_to_customer ?? 0,
    serviceType: job.service_type,
    customerName: job.customers?.name ?? 'Cliente',
  })
}
```

- [ ] **Step 4: Adicionar UI do botão e badges**

Localizar a seção de "next actions buttons" (por volta da linha 566 — área com botões de transição de status). Logo após essa área, adicionar:

```tsx
{/* Envio ao financeiro — franquia, job concluído */}
{isFranchise && job.status === 'concluido' && (
  <div className="mt-4">
    {!financialEntry && (
      <button
        onClick={handleSendToFinance}
        disabled={sendToFinance.isPending || !job.amount_charged_to_customer}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
        style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
      >
        {sendToFinance.isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CreditCard size={16} />
        )}
        Finalizar e enviar para o financeiro
      </button>
    )}
    {financialEntry?.status === 'pendente' && (
      <div
        className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
        style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}
      >
        <Clock size={14} /> Aguardando caixa
      </div>
    )}
    {financialEntry?.status === 'pago' && (
      <div
        className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
      >
        <CheckCircle2 size={14} /> Pago
        {financialEntry.payment_method && (
          <span style={{ opacity: 0.7 }}>· {financialEntry.payment_method}</span>
        )}
      </div>
    )}
    {!job.amount_charged_to_customer && !financialEntry && (
      <p className="text-xs text-center mt-1" style={{ color: 'hsl(var(--pm-gray-500))' }}>
        Preencha o valor cobrado do cliente para enviar ao financeiro.
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Garantir imports de ícones**

Verificar que os ícones `CreditCard`, `Clock`, `CheckCircle2`, `Loader2` estão importados do `lucide-react`. Adicionar ao import existente do lucide-react qualquer um que falte.

- [ ] **Step 6: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 7: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/arquivos/EcuJobDetail.tsx
git commit -m "feat: botão 'Finalizar e enviar para o financeiro' no EcuJobDetail"
```

---

## Task 6: Hook `useCaixa` — Pending Payments + Register Payment + Commissions

**Files:**
- Create: `src/hooks/useCaixa.ts`

- [ ] **Step 1: Criar o arquivo `src/hooks/useCaixa.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface PendingPayment {
  id: string
  amount: number
  description: string | null
  created_at: string
  ecu_job_id: string | null
  ecu_jobs: {
    id: string
    service_type: string
    amount_charged_to_customer: number
    seller_id: string | null
    seller: { id: string; name: string; commission_rate: number } | null
    customers: { name: string } | null
  } | null
}

export interface CommissionEntry {
  id: string
  ecu_job_id: string
  gross_amount: number
  discount_amount: number
  commission_rate: number
  commission_amount: number
  paid_at: string
  created_at: string
  ecu_jobs: {
    service_type: string
    customers: { name: string } | null
  } | null
}

export function usePendingPayments(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['caixa-pendentes', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('financial_entries')
        .select(`
          id, amount, description, created_at, ecu_job_id,
          ecu_jobs(
            id, service_type, amount_charged_to_customer, seller_id,
            profiles!seller_id(id, name, commission_rate),
            customers(name)
          )
        `)
        .eq('unit_id', unitId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        ...r,
        ecu_jobs: r.ecu_jobs
          ? {
              ...r.ecu_jobs,
              seller: r.ecu_jobs.profiles ?? null,
            }
          : null,
      })) as PendingPayment[]
    },
  })
}

interface RegisterPaymentPayload {
  entryId: string
  paymentMethod: string
  discountPct: number
  jobId: string
  sellerId: string | null
  grossAmount: number
  commissionRate: number
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      entryId,
      paymentMethod,
      discountPct,
      jobId,
      sellerId,
      grossAmount,
      commissionRate,
    }: RegisterPaymentPayload) => {
      const discountAmount = Number((grossAmount * (discountPct / 100)).toFixed(2))
      const netAmount = Number((grossAmount - discountAmount).toFixed(2))

      // 1. Atualiza financial_entry
      const { error: entryErr } = await sb()
        .from('financial_entries')
        .update({
          status: 'pago',
          payment_method: paymentMethod,
          discount_amount: discountAmount,
          amount: netAmount,
        })
        .eq('id', entryId)
      if (entryErr) throw entryErr

      // 2. Cria commission_entry se houver vendedor
      if (sellerId && commissionRate > 0) {
        const commissionAmount = Number((netAmount * (commissionRate / 100)).toFixed(2))
        const { error: commErr } = await sb()
          .from('commission_entries')
          .insert({
            ecu_job_id: jobId,
            seller_id: sellerId,
            gross_amount: grossAmount,
            discount_amount: discountAmount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
          })
        if (commErr) throw commErr
      }

      return { entryId, jobId, sellerId, netAmount, discountPct }
    },
    onSuccess: ({ entryId, jobId, sellerId, netAmount, discountPct }) => {
      qc.invalidateQueries({ queryKey: ['caixa-pendentes'] })
      qc.invalidateQueries({ queryKey: ['ecu-job-financial-entry', jobId] })
      if (sellerId) qc.invalidateQueries({ queryKey: ['commission-entries', sellerId] })
      log({
        entity: 'financial_entry',
        entityId: entryId,
        action: 'payment_registered',
        metadata: { netAmount, discountPct },
      })
    },
  })
}

export function useCommissions(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: ['commission-entries', sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('commission_entries')
        .select(`
          id, ecu_job_id, gross_amount, discount_amount,
          commission_rate, commission_amount, paid_at, created_at,
          ecu_jobs(service_type, customers(name))
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CommissionEntry[]
    },
  })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/hooks/useCaixa.ts
git commit -m "feat: hook useCaixa com usePendingPayments, useRegisterPayment e useCommissions"
```

---

## Task 7: CaixaPage — Página de Caixa da Franquia

**Files:**
- Create: `src/pages/app/caixa/CaixaPage.tsx`

- [ ] **Step 1: Criar o diretório e o arquivo**

```bash
mkdir -p "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/caixa"
```

- [ ] **Step 2: Criar `CaixaPage.tsx`**

```tsx
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useMyUnit } from '@/hooks/useMyUnit'
import { usePendingPayments, useRegisterPayment, type PendingPayment } from '@/hooks/useCaixa'
import { CreditCard, Loader2, CheckCircle2, X } from 'lucide-react'

const PAYMENT_METHODS = [
  'Dinheiro',
  'Cartão Débito',
  'Cartão Crédito',
  'PIX',
  'Transferência',
]

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface PaymentSheetProps {
  payment: PendingPayment
  maxDiscountPct: number
  onClose: () => void
}

function PaymentSheet({ payment, maxDiscountPct, onClose }: PaymentSheetProps) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [discountPct, setDiscountPct] = useState(0)
  const registerPayment = useRegisterPayment()

  const grossAmount = payment.ecu_jobs?.amount_charged_to_customer ?? payment.amount
  const discountAmount = Number((grossAmount * (discountPct / 100)).toFixed(2))
  const netAmount = Number((grossAmount - discountAmount).toFixed(2))
  const discountExceeded = discountPct > maxDiscountPct

  const seller = payment.ecu_jobs?.seller ?? null
  const commissionRate = seller?.commission_rate ?? 0
  const commissionAmount = seller ? Number((netAmount * (commissionRate / 100)).toFixed(2)) : 0

  async function handleConfirm() {
    if (discountExceeded) return
    await registerPayment.mutateAsync({
      entryId: payment.id,
      paymentMethod: method,
      discountPct,
      jobId: payment.ecu_jobs?.id ?? '',
      sellerId: seller?.id ?? null,
      grossAmount,
      commissionRate,
    })
    onClose()
  }

  const inputStyle = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Registrar Pagamento</h3>
          <button onClick={onClose} style={{ color: 'hsl(var(--pm-gray-500))' }}>
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div
          className="rounded-lg p-3 space-y-1 text-sm"
          style={{ background: 'hsl(var(--pm-gray-800))' }}
        >
          <p className="font-medium text-white">{payment.ecu_jobs?.customers?.name ?? '—'}</p>
          <p style={{ color: 'hsl(var(--pm-gray-400))' }}>{payment.ecu_jobs?.service_type ?? payment.description}</p>
          {seller && (
            <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Vendedor: {seller.name} ({commissionRate}% comissão)
            </p>
          )}
        </div>

        {/* Forma de pagamento */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Forma de pagamento
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Desconto */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase" style={{ color: 'hsl(var(--pm-gray-500))' }}>
            Desconto (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            style={{
              ...inputStyle,
              border: discountExceeded ? '1px solid #F87171' : inputStyle.border,
            }}
          />
          {discountExceeded && (
            <p className="text-xs" style={{ color: '#F87171' }}>
              Desconto acima do limite autorizado (máx {maxDiscountPct}%)
            </p>
          )}
        </div>

        {/* Resumo */}
        <div
          className="rounded-lg p-3 space-y-1.5 text-sm"
          style={{ background: 'hsl(var(--pm-gray-800))' }}
        >
          <div className="flex justify-between" style={{ color: 'hsl(var(--pm-gray-400))' }}>
            <span>Valor original</span><span>{fmtBRL(grossAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between" style={{ color: '#F87171' }}>
              <span>Desconto ({discountPct}%)</span><span>- {fmtBRL(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-white border-t pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span>Total a cobrar</span><span>{fmtBRL(netAmount)}</span>
          </div>
          {seller && commissionAmount > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              <span>Comissão {seller.name}</span><span>{fmtBRL(commissionAmount)}</span>
            </div>
          )}
        </div>

        {/* Botão confirmar */}
        <button
          onClick={handleConfirm}
          disabled={discountExceeded || registerPayment.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
          style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
        >
          {registerPayment.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          Confirmar Pagamento
        </button>
      </div>
    </div>
  )
}

export default function CaixaPage() {
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id ?? null
  const maxDiscountPct = myUnit?.franchise_units?.max_discount_pct ?? 10
  const { data: payments = [], isLoading } = usePendingPayments(unitId)
  const [selected, setSelected] = useState<PendingPayment | null>(null)

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Caixa"
        subtitle={`${payments.length} cobrança${payments.length !== 1 ? 's' : ''} pendente${payments.length !== 1 ? 's' : ''}`}
      />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CheckCircle2 size={32} style={{ color: 'hsl(var(--pm-gray-700))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>Nenhuma cobrança pendente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {p.ecu_jobs?.customers?.name ?? '—'}
                </p>
                <p className="text-sm truncate" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                  {p.ecu_jobs?.service_type ?? p.description}
                </p>
                <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>
                  {fmtDate(p.created_at)}
                  {p.ecu_jobs?.seller && (
                    <span> · Vendedor: {p.ecu_jobs.seller.name}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-semibold text-white">
                  {fmtBRL(p.ecu_jobs?.amount_charged_to_customer ?? p.amount)}
                </span>
                <button
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                >
                  <CreditCard size={12} /> Cobrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <PaymentSheet
          payment={selected}
          maxDiscountPct={maxDiscountPct}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/caixa/CaixaPage.tsx
git commit -m "feat: CaixaPage com listagem de cobranças e sheet de pagamento com desconto"
```

---

## Task 8: Seção "Minhas Comissões" no Perfil

**Files:**
- Modify: `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`

**Contexto:** A página já existe e é longa (~793 linhas). Adicionar uma seção ao final do JSX da página principal (`FranqueadoPerfilPage`).

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar:

```typescript
import { useCommissions } from '@/hooks/useCaixa'
import { useAuthStore } from '@/stores/auth'
```

- [ ] **Step 2: Instanciar hook de comissões no componente principal**

Dentro de `FranqueadoPerfilPage` (componente root, últimas linhas), adicionar:

```typescript
const user = useAuthStore((s) => s.user)
const { data: commissions = [] } = useCommissions(user?.id)
const totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
```

- [ ] **Step 3: Adicionar seção de comissões no JSX**

No return de `FranqueadoPerfilPage`, após o último panel existente, adicionar:

```tsx
{commissions.length > 0 && (
  <div
    className="rounded-2xl p-5 space-y-4"
    style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
  >
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-white">Minhas Comissões</h3>
      <span
        className="text-sm font-bold px-3 py-1 rounded-full"
        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
      >
        Total: {totalCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Data', 'Serviço', 'Cliente', 'Valor Bruto', 'Desconto', '%', 'Comissão'].map((h) => (
              <th
                key={h}
                className="text-left pb-2 pr-4 text-[11px] font-bold uppercase tracking-wide"
                style={{ color: 'hsl(var(--pm-gray-500))' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {commissions.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-400))', fontFamily: 'var(--pm-font-mono)', fontSize: 11 }}>
                {new Date(c.paid_at).toLocaleDateString('pt-BR')}
              </td>
              <td className="py-2 pr-4 text-white">{c.ecu_jobs?.service_type ?? '—'}</td>
              <td className="py-2 pr-4" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                {c.ecu_jobs?.customers?.name ?? '—'}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-300))' }}>
                {c.gross_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap" style={{ color: '#F87171' }}>
                {c.discount_amount > 0
                  ? `- ${c.discount_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : '—'}
              </td>
              <td className="py-2 pr-4" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                {c.commission_rate}%
              </td>
              <td className="py-2 font-semibold whitespace-nowrap" style={{ color: '#4ADE80' }}>
                {c.commission_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -20
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/pages/app/franqueados/FranqueadoPerfilPage.tsx
git commit -m "feat: seção Minhas Comissões no perfil do franqueado"
```

---

## Task 9: Roteamento + Sidebar

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/FranqueadoSidebar.tsx`

- [ ] **Step 1: Adicionar rota Caixa em `src/router/index.tsx`**

Localizar o bloco de imports `lazy` no topo. Adicionar:

```typescript
const CaixaPage = lazy(() => import('@/pages/app/caixa/CaixaPage'))
```

Na seção de rotas da franquia (`/:unitSlug/:agentSlug` → `FranqueadoLayout`), adicionar:

```tsx
{ path: 'caixa', element: <S><CaixaPage /></S> },
```

- [ ] **Step 2: Adicionar NavItem Caixa em `FranqueadoSidebar.tsx`**

No topo do arquivo, adicionar `CreditCard` ao import do lucide-react existente.

No corpo do sidebar, localizar a seção "Gestão" onde estão Clientes, Relatórios, Cadastros. Adicionar antes ou depois de Relatórios:

```tsx
{permFinanceiro.canView && (
  <NavItem to={`${prefix}/caixa`} icon={CreditCard} label="Caixa" collapsed={collapsed} />
)}
```

Onde `permFinanceiro = useModulePermission('financeiro')` — verificar se já está instanciado no componente. Se não, adicionar:

```typescript
const permFinanceiro = useModulePermission('financeiro')
```

- [ ] **Step 3: Verificar TypeScript completo**

```bash
"/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/node_modules/.bin/tsc" --noEmit --project "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/tsconfig.json" 2>&1 | head -30
```

Esperado: 0 erros.

- [ ] **Step 4: Commit final**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
git add src/router/index.tsx src/components/layout/FranqueadoSidebar.tsx
git commit -m "feat: rota /caixa e NavItem Caixa no sidebar da franquia"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ Seção 1 (DB): Task 1
- ✅ Seção 2 (EcuJobForm seller + amount obrigatório): Tasks 3 e 4
- ✅ Seção 3 ("Finalizar e enviar para o financeiro"): Tasks 4 e 5
- ✅ Seção 4 (CaixaPage com desconto limitado): Tasks 6 e 7
- ✅ Seção 5 (Comissões no perfil): Task 8
- ✅ Seção 6 (Sidebar): Task 9
- ✅ Seção 7 (Roteamento): Task 9
- ✅ Seção 8 (Audit labels): Task 2

**Consistência de tipos:**
- `PendingPayment.ecu_jobs.seller` shape corresponde ao que `usePendingPayments` retorna
- `useCommissions` retorna `CommissionEntry[]` com campos idênticos aos usados em `FranqueadoPerfilPage`
- `useRegisterPayment` recebe `commissionRate` do caller — não consulta DB separado (taxa snapshot no momento do pagamento)
- `financial_entries` usa `period_year`/`period_month` (não `year`/`month`) — confirmado no hook existente

**Sem placeholders:** Todos os steps têm código completo.
