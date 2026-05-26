# Design: Cadastros Base (Sub-projeto A)

**Data:** 2026-05-25
**Status:** Aprovado

---

## Visão Geral

Nova seção "Cadastros" disponível tanto na matriz quanto nas franquias. Cada unidade gerencia seus próprios fornecedores, formas de pagamento, serviços e categorias financeiras. Os dados são 100% isolados — franquia não vê dados da matriz e vice-versa.

---

## Banco de Dados

### Novas Tabelas

```sql
-- Fornecedores da unidade
fornecedores (
  id               uuid PK default gen_random_uuid()
  unit_id          uuid → franchise_units ON DELETE CASCADE  -- NULL = matriz
  name             text NOT NULL
  document         text              -- CNPJ ou CPF
  contact          text              -- telefone/email livre
  payment_term_days int NOT NULL DEFAULT 30
  notes            text
  active           boolean NOT NULL DEFAULT true
  created_at       timestamptz NOT NULL DEFAULT now()
)

-- Formas de pagamento da unidade
formas_pagamento (
  id               uuid PK default gen_random_uuid()
  unit_id          uuid → franchise_units ON DELETE CASCADE  -- NULL = matriz
  name             text NOT NULL    -- "PIX", "Cartão Crédito 2x", etc.
  fee_percentage   numeric(5,2) NOT NULL DEFAULT 0
  receipt_days     int NOT NULL DEFAULT 0   -- D+0 = pix/dinheiro, D+30 = crédito
  max_installments int NOT NULL DEFAULT 1
  active           boolean NOT NULL DEFAULT true
)

-- Catálogo de serviços gerais (não-ECU)
servicos (
  id             uuid PK default gen_random_uuid()
  unit_id        uuid → franchise_units ON DELETE CASCADE  -- NULL = matriz
  name           text NOT NULL
  description    text
  default_price  numeric(12,2)
  estimated_min  int              -- tempo estimado em minutos
  active         boolean NOT NULL DEFAULT true
  created_at     timestamptz NOT NULL DEFAULT now()
)
```

### Alteração em tabela existente

```sql
-- Adiciona subtipo (fixa/variável) em financial_categories
ALTER TABLE financial_categories
  ADD COLUMN IF NOT EXISTS subtipo text CHECK (subtipo IN ('fixa', 'variavel'));
```

### RLS

Padrão para todas as 3 novas tabelas:

- **Matriz (`is_matrix_admin()`):** lê e escreve TODOS os registros, qualquer `unit_id` (inclusive NULL). A matriz é dona da marca e tem direito de auditoria sobre todos os dados de todas as unidades.
- **Franquia:** lê e escreve apenas registros onde `unit_id = seu_unit_id` (via `user_unit_roles`). Não vê dados de outras franquias nem registros da matriz (`unit_id IS NULL`).
- **Escrita da franquia em registros da matriz:** não permitida — franquia só escreve no próprio `unit_id`.

---

## Frontend

### Estrutura de Arquivos

```
src/pages/app/cadastros/
  CadastrosPage.tsx              ← página raiz: detecta contexto, renderiza tabs
  tabs/
    TabFornecedores.tsx          ← lista + modal criar/editar/desativar
    TabFormasPagamento.tsx       ← lista + modal
    TabServicos.tsx              ← lista + modal
    TabCategorias.tsx            ← lista + modal (usa financial_categories existente + subtipo)

src/hooks/
  useFornecedores.ts             ← useList, useUpsert, useDeactivate
  useFormasPagamento.ts          ← idem
  useServicos.ts                 ← idem
```

### Detecção de Contexto

`CadastrosPage` chama `useMyUnit()`:
- Se retornar `unit_id` → franquia, passa `unitId = myUnit.unit_id`
- Se não retornar → matriz, passa `unitId = null`

Todas as queries filtram por `unitId` com `eq('unit_id', unitId)` (ou `is('unit_id', null)` para matriz).

### Padrão de cada Tab

- Tabela compacta: colunas essenciais + badge ativo/inativo
- Botão "+ Novo" no cabeçalho → abre modal
- Linha da tabela: botão Editar (reabre modal pré-preenchido) + botão Desativar (confirmation dialog → `active = false`, sem DELETE)
- Registros inativos ocultados por padrão; toggle "Exibir inativos" opcional

### Rotas

```typescript
// Matriz — src/router/index.tsx (/:agentSlug children)
{ path: 'cadastros', element: <S><CadastrosPage /></S> }

// Franquia — src/router/index.tsx (/:unitSlug/:agentSlug children)
{ path: 'cadastros', element: <S><CadastrosPage /></S> }
```

### Menu

- `AppShell` (matriz): adicionar item "Cadastros" com ícone `BookOpen` entre Financeiro e Configurações
- `FranqueadoShell` (franquia): adicionar item "Cadastros" com ícone `BookOpen`

---

## Tabs — Conteúdo

### Tab Fornecedores
Colunas: Nome | Documento | Contato | Prazo (dias) | Status

Modal campos: Nome*, Documento, Contato, Prazo de pagamento padrão (dias), Observações

### Tab Formas de Pagamento
Colunas: Nome | Taxa % | Recebimento | Parcelas máx | Status

Modal campos: Nome*, Taxa (%), Recebimento em dias, Parcelas máximas

### Tab Serviços
Colunas: Nome | Preço Padrão | Tempo Est. | Status

Modal campos: Nome*, Descrição, Preço padrão (R$), Tempo estimado (min)

### Tab Categorias
Reusa `financial_categories` existente. Adiciona coluna Subtipo (fixa/variável).

Colunas: Nome | Tipo (receita/despesa) | Subtipo (fixa/variável) | —

Modal campos: Nome*, Tipo*, Subtipo

---

## Fora de Escopo

- Importação em lote (CSV)
- Histórico de alterações por registro
- Formas de pagamento compartilhadas entre unidades
- Integração com gateway de pagamento
- Catálogo de serviços ECU (mantém fluxo próprio via ecu_jobs)
