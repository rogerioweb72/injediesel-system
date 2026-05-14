create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id),
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  metadata   jsonb not null default '{}',
  ip         inet,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on public.audit_logs(entity, entity_id);
create index idx_audit_actor on public.audit_logs(actor_id);
