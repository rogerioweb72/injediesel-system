# ECU Seller Assignment, Finance Flow & Commission Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar seleção de vendedor nos jobs ECU, fluxo de envio ao financeiro após conclusão, fechamento de caixa com desconto limitado, e rastreamento de comissões por vendedor.

**Architecture:** Quatro subsistemas encadeados — (1) seller_id no job ECU, (2) botão "Finalizar e enviar para o financeiro" na detail da franquia, (3) página CaixaPage para registrar pagamento com desconto, (4) comissões calculadas no pagamento e exibidas no perfil do vendedor.

**Tech Stack:** React 19, TypeScript, Supabase Postgres, TanStack Query 5, Tailwind CSS com tokens `--pm-*`

---

## 1. Banco de Dados

### 1.1 `ecu_jobs` — adicionar seller_id
```sql
ALTER TABLE ecu_jobs ADD COLUMN seller_id UUID REFERENCES profiles(id);
```
- Nullable. NULL = venda da empresa sem vendedor atribuído.

### 1.2 `financial_entries` — vincular ao job + status de pagamento
```sql
ALTER TABLE financial_entries
  ADD COLUMN ecu_job_id UUID REFERENCES ecu_jobs(id),
  ADD COLUMN status VARCHAR NOT NULL DEFAULT 'pago',
  ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_method VARCHAR;
```
- `status`: `'pendente'` (aguardando caixa) | `'pago'` (registrado)
- Entradas legacy ficam com `status='pago'` (retrocompat via DEFAULT).

### 1.3 `commission_entries` — nova tabela
```sql
CREATE TABLE commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecu_job_id UUID REFERENCES ecu_jobs(id) NOT NULL,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- `commission_amount = (gross_amount - discount_amount) * commission_rate / 100`
- Criada somente no momento do pagamento (nunca provisória).

### 1.4 `franchise_units` — limite de desconto
```sql
ALTER TABLE franchise_units
  ADD COLUMN max_discount_pct DECIMAL(5,2) NOT NULL DEFAULT 10;
```
- Default 10%. Gerente/admin edita em Configurações da unidade.

---

## 2. Formulário ECU — Seleção de Vendedor + Valor Obrigatório

**Arquivo:** `src/pages/app/arquivos/EcuJobForm.tsx`
**Hook:** `src/hooks/useEcuJobs.ts`

### 2.1 Campo vendedor
- Select opcional logo abaixo do campo cliente.
- Opções: `useUsers()` filtrado por `unit_id === job.unit_id` e role `unit_seller`.
- Primeira opção: "Empresa (sem vendedor)" → `seller_id = null`.
- Visível apenas na franquia (`isFranchise`).

### 2.2 Campo `amount_charged_to_customer`
- Já existe no formulário, mas era opcional.
- Passa a ser **obrigatório** com validação `z.number().min(0.01, 'Informe o valor cobrado')`.
- Validação no schema Zod existente.

### 2.3 `CreatePayload` no hook
```typescript
interface CreatePayload {
  // ...campos existentes...
  seller_id?: string | null
}
```
- Hook passa `seller_id` no insert.

---

## 3. Botão "Finalizar e enviar para o financeiro"

**Arquivo:** `src/pages/app/arquivos/EcuJobDetail.tsx`
**Hook novo:** `src/hooks/useFinancialEntries.ts` (ou extend existente)

### 3.1 Condição de exibição (visão franquia)
```
job.status === 'concluido'
&& !job.financial_entry_id   (sem entrada pendente/paga já criada)
&& isFranchise
```
- `financial_entry_id` é inferido via join: `financial_entries.ecu_job_id = job.id`.
- Se entrada já existe: exibe badge "Aguardando caixa" (status pendente) ou "Pago" (status pago).

### 3.2 Ação do botão
Mutation `useSendToFinance(jobId)`:
```typescript
// INSERT financial_entries
{
  type: 'receita',
  status: 'pendente',
  amount: job.amount_charged_to_customer,
  ecu_job_id: job.id,
  unit_id: job.unit_id,
  description: `ECU: ${job.service_type} — ${job.customers?.name}`,
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  discount_amount: 0,
  payment_method: null,
}
```
- Audit: `entity='ecu_job', action='sent_to_finance', metadata={ amount }`
- Invalida query `['ecu-job', jobId]`.

---

## 4. Página Caixa (Franquia)

**Arquivo novo:** `src/pages/app/caixa/CaixaPage.tsx`
**Hook novo:** `src/hooks/useCaixa.ts`
**Rota:** `/:unitSlug/:agentSlug/caixa`
**Sidebar:** visível para `finance_staff`, `unit_manager`, `franchise_manager`

### 4.1 Lista de cobranças pendentes
```typescript
// Query
supabase.from('financial_entries')
  .select('*, ecu_jobs(id, service_type, amount_charged_to_customer, seller_id, customers(name))')
  .eq('unit_id', myUnit.unit_id)
  .eq('status', 'pendente')
  .order('created_at', { ascending: false })
```

Cada item exibe: cliente, serviço, data, valor, vendedor (se houver).

### 4.2 Sheet "Registrar Pagamento"
Campos:
- **Forma de pagamento** — select: `Dinheiro | Cartão Débito | Cartão Crédito | PIX | Transferência`
- **Desconto (%)** — input numérico, 0–`unit.max_discount_pct`
  - Se valor digitado > `max_discount_pct`: campo vermelho, botão desabilitado, mensagem `"Desconto acima do limite autorizado (máx X%)"`
- **Valor final** — exibição calculada: `amount * (1 - discount/100)`

### 4.3 Mutation `useRegisterPayment`
```typescript
async ({ entryId, paymentMethod, discountPct, jobId, sellerId, grossAmount, unitId }) => {
  const discountAmount = grossAmount * (discountPct / 100)
  const netAmount = grossAmount - discountAmount

  // 1. Atualiza financial_entry
  await supabase.from('financial_entries').update({
    status: 'pago',
    payment_method: paymentMethod,
    discount_amount: discountAmount,
    amount: netAmount,
  }).eq('id', entryId)

  // 2. Cria commission_entry se houver vendedor
  if (sellerId) {
    const { commission_rate } = await getSellerRate(sellerId)
    await supabase.from('commission_entries').insert({
      ecu_job_id: jobId,
      seller_id: sellerId,
      gross_amount: grossAmount,
      discount_amount: discountAmount,
      commission_rate,
      commission_amount: netAmount * (commission_rate / 100),
    })
  }
}
```
- Audit: `entity='financial_entry', action='payment_registered', metadata={ paymentMethod, discountPct, netAmount }`
- Invalida queries `['caixa-pendentes']` e `['commission-entries', sellerId]`.

---

## 5. Comissões no Perfil do Vendedor

**Arquivo:** `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`
**Hook novo:** `src/hooks/useCommissions.ts`

### 5.1 Exibição
Seção "Minhas Comissões" exibida se:
- Usuário logado tem `commission_entries` com `seller_id = user.id`, OU
- Role é `unit_seller`

### 5.2 Conteúdo
- **Total acumulado** — soma de todos `commission_amount`
- **Tabela histórico:**

| Data | Serviço | Cliente | Valor bruto | Desconto | % | Comissão |
|---|---|---|---|---|---|---|

### 5.3 Query
```typescript
supabase.from('commission_entries')
  .select('*, ecu_jobs(service_type, customers(name))')
  .eq('seller_id', user.id)
  .order('created_at', { ascending: false })
```

---

## 6. Sidebar Franquia — Item Caixa

**Arquivo:** `src/components/layout/FranqueadoSidebar.tsx`

Adicionar NavItem:
```tsx
{(permFinanceiro.canView) && (
  <NavItem to={`${prefix}/caixa`} icon={CreditCard} label="Caixa" collapsed={collapsed} />
)}
```
`permFinanceiro` = `useModulePermission('financeiro')` — já usado para finance_staff/manager.

---

## 7. Roteamento

**Arquivo:** `src/router/index.tsx`

Adicionar na seção franqueado:
```tsx
const CaixaPage = lazy(() => import('@/pages/app/caixa/CaixaPage'))
// ...
{ path: 'caixa', element: <S><CaixaPage /></S> },
```

---

## 8. Audit Log

Novos eventos:
- `entity='ecu_job', action='sent_to_finance'` — quando franquia envia para caixa
- `entity='financial_entry', action='payment_registered'` — quando caixa registra pagamento

Adicionar ao `ENTITY_LABELS` em `useAuditLog.ts`:
```typescript
commission_entry: 'Comissão'
```
Adicionar ao `ACTION_LABELS`:
```typescript
sent_to_finance: 'Enviou para financeiro',
payment_registered: 'Registrou pagamento',
```
