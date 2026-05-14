create table public.ecu_jobs (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers(id),
  vehicle_id          uuid references public.vehicles(id),
  unit_id             uuid references public.franchise_units(id),
  service_type        text not null,
  priority            public.priority_level not null default 'normal',
  status              public.file_status not null default 'recebido',
  problem_description text,
  assigned_to         uuid references public.profiles(id),
  due_at              timestamptz,
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_ecu_jobs_status on public.ecu_jobs(status);
create index idx_ecu_jobs_unit on public.ecu_jobs(unit_id);
create index idx_ecu_jobs_assigned on public.ecu_jobs(assigned_to);

create table public.ecu_job_files (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.ecu_jobs(id) on delete cascade,
  file_type  text not null check (file_type in ('original','entrega')),
  r2_key     text not null,
  file_name  text not null,
  mime_type  text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.ecu_job_events (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.ecu_jobs(id) on delete cascade,
  actor_id   uuid references public.profiles(id),
  event_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
