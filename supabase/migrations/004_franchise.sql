create table public.franchise_units (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  document      text,
  contract_type public.contract_type not null,
  active        boolean not null default true,
  address       jsonb,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table public.franchise_levels (
  id            uuid primary key default gen_random_uuid(),
  contract_type public.contract_type not null unique,
  description   text,
  price_tier    public.price_tier not null
);

insert into public.franchise_levels (contract_type, description, price_tier)
values
  ('full',       'Franqueado Full — acesso completo ao catálogo premium', 'franqueado_full'),
  ('linha_leve', 'Franqueado Linha Leve — catálogo de entrada',           'franqueado_linha_leve');

create table public.user_unit_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid not null references public.franchise_units(id) on delete cascade,
  role    public.user_role not null,
  primary key (user_id, unit_id)
);
