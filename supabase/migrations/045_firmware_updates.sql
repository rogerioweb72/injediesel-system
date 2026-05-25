-- 045_firmware_updates.sql
-- Sistema de publicação de atualizações de firmware/software ECU

-- Tipos de equipamento gerenciados pela matriz
create table if not exists equipment_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  active      boolean not null default true,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists equipment_types_slug_idx   on equipment_types (slug);
create index if not exists equipment_types_active_idx on equipment_types (active);

-- Artigos de atualização (um por versão de equipamento)
create table if not exists firmware_updates (
  id           uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment_types(id) on delete cascade,
  version      text not null,
  title        text not null,
  blocks       jsonb not null default '[]',
  published    boolean not null default false,
  published_at timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists firmware_updates_equipment_idx on firmware_updates (equipment_id);
create index if not exists firmware_updates_published_idx on firmware_updates (published);

-- Arquivos de download vinculados a um update (suporta múltiplos)
create table if not exists firmware_update_files (
  id         uuid primary key default gen_random_uuid(),
  update_id  uuid not null references firmware_updates(id) on delete cascade,
  r2_key     text not null,
  file_name  text not null,
  file_size  bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists firmware_update_files_update_idx on firmware_update_files (update_id);

-- Trilha de auditoria de aceites por franquia
create table if not exists firmware_update_acceptances (
  id          uuid primary key default gen_random_uuid(),
  update_id   uuid not null references firmware_updates(id) on delete cascade,
  unit_id     uuid references franchise_units(id) on delete set null,
  user_id     uuid not null references profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  ip_address  text,
  unique (update_id, user_id)
);

create index if not exists firmware_acceptances_update_idx on firmware_update_acceptances (update_id);
create index if not exists firmware_acceptances_user_idx   on firmware_update_acceptances (user_id);

-- Triggers updated_at
create trigger equipment_types_updated_at
  before update on equipment_types
  for each row execute procedure moddatetime(updated_at);

create trigger firmware_updates_updated_at
  before update on firmware_updates
  for each row execute procedure moddatetime(updated_at);

-- RLS: equipment_types
alter table equipment_types enable row level security;

create policy "equip_types_read" on equipment_types
  for select using (auth.uid() is not null and active = true);

create policy "equip_types_admin_write" on equipment_types
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('company_admin', 'operations_admin')
    )
  );

-- RLS: firmware_updates
alter table firmware_updates enable row level security;

create policy "firmware_updates_read_published" on firmware_updates
  for select using (auth.uid() is not null and published = true);

create policy "firmware_updates_admin_all" on firmware_updates
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('company_admin', 'operations_admin')
    )
  );

-- RLS: firmware_update_files
alter table firmware_update_files enable row level security;

create policy "firmware_files_read" on firmware_update_files
  for select using (auth.uid() is not null);

create policy "firmware_files_admin_write" on firmware_update_files
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('company_admin', 'operations_admin')
    )
  );

-- RLS: firmware_update_acceptances
alter table firmware_update_acceptances enable row level security;

create policy "firmware_acceptances_own_read" on firmware_update_acceptances
  for select using (auth.uid() = user_id);

create policy "firmware_acceptances_insert" on firmware_update_acceptances
  for insert with check (auth.uid() = user_id);
-- sem UPDATE/DELETE permitido em aceites
