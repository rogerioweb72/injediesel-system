-- 047_cadastros_base.sql
-- Cadastros base: fornecedores, formas de pagamento, serviços
-- unit_id NULL = matriz; unit_id = UUID = franquia específica
-- Matriz tem acesso a TODOS os registros (auditoria e supervisão)

create table if not exists fornecedores (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid references franchise_units(id) on delete cascade,
  name              text not null,
  document          text,
  contact           text,
  payment_term_days int not null default 30,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists fornecedores_unit_idx    on fornecedores (unit_id);
create index if not exists fornecedores_active_idx  on fornecedores (unit_id, active);

create table if not exists formas_pagamento (
  id               uuid primary key default gen_random_uuid(),
  unit_id          uuid references franchise_units(id) on delete cascade,
  name             text not null,
  fee_percentage   numeric(5,2) not null default 0,
  receipt_days     int not null default 0,
  max_installments int not null default 1,
  active           boolean not null default true
);

create index if not exists formas_pagamento_unit_idx on formas_pagamento (unit_id);

create table if not exists servicos (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid references franchise_units(id) on delete cascade,
  name          text not null,
  description   text,
  default_price numeric(12,2),
  estimated_min int,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists servicos_unit_idx   on servicos (unit_id);
create index if not exists servicos_active_idx on servicos (unit_id, active);

-- Adiciona subtipo em categorias financeiras existentes
alter table financial_categories
  add column if not exists subtipo text check (subtipo in ('fixa', 'variavel'));

-- ── RLS: fornecedores ─────────────────────────────────────────────────────────
alter table fornecedores enable row level security;

create policy "fornecedores_select" on fornecedores
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "fornecedores_insert" on fornecedores
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "fornecedores_update" on fornecedores
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = fornecedores.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- ── RLS: formas_pagamento ─────────────────────────────────────────────────────
alter table formas_pagamento enable row level security;

create policy "formas_pagamento_select" on formas_pagamento
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "formas_pagamento_insert" on formas_pagamento
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "formas_pagamento_update" on formas_pagamento
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = formas_pagamento.unit_id
        and uur.user_id = auth.uid()
    )
  );

-- ── RLS: servicos ─────────────────────────────────────────────────────────────
alter table servicos enable row level security;

create policy "servicos_select" on servicos
  for select using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "servicos_insert" on servicos
  for insert with check (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );

create policy "servicos_update" on servicos
  for update using (
    public.is_matrix_admin()
    or exists (
      select 1 from user_unit_roles uur
      where uur.unit_id = servicos.unit_id
        and uur.user_id = auth.uid()
    )
  );
