-- Marketing Materials: uploads da matriz, downloads dos franqueados

create table if not exists marketing_materials (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text not null check (category in ('logo','impressos','social_media','identidade_visual')),
  description     text,
  storage_path    text not null,
  file_name       text not null,
  file_type       text not null default '',
  file_size_bytes bigint,
  uploaded_by     uuid references profiles(id) on delete set null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists marketing_materials_category_idx on marketing_materials (category);
create index if not exists marketing_materials_active_idx   on marketing_materials (active);

alter table marketing_materials enable row level security;

-- Franqueados e operadores matriz: leitura de materiais ativos
create policy "mkt_materials_read" on marketing_materials
  for select using (
    auth.uid() is not null
    and active = true
  );

-- Apenas admins/operations da matriz podem gerenciar
create policy "mkt_materials_insert" on marketing_materials
  for insert with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('company_admin','operations_admin')
    )
  );

create policy "mkt_materials_update" on marketing_materials
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('company_admin','operations_admin')
    )
  );

create policy "mkt_materials_delete" on marketing_materials
  for delete using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('company_admin','operations_admin')
    )
  );

create or replace function update_marketing_materials_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_marketing_materials_updated_at
  before update on marketing_materials
  for each row execute function update_marketing_materials_updated_at();

-- Storage bucket: executar via dashboard ou service_role
-- insert into storage.buckets (id, name, public) values ('marketing-materials', 'marketing-materials', true)
-- on conflict (id) do nothing;
