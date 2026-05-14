create table public.financial_categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('receita','despesa'))
);

create table public.financial_entries (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.financial_categories(id),
  unit_id      uuid references public.franchise_units(id),
  type         text not null check (type in ('receita','despesa')),
  amount       numeric(12,2) not null,
  description  text,
  reference_id uuid,
  period_year  integer not null,
  period_month integer not null check (period_month between 1 and 12),
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index idx_financial_period on public.financial_entries(period_year, period_month);

create table public.monthly_closings (
  id        uuid primary key default gen_random_uuid(),
  unit_id   uuid references public.franchise_units(id),  -- null = matriz
  year      integer not null,
  month     integer not null check (month between 1 and 12),
  closed    boolean not null default false,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  unique (unit_id, year, month)
);

create table public.commissions (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.profiles(id),
  order_id   uuid references public.orders(id),
  amount     numeric(12,2) not null,
  paid       boolean not null default false,
  created_at timestamptz not null default now()
);
