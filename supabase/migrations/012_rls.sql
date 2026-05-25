-- Habilitar RLS em todas as tabelas de negócio
alter table public.profiles enable row level security;
alter table public.franchise_units enable row level security;
alter table public.user_unit_roles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.ecu_jobs enable row level security;
alter table public.ecu_job_files enable row level security;
alter table public.ecu_job_events enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;
alter table public.financial_entries enable row level security;
alter table public.monthly_closings enable row level security;
alter table public.commissions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: verificar role do usuário atual
create or replace function public.current_user_role()
returns public.user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Helper: verificar se é perfil de matriz
create or replace function public.is_matrix_user()
returns boolean language sql security definer stable as $$
  select role in ('company_admin','operations_admin','finance_admin','support_agent','seller')
  from public.profiles where id = auth.uid()
$$;

-- ── PROFILES ──────────────────────────────────────────
create policy "profiles_read_own" on public.profiles
  for select using (
    id = auth.uid()
    or public.current_user_role() in ('company_admin','operations_admin')
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- ── FRANCHISE UNITS ────────────────────────────────────
create policy "franchise_units_matrix_all" on public.franchise_units
  for all using (public.is_matrix_user());

create policy "franchise_units_member_read" on public.franchise_units
  for select using (
    exists (
      select 1 from public.user_unit_roles
      where user_id = auth.uid() and unit_id = franchise_units.id
    )
  );

-- ── CUSTOMERS ──────────────────────────────────────────
create policy "customers_matrix_all" on public.customers
  for all using (public.is_matrix_user());

create policy "customers_unit_member" on public.customers
  for all using (
    unit_id in (
      select unit_id from public.user_unit_roles where user_id = auth.uid()
    )
  );

-- ── VEHICLES ───────────────────────────────────────────
create policy "vehicles_via_customer" on public.vehicles
  for all using (
    public.is_matrix_user()
    or customer_id in (
      select id from public.customers
      where unit_id in (
        select unit_id from public.user_unit_roles where user_id = auth.uid()
      )
    )
  );

-- ── ECU JOBS ───────────────────────────────────────────
create policy "ecu_jobs_matrix_all" on public.ecu_jobs
  for all using (public.is_matrix_user());

create policy "ecu_jobs_unit_member" on public.ecu_jobs
  for all using (
    unit_id in (
      select unit_id from public.user_unit_roles where user_id = auth.uid()
    )
  );

-- ── PRODUCTS: SELECT público para cliente_final ────────
create policy "products_public_read" on public.products
  for select using (active = true);

create policy "products_matrix_write" on public.products
  for all using (
    public.current_user_role() in ('company_admin','operations_admin','seller')
  );

-- ── PRODUCT PRICES: isolamento por tier ───────────────
create policy "product_prices_cliente_final" on public.product_prices
  for select using (tier = 'cliente_final');

create policy "product_prices_full_franchise" on public.product_prices
  for select using (
    tier = 'franqueado_full'
    and exists (
      select 1 from public.franchise_units fu
      join public.user_unit_roles uur on uur.unit_id = fu.id
      where uur.user_id = auth.uid() and fu.contract_type = 'full'
    )
  );

create policy "product_prices_leve_franchise" on public.product_prices
  for select using (
    tier = 'franqueado_linha_leve'
    and exists (
      select 1 from public.franchise_units fu
      join public.user_unit_roles uur on uur.unit_id = fu.id
      where uur.user_id = auth.uid() and fu.contract_type = 'linha_leve'
    )
  );

create policy "product_prices_matrix_all" on public.product_prices
  for all using (public.is_matrix_user());

-- ── ORDERS ─────────────────────────────────────────────
create policy "orders_matrix_all" on public.orders
  for all using (public.is_matrix_user());

create policy "orders_unit_read" on public.orders
  for select using (
    unit_id in (
      select unit_id from public.user_unit_roles where user_id = auth.uid()
    )
  );

-- ── FINANCIAL ENTRIES: imutável para não-admin ─────────
create policy "financial_matrix_read" on public.financial_entries
  for select using (
    public.current_user_role() in ('company_admin','finance_admin','operations_admin')
  );

create policy "financial_admin_write" on public.financial_entries
  for insert with check (
    public.current_user_role() in ('company_admin','finance_admin')
  );

-- ── AUDIT LOGS: insert via service_role; select restrito ─
create policy "audit_logs_select" on public.audit_logs
  for select using (
    public.current_user_role() in ('company_admin','auditor')
  );

-- ── SUPPORT TICKETS ────────────────────────────────────
create policy "tickets_matrix_all" on public.support_tickets
  for all using (public.is_matrix_user());

create policy "tickets_unit_own" on public.support_tickets
  for all using (
    unit_id in (
      select unit_id from public.user_unit_roles where user_id = auth.uid()
    )
  );
