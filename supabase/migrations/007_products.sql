create table public.products (
  id          uuid primary key default gen_random_uuid(),
  sku         text unique,
  name        text not null,
  category    text not null,
  description text,
  stock       integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.product_prices (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tier       public.price_tier not null,
  price      numeric(12,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  unique (product_id, tier)
);

create index idx_product_prices_product on public.product_prices(product_id);
