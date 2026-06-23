# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Plataforma operacional 100% independente para performance automotiva, remapeamento e ECU.
> Sem vínculos com Injediesel ou Promax Peças. Integrações externas somente via API/webhook em fase posterior.

> **Design aprovado:** `src/pages/LandingV2.tsx` (rota `/v2`) é a referência visual canônica.
> `Landing.tsx` (rota `/`) está **descartada** — não usar como referência.
> Toda nova UI deve seguir o estilo de `LandingV2`: dark `#141416`, vermelho `hsl(var(--pm-red-500))`, Barlow Condensed + DM Sans + JetBrains Mono.

---

## Comandos

```bash
npm run dev          # servidor de dev (Vite)
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run preview      # preview do build
npm run test         # Vitest (unit)
npm run test:ui      # Vitest com UI
npx playwright test  # testes E2E
```

Mock mode (sem Supabase):
```bash
VITE_MOCK=true npm run dev   # usa src/mocks/index.ts — dados falsos, sem conexão real
```

Supabase local:
```bash
supabase start       # inicia local (docker)
supabase db reset    # reaplica todas as migrations + seed
supabase migration new <nome>   # nova migration
```

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + Vite + TypeScript | React 19, Vite 8, TS ~6 |
| UI | Tailwind CSS + shadcn/ui + lucide-react | Tailwind 3.4 |
| Estado | TanStack Query + Zustand (pontual) | TQ 5, Zustand 5 |
| Roteamento | React Router | v7 |
| Forms | React Hook Form + Zod | RHF 7, Zod 4 |
| Backend | Supabase Postgres + Edge Functions | JS SDK v2 |
| Auth | Supabase Auth | sessão + refresh automático |
| Storage ECU | Cloudflare R2 | presigned URLs — expiração curta |
| Storage leve | Supabase Storage | anexos de tickets de suporte |
| Testes unit | Vitest + Testing Library | Vitest 4 |
| Testes E2E | Playwright | 1.60+ |
| Charts | Recharts | 3.x |

---

## Estrutura de Arquivos

```
promax-tuner/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                     # design system --pm-* tokens (fonte da verdade)
│   ├── lib/
│   │   ├── supabase.ts               # singleton Supabase client
│   │   ├── r2.ts                     # presigned URL helpers (upload/download)
│   │   └── utils.ts                  # cn(), formatCurrency(), formatDate()
│   ├── types/
│   │   ├── database.ts               # tipos gerados do schema Supabase
│   │   └── app.ts                    # UserRole enum, AppUser, Price Tier, etc.
│   ├── stores/
│   │   └── auth.ts                   # Zustand: session + profile
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProfile.ts
│   │   ├── useUsers.ts
│   │   ├── useAuditLog.ts
│   │   ├── useCompanySettings.ts
│   │   ├── useCustomers.ts
│   │   ├── useVehicles.ts
│   │   ├── useProducts.ts
│   │   ├── useFranchiseUnits.ts
│   │   ├── useEcuJobs.ts
│   │   ├── useEcuFiles.ts
│   │   ├── useOrders.ts
│   │   ├── useFinancial.ts
│   │   └── useSupportTickets.ts
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (gerado via CLI — não editar manualmente)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # wrapper: sidebar + topbar + outlet
│   │   │   ├── Sidebar.tsx           # navegação fixa esquerda
│   │   │   ├── TopBar.tsx            # header: título, notif, avatar
│   │   │   └── NavItem.tsx           # item de nav com active state
│   │   ├── auth/
│   │   │   ├── AuthGuard.tsx         # redireciona se não autenticado
│   │   │   └── RoleGuard.tsx         # renderiza filho só se role permitido
│   │   └── shared/
│   │       ├── MetricCard.tsx
│   │       ├── CommandCard.tsx
│   │       ├── StatusBadge.tsx / EcuStatusBadge.tsx
│   │       ├── PriceTierBadge.tsx
│   │       ├── DataTable.tsx         # busca + filtro + paginação + empty + ações
│   │       ├── EmptyState.tsx
│   │       ├── PageHeader.tsx
│   │       └── ConfirmDialog.tsx     # obrigatório para ações críticas/destrutivas
│   ├── mocks/
│   │   └── index.ts                  # setupMocks() — ativo com VITE_MOCK=true
│   ├── pages/
│   │   ├── Landing.tsx               # site público Promax Tuner
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   └── app/
│   │       ├── Dashboard.tsx         # command center
│   │       ├── clientes/
│   │       ├── produtos/
│   │       ├── franqueados/
│   │       ├── arquivos/             # fila ECU
│   │       ├── pdv/
│   │       ├── pedidos/
│   │       ├── suporte/
│   │       ├── financeiro/
│   │       └── configuracoes/        # CompanyTab + UsersTab
│   └── router/
│       └── index.tsx                 # rotas + lazy loading + guards
├── supabase/
│   ├── config.toml
│   └── migrations/                   # 001–014 já existem
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.local                        # nunca comitar
└── .env.example                      # template de variáveis
```

---

## Design System

Arquivo canônico: `src/index.css`. 4 camadas: **Primitivos HSL → Semânticos (shadcn/ui compatível) → Componentes → Utilitários**.

**Prefixo `--pm-*`** para todos os tokens Promax Tuner — nunca colide com shadcn/ui.

### Tokens obrigatórios (não alterar sem discussão)

```css
--pm-red-500:   0 74% 42%;   /* #E72B2B — cor primária de marca */
--pm-gray-950:  222 8%  8%;  /* #141416 — fundo principal */
```

### Fontes

- Display/headings: `Barlow Condensed` (700–900, uppercase)
- Body: `DM Sans`
- Mono: `JetBrains Mono`

### Classes prontas (definidas em `src/index.css`)

| Classe | Uso |
|--------|-----|
| `.pm-kpi-card` | KPI cards do Command Center |
| `.pm-quick-card--{blue\|green\|red}` | atalhos rápidos coloridos |
| `.pm-sidebar-item` | item de nav com active bar vermelha |
| `.pm-badge--{success\|warning\|danger\|info\|neutral\|premium\|live}` | badges padronizados |
| `.pm-status--{pending\|processing\|ready\|delivered\|error}` | status ECU |
| `.pm-skeleton` | skeleton loader com shimmer |
| `.pm-stagger` | animação staggered para listas |

### Padrão de layout

- Sidebar fixa à esquerda: Ações rápidas, Operação, Loja, Comercial, Financeiro, Sistema
- Header: título da rota, badge de ambiente, notificações, status online, avatar
- Grid 12 colunas: 24px desktop / 16px tablet
- Botões primários: vermelho (`--brand-red`); secundários: card escuro com borda; destrutivos: exigem ConfirmDialog
- Tabelas: busca + filtro + paginação + empty state + coluna de ações
- Formulários: validação em tempo real, botão salvar bloqueado com erro

---

## RBAC — Perfis de Acesso

```
company_admin      → Matriz — tudo: config, auditoria, visão completa
operations_admin   → Matriz — ECU, clientes, franqueados, filas
finance_admin      → Matriz — financeiro, DRE, fechamento, impostos
support_agent      → Matriz — tickets, chat, retorno técnico, SLA
seller             → Matriz/Loja — PDV, catálogo, pedidos
franchise_manager  → Franquia — dashboard unidade, ECU, carteira
unit_operator      → Franquia — operação diária restrita à unidade
auditor            → Leitura — logs, relatórios, histórico (sem edição)
```

- Guarda de rota: `<AuthGuard>` + `<RoleGuard roles={[...]}>` em toda rota protegida
- Isolamento de franquia: RLS por `unit_id` — franqueado nunca acessa dados de outra unidade
- Profile do usuário em `src/stores/auth.ts` (Zustand) — disponível via `useProfile()`

---

## Banco de Dados — Tabelas-chave

```
profiles              → auth.users 1:1 — name, role, active
company_settings      → config global da empresa
franchise_units       → unidades de franquia (contract_type: full | linha_leve)
franchise_levels      → níveis de franquia + price_tier de referência
user_unit_roles       → relação user ↔ unit com role específica
customers             → clientes (unit_id null = cliente direto da matriz)
vehicles              → veículos vinculados a clientes (4 tipos)
ecu_jobs              → jobs de remapeamento/ECU (core do negócio)
ecu_job_files         → arquivos R2 vinculados ao job (original | entrega)
ecu_job_events        → timeline de eventos do job
products              → catálogo de produtos (sku único, soft delete)
product_prices        → 3 faixas de preço por produto
orders                → pedidos comerciais
order_items           → itens do pedido (total gerado/stored)
pos_sales             → vendas PDV
pos_sale_items        → itens da venda PDV
financial_categories  → categorias de lançamento (receita | despesa)
financial_entries     → lançamentos financeiros (IMUTÁVEIS para não-admin)
monthly_closings      → fechamento mensal (bloqueia mutations do período)
commissions           → comissões de vendedores
support_tickets       → tickets (protocolo PT-YYYYMM-NNNNNN via trigger)
support_messages      → mensagens de cada ticket
audit_logs            → log imutável de ações (insert via service_role apenas)
```

### RLS: regras obrigatórias

- RLS ativo em TODAS as tabelas de negócio
- `audit_logs`: INSERT apenas via `service_role`; SELECT só `company_admin` e `auditor`; sem UPDATE/DELETE nunca
- `product_prices`: franqueado vê apenas o tier do seu contrato — nunca vê tiers de outros
- `financial_entries`: imutável para perfis não-admin (sem UPDATE/DELETE via RLS)
- `monthly_closings.closed = true` bloqueia qualquer mutation do período via Edge Function

### Tipos de veículo

```
automotivo        → placa obrigatória → lookup automático em apiplacas.com.br
maquina_agricola  → campo placa oculto → formulário manual
maquina_pesada    → campo placa oculto → formulário manual
nautica           → campo placa oculto → formulário manual
```

### Faixas de preço (price_tier)

```
franqueado_full          → contrato full
franqueado_linha_leve    → contrato linha leve
cliente_final            → site público e não autenticados
```

PDV na matriz: ao inserir CPF/CNPJ → Edge Function detecta `franchise_units.contract_type` → retorna preços do tier correto. Isolamento em RLS + Edge Function — nunca depende só do frontend.

---

## Integrações

| Integração | Uso | Onde |
|-----------|-----|------|
| Supabase | Banco, auth, edge functions | `src/lib/supabase.ts` |
| Cloudflare R2 | Arquivos ECU (original + entrega) | `src/lib/r2.ts` |
| apiplacas.com.br | Lookup de placa → auto-fill veículo automotivo | `src/hooks/useBrasilAPI.ts` ⚠️ hook desatualizado — usar `https://apiplacas.com.br` |
| Email transacional | Recuperação, alertas, suporte | Resend ou Sendgrid (Fase 2) |

### Variáveis de ambiente (`.env.local`)

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_ECU_ORIGINALS=promax-ecu-originals
R2_BUCKET_ECU_DELIVERED=promax-ecu-delivered
```

---

## Anti-patterns Proibidos

| ❌ Nunca fazer | ✅ Correto |
|---------------|-----------|
| Calcular preço, desconto, comissão ou total no frontend | Sempre via Edge Function server-side |
| Salvar URL direta do R2 em `ecu_job_files` | Salvar apenas `r2_key` (chave do objeto) |
| Fazer UPDATE/DELETE em `audit_logs` | Log é append-only via service_role |
| Exibir tier de preço de outro contrato ao franqueado | RLS + Edge Function garantem isolamento |
| Criar mutation em período com `monthly_closings.closed = true` | Bloquear via Edge Function antes de qualquer operação |
| Expor URL longa de presigned URL no estado do cliente por tempo indefinido | Presigned URL tem expiração curta — gerar sob demanda |
| Editar arquivos em `src/components/ui/` manualmente | shadcn/ui — só via CLI (`npx shadcn@latest add`) |
| Cálculo de `order_items.total` no frontend | Coluna `generated always as (quantity * unit_price) stored` |
| Usar `brasilapi.com.br` para lookup de placa | Usar `https://apiplacas.com.br` |

---

## Convenções de Código

### Hooks
- Um hook por entidade (`useCustomers`, `useEcuJobs`, etc.)
- TanStack Query para todas as chamadas Supabase (`useQuery`, `useMutation`)
- `queryKey` sempre inclui entidade + filtros relevantes
- `invalidateQueries` após mutações bem-sucedidas

### Componentes
- Pasta `shared/` = componentes reutilizáveis cross-feature
- Pasta `ui/` = shadcn/ui apenas
- Pasta `layout/` = AppShell e partes do layout global
- Props tipadas com interface explícita — sem `any`
- Todo estado de loading/error/empty implementado

### Ações críticas
- Sempre exigem `<ConfirmDialog>` antes de executar
- Sempre registram em `audit_logs` (via trigger ou Edge Function)
- Exemplos: delete de cliente, cancelamento de job ECU, fechamento financeiro

### Formulários
- React Hook Form + Zod schema
- Validação em tempo real
- Botão salvar desabilitado enquanto há erro de validação
- Mensagens de erro claras (pt-BR)

### Rotas protegidas
```tsx
<AuthGuard>
  <RoleGuard roles={['company_admin', 'operations_admin']}>
    <MinhaPagina />
  </RoleGuard>
</AuthGuard>
```

### Nomenclatura
- Componentes: PascalCase
- Hooks: `use` + camelCase
- Arquivos de página: PascalCase.tsx
- Arquivos de hook: camelCase.ts
- SQL/migrations: snake_case

---

## Roteamento

Todas as rotas autenticadas usam prefixo `/matriz/`. Exemplos:

```
/matriz/dashboard
/matriz/clientes          → /matriz/clientes/novo  → /matriz/clientes/:id/editar
/matriz/produtos          → /matriz/produtos/novo  → /matriz/produtos/:id/editar
/matriz/franqueados       → /matriz/franqueados/:id
/matriz/arquivos          → /matriz/arquivos/novo  → /matriz/arquivos/:id
/matriz/pdv
/matriz/pedidos
/matriz/suporte           → /matriz/suporte/novo   → /matriz/suporte/:id
/matriz/financeiro
/matriz/configuracoes
```

Todas as rotas protegidas são lazy-loaded com `<Suspense>`.

---

## Fase Atual de Desenvolvimento

**Fases 0–6 — IMPLEMENTADAS** (Foundation → Backoffice completo)
- Todas as páginas e rotas estão ativas: clientes, produtos, franqueados, ECU/arquivos, PDV, pedidos, suporte, financeiro, configurações
- 14 migrations no banco (001–014)

**Fase 7–8:** QA, hardening, produção

---

## Definition of Done (por tela/módulo)

1. Layout conforme design system (`--pm-*` tokens, dark theme)
2. Rota protegida por `AuthGuard` + `RoleGuard`
3. RLS ativo com constraints e índices mínimos no banco
4. Formulários com validação em tempo real e mensagens claras
5. Estados loading, empty, success e error implementados
6. Ações críticas com `ConfirmDialog` + registro em `audit_logs`
7. Testes manuais documentados, bugs críticos corrigidos
8. Deploy em staging validado antes de produção
