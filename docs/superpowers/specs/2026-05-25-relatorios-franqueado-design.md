# Design: Relatórios — Saúde da Unidade Franqueada

**Data:** 2026-05-25
**Status:** Aprovado

---

## Visão Geral

Substituir o stub `EmBreve` em `/relatorios` por uma página completa de relatórios da unidade. O franqueado (franchise_manager / unit_operator) acompanha faturamento, custos, margem ECU, mix de serviços, desempenho por cliente e vendedor, e custos de equipe.

---

## Filtro de Período (Global)

Toggle no topo da página: **Mensal** | **Período**.

- **Mensal:** seletor mês + ano (igual ao FinanceiroPage). Converte para `date_from = primeiro dia do mês` e `date_to = último dia do mês`.
- **Período:** dois date inputs (de / até), livre.

O filtro é mantido em estado local da página e passado como props `{ dateFrom: string, dateTo: string }` para todos os tabs. Troca de aba não reseta o período.

---

## Banco de Dados

### Novas Tabelas

```sql
-- Funcionários da unidade
unit_employees (
  id         uuid PK default gen_random_uuid()
  unit_id    uuid NOT NULL → franchise_units ON DELETE CASCADE
  name       text NOT NULL
  position   text NOT NULL    -- cargo: "Técnico ECU", "Vendedor", etc.
  active     boolean NOT NULL DEFAULT true
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Custo mensal por funcionário
unit_employee_costs (
  id          uuid PK default gen_random_uuid()
  employee_id uuid NOT NULL → unit_employees ON DELETE CASCADE
  year        int NOT NULL
  month       int NOT NULL     -- 1–12
  base_salary numeric NOT NULL
  benefits    jsonb NOT NULL DEFAULT '[]'
  -- benefits: [{ "category": "Vale Transporte", "amount": 200.00 }]
  created_at  timestamptz NOT NULL DEFAULT now()
  UNIQUE (employee_id, year, month)
)
```

### Colunas adicionadas em `franchise_units`

```sql
royalty_enabled    boolean NOT NULL DEFAULT false
royalty_percentage numeric NOT NULL DEFAULT 0   -- % sobre faturamento bruto
```

### RLS

- `unit_employees`: SELECT/INSERT/UPDATE → `franchise_manager` e `unit_operator` da própria unidade via `user_unit_roles`. DELETE não permitido — usar `active = false`.
- `unit_employee_costs`: SELECT/INSERT/UPDATE/DELETE → `franchise_manager` e `unit_operator` da própria unidade.
- `franchise_units.royalty_*`: leitura por qualquer autenticado dono da unidade; escrita apenas `company_admin` / `operations_admin` (já coberto pelo RLS existente).

---

## Arquitetura Frontend

### Hooks

**`src/hooks/useUnitEmployees.ts`**
- `useUnitEmployees(unitId)` — lista funcionários ativos da unidade
- `useUpsertUnitEmployee()` — cria ou edita funcionário
- `useDeactivateUnitEmployee()` — seta `active = false`
- `useUnitEmployeeCosts(employeeId, year, month)` — custo de um funcionário num mês
- `useUpsertUnitEmployeeCost()` — grava/atualiza custo mensal

**`src/hooks/useRelatorios.ts`**

Todas as queries são filtradas por `unit_id` + intervalo de datas (`dateFrom`, `dateTo`).

```typescript
interface PeriodFilter {
  dateFrom: string  // ISO date "YYYY-MM-DD"
  dateTo: string    // ISO date "YYYY-MM-DD"
}

useEcuJobsReport(unitId, period)         // ecu_jobs com customer name (join)
useOrdersReport(unitId, period)          // orders + pos_sales totalizados
useCustomersReport(unitId, period)       // customers + job/order counts
useCommissionsReport(unitId, period)     // commissions + seller name
useFinancialEntriesReport(unitId, period) // financial_entries por tipo/categoria
useUnitEmployeeCostsReport(unitId, months: Array<{year: number, month: number}>) // custos de funcionários nos meses contidos no período
```

Agregação feita no cliente (React) — datasets de franquia são pequenos.

### Páginas e Componentes

```
src/pages/app/franqueados/
  RelatoriosPage.tsx                    ← página raiz, filtro global, tabs
  relatorios/
    TabVisaoGeral.tsx
    TabECUArquivos.tsx
    TabClientesVendedores.tsx
    TabEquipeCustos.tsx                 ← inclui gestão de funcionários
    TabFinanceiro.tsx
```

**Charting library:** Recharts (já instalado, `"recharts": "^3.8.1"`).

---

## Conteúdo dos Tabs

### Tab 1 — Visão Geral

KPIs no topo (cards):
- Faturamento bruto = receita ECU + pedidos + financial_entries receita
- Custo total = custo matriz ECU + equipe + comissões + despesas manuais + royalty
- Margem líquida = Faturamento − Custo (R$ e %)
- Jobs ECU concluídos
- Clientes atendidos no período

Gráfico de barras (Recharts `BarChart`): eixo X = dias (modo período) ou dias do mês (modo mensal); duas barras: Receita | Custo.

Mini-rankings:
- Top 3 clientes por faturamento
- Top 3 serviços ECU por quantidade

---

### Tab 2 — ECU & Arquivos

KPIs: total jobs | receita ECU | custo matriz | margem total R$ | margem média %

Tabela por `service_type`:
| Tipo | Qtd | Receita | Custo Matriz | Margem R$ | Margem % |

Funil de status (contagem): recebido → triagem → processamento → concluído → cancelado

Lista paginada de jobs: data | cliente | tipo | R$ cobrado | margem | status

---

### Tab 3 — Clientes & Vendedores

**Seção Clientes:**
- Top 10 por número de jobs ECU no período
- Top 10 por faturamento gerado (ECU + pedidos)
- Novos clientes no período (clientes com `created_at` dentro do range)

**Seção Vendedores:**
Agrupa por `assigned_to` (ecu_jobs) e `created_by` (pos_sales, orders):
| Vendedor | Jobs | Receita ECU | Pedidos | Comissão |

---

### Tab 4 — Equipe & Custos

**Gestão de Funcionários (topo):**
- Lista de funcionários ativos com: nome, cargo, custo do mês selecionado, botões Editar / Lançar Custo
- Botão "+ Novo Funcionário" → modal: nome, cargo
- Modal "Lançar Custo" (por mês): salário base + lista de benefícios com `+ Adicionar benefício` (categoria + valor)
- Custo total do mês por funcionário = base_salary + sum(benefits[].amount)

**Resumo de Custos:**
| Categoria | Valor |
|-----------|-------|
| Salários + benefícios | Σ unit_employee_costs do mês |
| Comissões | Σ commissions.amount no período |
| Despesas manuais | Σ financial_entries.amount tipo despesa |
| **Total** | soma |

---

### Tab 5 — Financeiro

**Receita:**
- ECU: Σ `ecu_jobs.amount_charged_to_customer` (jobs concluídos no período)
- Pedidos: Σ `orders.total` + Σ `pos_sales.total`
- Lançamentos manuais receita: Σ `financial_entries.amount` tipo receita
- Total receita

**Custos:**
- Custo Matriz ECU: Σ `ecu_jobs.amount_charged_by_matrix`
- Equipe: Σ `unit_employee_costs` de todos os (year, month) contidos no intervalo selecionado. O período filter computa os pares `{year, month}` cobertos pelo range e os passa para `useUnitEmployeeCostsReport`.
- Comissões: Σ `commissions.amount`
- Despesas manuais: Σ `financial_entries.amount` tipo despesa por categoria
- Royalty (se `royalty_enabled`): receita_total × royalty_percentage / 100 — exibido como linha separada com badge "Taxa Franqueadora"
- Total custos

**Saldo = Receita − Custos**

Gráfico pizza (Recharts `PieChart`): composição dos custos por categoria.

---

## Fora de Escopo

- Exportar relatório em PDF/Excel
- Comparativo automático com período anterior (pode ser adicionado depois)
- Horas trabalhadas / ocupação de equipe
- Notificações de meta atingida
- Royalty editável pelo próprio franqueado (apenas matriz edita)
