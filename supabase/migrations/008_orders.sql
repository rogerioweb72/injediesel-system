create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.customers(id),
  unit_id        uuid references public.franchise_units(id),
  price_tier     public.price_tier not null,
  status         text not null default 'aberto',
  total          numeric(12,2) not null default 0,
  payment_status text not null default 'pendente',
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id),
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null,
  total       numeric(12,2) generated always as (quantity * unit_price) stored
);

create table public.pos_sales (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.customers(id),
  price_tier     public.price_tier not null,
  total          numeric(12,2) not null,
  payment_method text not null,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

create table public.pos_sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.pos_sales(id) on delete cascade,
  product_id  uuid references public.products(id),
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null,
  total       numeric(12,2) generated always as (quantity * unit_price) stored
);
