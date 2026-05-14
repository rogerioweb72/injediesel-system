create table public.company_settings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Promax Tuner',
  cnpj       text,
  email      text,
  phone      text,
  address    jsonb,
  updated_at timestamptz not null default now()
);

insert into public.company_settings (name) values ('Promax Tuner');
