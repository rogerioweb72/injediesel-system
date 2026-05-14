create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  protocol    text not null unique,  -- PT-YYYYMM-NNNNNN via trigger
  customer_id uuid references public.customers(id),
  unit_id     uuid references public.franchise_units(id),
  ecu_job_id  uuid references public.ecu_jobs(id),
  category    text not null,
  priority    public.ticket_priority not null default 'media',
  status      public.ticket_status not null default 'aberto',
  assigned_to uuid references public.profiles(id),
  sla_due_at  timestamptz,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tickets_status on public.support_tickets(status);

create or replace function public.generate_ticket_protocol()
returns trigger language plpgsql as $$
declare
  seq integer;
begin
  select coalesce(max(
    cast(split_part(protocol, '-', 3) as integer)
  ), 0) + 1
  into seq
  from public.support_tickets
  where protocol like 'PT-' || to_char(now(), 'YYYYMM') || '-%';

  new.protocol := 'PT-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq::text, 6, '0');
  return new;
end;
$$;

create trigger set_ticket_protocol
  before insert on public.support_tickets
  for each row execute procedure public.generate_ticket_protocol();

create table public.support_messages (
  id        uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id),
  body      text not null,
  created_at timestamptz not null default now()
);
