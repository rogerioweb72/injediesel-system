create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  document   text,
  email      text,
  phone      text,
  origin     text,
  notes      text,
  unit_id    uuid references public.franchise_units(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_customers_unit on public.customers(unit_id);
create index idx_customers_document on public.customers(document);

create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  vehicle_type public.vehicle_type not null default 'automotivo',
  plate        text,
  brand        text,
  model        text,
  year         integer,
  engine       text,
  notes        text,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index idx_vehicles_customer on public.vehicles(customer_id);
create index idx_vehicles_plate on public.vehicles(plate) where plate is not null;
