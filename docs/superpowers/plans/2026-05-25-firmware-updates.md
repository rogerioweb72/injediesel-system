# Firmware Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a página `/atualizacoes` (atualmente um feed de notificações ECU) por um sistema completo de publicação de firmware — matriz publica artigos com blocos ricos por tipo de equipamento; franqueado lê, aceita os termos e baixa o arquivo.

**Architecture:** 4 tabelas Supabase (equipment_types, firmware_updates com JSONB blocks, firmware_update_files, firmware_update_acceptances), novo bucket R2 `promax-firmware` com 3 rotas Worker (upload imagem, upload arquivo, download com verificação de aceite), hook `useFirmwareUpdates`, 3 páginas (franqueado 3 estados, matriz accordion + modal, editor de blocos).

**Tech Stack:** React 19, TanStack Query 5, Supabase Postgres + Auth, Cloudflare R2 + Workers, TypeScript, shadcn/ui, Lucide React, date-fns

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/045_firmware_updates.sql` | Criar | 4 tabelas + RLS + triggers |
| `workers/r2-presign.ts` | Modificar | Bucket FIRMWARE + 3 novas rotas |
| `wrangler.toml` | Modificar | Binding do bucket FIRMWARE |
| `src/lib/r2.ts` | Modificar | 3 funções helper firmware |
| `src/hooks/useFirmwareUpdates.ts` | Criar | Todos os queries + mutations |
| `src/pages/app/franqueados/AtualizacoesPage.tsx` | Substituir | Franqueado — 3 estados |
| `src/pages/app/atualizacoes/AtualizacoesMatrizPage.tsx` | Criar | Matriz — accordion + modal equipamento |
| `src/pages/app/atualizacoes/FirmwareEditorPage.tsx` | Criar | Editor de blocos (matriz) |
| `src/router/index.tsx` | Modificar | Rotas matriz + lazy imports |

---

### Task 1: Migration 045 — 4 tabelas firmware

**Files:**
- Create: `supabase/migrations/045_firmware_updates.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/045_firmware_updates.sql` com o conteúdo completo:

```sql
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
```

- [ ] **Step 2: Confirmar referências de FK**

Verificar que `profiles` e `franchise_units` já existem no banco (criados em migrations anteriores). Abrir qualquer migration >= 010 para confirmar — ambas as tabelas devem estar presentes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/045_firmware_updates.sql
git commit -m "feat: add firmware_updates schema — equipment_types, firmware_updates, files, acceptances (045)"
```

---

### Task 2: Worker — bucket FIRMWARE + 3 rotas

**Files:**
- Modify: `workers/r2-presign.ts`
- Modify: `wrangler.toml`

- [ ] **Step 1: Adicionar FIRMWARE ao wrangler.toml**

Abrir `wrangler.toml`. Após cada bloco de `MKT_MATERIALS` (há 3: default, staging, production), adicionar o binding correspondente:

```toml
# Bloco default (após [[r2_buckets]] MKT_MATERIALS)
[[r2_buckets]]
binding = "FIRMWARE"
bucket_name = "promax-firmware"

# Bloco [env.staging] (após [[env.staging.r2_buckets]] MKT_MATERIALS)
[[env.staging.r2_buckets]]
binding = "FIRMWARE"
bucket_name = "promax-firmware-staging"

# Bloco [env.production] (após [[env.production.r2_buckets]] MKT_MATERIALS)
[[env.production.r2_buckets]]
binding = "FIRMWARE"
bucket_name = "promax-firmware"
```

- [ ] **Step 2: Adicionar FIRMWARE ao tipo Env**

Localizar `export interface Env {` em `workers/r2-presign.ts` (linha 1). Adicionar o campo `FIRMWARE`:

```typescript
export interface Env {
  ECU_ORIGINALS:  R2Bucket
  ECU_DELIVERED:  R2Bucket
  MKT_MATERIALS:  R2Bucket
  FIRMWARE:       R2Bucket          // ← adicionar esta linha
  SUPABASE_URL:   string
  SUPABASE_ANON_KEY: string
  ALLOWED_ORIGIN?: string
}
```

- [ ] **Step 3: Adicionar checkFirmwareAcceptance**

Adicionar esta função antes do bloco do router (antes de `export default {`):

```typescript
// -----------------------------------------------------------------
// Firmware: verifica se o usuário aceitou os termos do update
// -----------------------------------------------------------------
async function checkFirmwareAcceptance(
  userId: string,
  updateId: string,
  env: Env
): Promise<boolean> {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/firmware_update_acceptances?update_id=eq.${updateId}&user_id=eq.${userId}&select=id&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) return false
    const rows = await res.json<Array<{ id: string }>>()
    return rows.length > 0
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Adicionar handleFirmwareImgUpload**

```typescript
// -----------------------------------------------------------------
// Firmware Image Upload — matrix admin only, bucket FIRMWARE/imgs/
// -----------------------------------------------------------------
async function handleFirmwareImgUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden' }, 403, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'Arquivo obrigatório' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const key      = `firmware/imgs/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  await env.FIRMWARE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId },
  })

  return json({ key }, 200, env)
}
```

- [ ] **Step 5: Adicionar handleFirmwareFileUpload**

```typescript
// -----------------------------------------------------------------
// Firmware File Upload — matrix admin only, bucket FIRMWARE/files/
// -----------------------------------------------------------------
async function handleFirmwareFileUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden' }, 403, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'Arquivo obrigatório' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const key      = `firmware/files/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  await env.FIRMWARE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId },
  })

  return json({ key, size: file.size, fileName: safeName }, 200, env)
}
```

- [ ] **Step 6: Adicionar handleFirmwareDownload**

```typescript
// -----------------------------------------------------------------
// Firmware Download — autenticado; exige aceite registrado na tabela
// -----------------------------------------------------------------
async function handleFirmwareDownload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const body = await request.json<{ r2Key: string; updateId: string; fileName?: string }>()
  if (!body.r2Key || !body.updateId) {
    return json({ error: 'r2Key e updateId são obrigatórios' }, 400, env)
  }

  const hasAccepted = await checkFirmwareAcceptance(userId, body.updateId, env)
  if (!hasAccepted) {
    return json({ error: 'Aceite dos termos necessário antes do download' }, 403, env)
  }

  const object = await env.FIRMWARE.get(body.r2Key)
  if (!object) return json({ error: 'Arquivo não encontrado' }, 404, env)

  const fileName = body.fileName ?? body.r2Key.split('/').pop() ?? 'firmware'

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFileName(fileName)}"`,
      ...corsHeaders(env),
    },
  })
}
```

- [ ] **Step 7: Registrar as 3 rotas no switch**

Localizar o `switch (pathname)` no router do Worker. Substituir o bloco completo:

```typescript
switch (pathname) {
  case '/r2-presign-upload':        return handleEcuUpload(request, env)
  case '/r2-presign-download':      return handleEcuDownload(request, env)
  case '/r2-mkt-upload':            return handleMktUpload(request, env)
  case '/r2-mkt-download':          return handleMktDownload(request, env)
  case '/r2-mkt-delete':            return handleMktDelete(request, env)
  case '/r2-firmware-img-upload':   return handleFirmwareImgUpload(request, env)
  case '/r2-firmware-file-upload':  return handleFirmwareFileUpload(request, env)
  case '/r2-firmware-download':     return handleFirmwareDownload(request, env)
  default:                          return json({ error: 'Not found' }, 404, env)
}
```

- [ ] **Step 8: Commit**

```bash
git add workers/r2-presign.ts wrangler.toml
git commit -m "feat: add FIRMWARE R2 bucket and 3 worker routes (img/file upload + download with acceptance check)"
```

---

### Task 3: r2.ts — funções helper firmware

**Files:**
- Modify: `src/lib/r2.ts`

- [ ] **Step 1: Adicionar ao final de src/lib/r2.ts**

```typescript
// -----------------------------------------------------------------
// Firmware — R2 via Worker
// -----------------------------------------------------------------

export interface FirmwareUploadResult {
  key: string
  size?: number
  fileName?: string
}

export async function uploadFirmwareImageToR2(params: {
  file: File
  accessToken: string
}): Promise<FirmwareUploadResult> {
  const form = new FormData()
  form.append('file', params.file, params.file.name)

  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-img-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar imagem: ${text}`)
  }

  return res.json()
}

export async function uploadFirmwareFileToR2(params: {
  file: File
  accessToken: string
}): Promise<FirmwareUploadResult> {
  const form = new FormData()
  form.append('file', params.file, params.file.name)

  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-file-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar arquivo de firmware: ${text}`)
  }

  return res.json()
}

export async function downloadFirmwareFileFromR2(params: {
  r2Key: string
  updateId: string
  fileName: string
  accessToken: string
}): Promise<void> {
  const res = await fetch(`${PRESIGN_API_URL}/r2-firmware-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      r2Key: params.r2Key,
      updateId: params.updateId,
      fileName: params.fileName,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao baixar arquivo: ${text}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "r2.ts" | head -10
```

Expected: sem erros em `src/lib/r2.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/r2.ts
git commit -m "feat: add firmware R2 helpers (uploadFirmwareImageToR2, uploadFirmwareFileToR2, downloadFirmwareFileFromR2)"
```

---

### Task 4: Hook useFirmwareUpdates

**Files:**
- Create: `src/hooks/useFirmwareUpdates.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquipmentType {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  active: boolean
  created_at: string
}

export type BlockType = 'aviso' | 'texto' | 'passos' | 'imagem' | 'video'

export interface Block {
  type: BlockType
  content?: string   // aviso, texto
  items?: string[]   // passos
  r2_key?: string    // imagem
  caption?: string   // imagem
  url?: string       // video
}

export interface FirmwareUpdate {
  id: string
  equipment_id: string
  version: string
  title: string
  blocks: Block[]
  published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FirmwareFile {
  id: string
  update_id: string
  r2_key: string
  file_name: string
  file_size: number | null
  sort_order: number
  created_at: string
}

export interface FirmwareAcceptance {
  id: string
  update_id: string
  unit_id: string | null
  user_id: string
  accepted_at: string
  ip_address: string | null
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente')
  return session.access_token
}

// ─── Equipment Types ──────────────────────────────────────────────────────────

export function useEquipmentTypes() {
  return useQuery({
    queryKey: ['equipment-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('equipment_types')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as EquipmentType[]
    },
  })
}

export function useUpsertEquipmentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<Pick<EquipmentType, 'id'>> & Pick<EquipmentType, 'name' | 'slug'> & { description?: string | null }
    ) => {
      const { data, error } = await (supabase as any)
        .from('equipment_types')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as EquipmentType
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-types'] }),
  })
}

// ─── Firmware Updates ─────────────────────────────────────────────────────────

export function useFirmwareUpdates(equipmentId?: string) {
  return useQuery({
    queryKey: ['firmware-updates', equipmentId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any)
        .from('firmware_updates')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
      if (equipmentId) q = q.eq('equipment_id', equipmentId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FirmwareUpdate[]
    },
  })
}

export function useFirmwareUpdatesAdmin(equipmentId?: string) {
  return useQuery({
    queryKey: ['firmware-updates-admin', equipmentId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any)
        .from('firmware_updates')
        .select('*')
        .order('created_at', { ascending: false })
      if (equipmentId) q = q.eq('equipment_id', equipmentId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FirmwareUpdate[]
    },
  })
}

export function useFirmwareUpdate(updateId?: string) {
  return useQuery({
    queryKey: ['firmware-update', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_updates')
        .select('*')
        .eq('id', updateId)
        .single()
      if (error) throw error
      return data as FirmwareUpdate
    },
  })
}

export function useSaveFirmwareUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      equipment_id: string
      version: string
      title: string
      blocks: Block[]
      published?: boolean
    }) => {
      if (payload.id) {
        const { id, ...rest } = payload
        const update: Record<string, unknown> = { ...rest }
        if (rest.published) update.published_at = new Date().toISOString()
        const { data, error } = await (supabase as any)
          .from('firmware_updates')
          .update(update)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data as FirmwareUpdate
      } else {
        const insert: Record<string, unknown> = { ...payload }
        if (payload.published) insert.published_at = new Date().toISOString()
        const { data, error } = await (supabase as any)
          .from('firmware_updates')
          .insert(insert)
          .select()
          .single()
        if (error) throw error
        return data as FirmwareUpdate
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['firmware-updates'] })
      qc.invalidateQueries({ queryKey: ['firmware-updates-admin'] })
      if (vars.id) qc.invalidateQueries({ queryKey: ['firmware-update', vars.id] })
    },
  })
}

// ─── Firmware Files ───────────────────────────────────────────────────────────

export function useFirmwareFiles(updateId?: string) {
  return useQuery({
    queryKey: ['firmware-files', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_files')
        .select('*')
        .eq('update_id', updateId)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as FirmwareFile[]
    },
  })
}

export function useAddFirmwareFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      update_id: string
      r2_key: string
      file_name: string
      file_size?: number | null
      sort_order?: number
    }) => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_files')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as FirmwareFile
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['firmware-files', vars.update_id] })
    },
  })
}

export function useDeleteFirmwareFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: FirmwareFile) => {
      const { error } = await (supabase as any)
        .from('firmware_update_files')
        .delete()
        .eq('id', file.id)
      if (error) throw error
      return file
    },
    onSuccess: (_data, file) => {
      qc.invalidateQueries({ queryKey: ['firmware-files', file.update_id] })
    },
  })
}

// ─── Acceptances ──────────────────────────────────────────────────────────────

export function useMyAcceptances() {
  return useQuery({
    queryKey: ['firmware-my-acceptances'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_acceptances')
        .select('*')
      if (error) throw error
      return (data ?? []) as FirmwareAcceptance[]
    },
  })
}

export function useAcceptFirmwareUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      update_id: string
      unit_id: string | null
      user_id: string
    }) => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_acceptances')
        .upsert(payload, { onConflict: 'update_id,user_id', ignoreDuplicates: true })
        .select()
        .maybeSingle()
      if (error && error.code !== '23505') throw error
      return data as FirmwareAcceptance | null
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firmware-my-acceptances'] })
    },
  })
}

// ─── Download helper ──────────────────────────────────────────────────────────

export async function downloadFirmwareFile(file: FirmwareFile, updateId: string): Promise<void> {
  const token = await getAccessToken()
  const { downloadFirmwareFileFromR2 } = await import('@/lib/r2')
  await downloadFirmwareFileFromR2({
    r2Key: file.r2_key,
    updateId,
    fileName: file.file_name,
    accessToken: token,
  })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "useFirmwareUpdates\|firmware" | head -15
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFirmwareUpdates.ts
git commit -m "feat: add useFirmwareUpdates hook (equipment types, updates, files, acceptances, download)"
```

---

### Task 5: AtualizacoesPage — substituição completa (franqueado 3 estados)

**Files:**
- Modify (replace): `src/pages/app/franqueados/AtualizacoesPage.tsx`

- [ ] **Step 1: Substituir o arquivo inteiramente**

```tsx
import { useState } from 'react'
import { ArrowLeft, Download, Lock, CheckCircle, Monitor } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useEquipmentTypes,
  useFirmwareUpdates,
  useFirmwareFiles,
  useMyAcceptances,
  useAcceptFirmwareUpdate,
  downloadFirmwareFile,
  type EquipmentType,
  type FirmwareUpdate,
  type Block,
} from '@/hooks/useFirmwareUpdates'
import { useAuth } from '@/hooks/useAuth'
import { useMyUnit } from '@/hooks/useMyUnit'

// ─── Renderização de blocos ───────────────────────────────────────────────────

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'aviso':
      return (
        <div key={index} className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <span className="mt-0.5 text-yellow-400">⚠</span>
          <p className="text-sm text-yellow-200">{block.content}</p>
        </div>
      )
    case 'texto':
      return (
        <div key={index} className="prose prose-invert prose-sm max-w-none">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{block.content}</p>
        </div>
      )
    case 'passos':
      return (
        <ol key={index} className="space-y-2">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-300">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="mt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'imagem': {
      if (!block.r2_key) return null
      return (
        <figure key={index} className="space-y-2">
          <img
            src={`${import.meta.env.VITE_R2_PRESIGN_URL}/r2-firmware-img-serve?key=${encodeURIComponent(block.r2_key)}`}
            alt={block.caption ?? ''}
            className="w-full rounded-lg border border-zinc-700 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {block.caption && (
            <figcaption className="text-center text-xs text-zinc-500">{block.caption}</figcaption>
          )}
        </figure>
      )
    }
    case 'video': {
      const videoId = block.url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
      if (!videoId) return null
      return (
        <div key={index} className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }
    default:
      return null
  }
}

// ─── Estado 3: Artigo + aceite + download ────────────────────────────────────

function ArticleView({
  update,
  equipment,
  onBack,
}: {
  update: FirmwareUpdate
  equipment: EquipmentType
  onBack: () => void
}) {
  const { user } = useAuth()
  const { data: myUnit } = useMyUnit()
  const { data: files = [], isLoading: filesLoading } = useFirmwareFiles(update.id)
  const { data: acceptances = [] } = useMyAcceptances()
  const acceptMutation = useAcceptFirmwareUpdate()

  const [checked, setChecked] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const myAcceptance = acceptances.find((a) => a.update_id === update.id)
  const alreadyAccepted = !!myAcceptance
  const canDownload = alreadyAccepted || checked

  async function handleDownload(fileId: string) {
    const file = files.find((f) => f.id === fileId)
    if (!file || !user) return
    setDownloading(fileId)
    try {
      if (!alreadyAccepted) {
        await acceptMutation.mutateAsync({
          update_id: update.id,
          unit_id: myUnit?.id ?? null,
          user_id: user.id,
        })
      }
      await downloadFirmwareFile(file, update.id)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Versões
      </button>

      <div>
        <h1 className="text-xl font-bold text-white">
          {update.version} — {update.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {equipment.name}
          {update.published_at && (
            <> · {format(new Date(update.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {update.blocks.map((block, i) => renderBlock(block, i))}
      </div>

      {filesLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : files.length > 0 ? (
        <div className="sticky bottom-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl space-y-3">
          {alreadyAccepted ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Aceito em {format(new Date(myAcceptance!.accepted_at), 'dd/MM/yyyy')}
            </div>
          ) : (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                Li todas as instruções e assumo a responsabilidade pela execução segura desta atualização.
              </span>
            </label>
          )}
          <div className="space-y-2">
            {files.map((file) => (
              <Button
                key={file.id}
                disabled={!canDownload || downloading === file.id}
                onClick={() => handleDownload(file.id)}
                className={`w-full gap-2 ${
                  canDownload
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {canDownload ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {downloading === file.id ? 'Baixando...' : file.file_name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Estado 2: Lista de versões ───────────────────────────────────────────────

function VersionList({
  equipment,
  onBack,
  onSelect,
}: {
  equipment: EquipmentType
  onBack: () => void
  onSelect: (update: FirmwareUpdate) => void
}) {
  const { data: updates = [], isLoading } = useFirmwareUpdates(equipment.id)
  const { data: acceptances = [] } = useMyAcceptances()
  const acceptedIds = new Set(acceptances.map((a) => a.update_id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Equipamentos
        </button>
        <span className="text-zinc-600">/</span>
        <span className="text-base font-semibold text-white">{equipment.name}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Monitor className="h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">Nenhuma atualização disponível para este equipamento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => {
            const accepted = acceptedIds.has(update.id)
            return (
              <button
                key={update.id}
                onClick={() => onSelect(update)}
                className="w-full text-left rounded-xl border border-zinc-700 bg-zinc-900 p-4 hover:border-zinc-500 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white text-sm">
                      {update.version} — {update.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {update.published_at
                        ? format(new Date(update.published_at), "d MMM yyyy", { locale: ptBR })
                        : ''}
                      {' · '}
                      {accepted ? 'Aceito' : 'Pendente aceite'}
                    </p>
                  </div>
                  {accepted ? (
                    <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 text-xs">
                      ACEITO
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/40 text-xs">
                      NOVO
                    </Badge>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Estado 1: Cards de equipamentos ─────────────────────────────────────────

export default function AtualizacoesPage() {
  const { data: equipments = [], isLoading } = useEquipmentTypes()
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null)
  const [selectedUpdate, setSelectedUpdate] = useState<FirmwareUpdate | null>(null)

  if (selectedEquipment && selectedUpdate) {
    return (
      <ArticleView
        update={selectedUpdate}
        equipment={selectedEquipment}
        onBack={() => setSelectedUpdate(null)}
      />
    )
  }

  if (selectedEquipment) {
    return (
      <VersionList
        equipment={selectedEquipment}
        onBack={() => setSelectedEquipment(null)}
        onSelect={setSelectedUpdate}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Atualizações de Firmware</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Selecione um equipamento para ver as atualizações disponíveis.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : equipments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Monitor className="h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-500">Em breve</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {equipments.map((eq) => (
            <button
              key={eq.id}
              onClick={() => setSelectedEquipment(eq)}
              className="flex flex-col items-start gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left hover:border-zinc-500 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
                <Monitor className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{eq.name}</p>
                {eq.description && (
                  <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{eq.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "AtualizacoesPage" | head -10
```

Expected: sem erros.

- [ ] **Step 3: Verificar no browser**

Abrir `http://localhost:5173/promax-franquia/anderson-valerio/atualizacoes`. Deve mostrar grid de cards vazio com mensagem "Em breve" (sem erros no console).

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/franqueados/AtualizacoesPage.tsx
git commit -m "feat: replace AtualizacoesPage with franchisee firmware 3-state flow (equipment → versions → article+download)"
```

---

### Task 6: AtualizacoesMatrizPage — gestão de equipamentos

**Files:**
- Create: `src/pages/app/atualizacoes/AtualizacoesMatrizPage.tsx`

- [ ] **Step 1: Criar diretório**

```bash
mkdir -p "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/atualizacoes"
```

- [ ] **Step 2: Criar o arquivo**

```tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Edit2, Zap, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useEquipmentTypes,
  useFirmwareUpdatesAdmin,
  useUpsertEquipmentType,
  type EquipmentType,
  type FirmwareUpdate,
} from '@/hooks/useFirmwareUpdates'

// ─── UpdateRow ────────────────────────────────────────────────────────────────

function UpdateRow({ update, agentSlug }: { update: FirmwareUpdate; agentSlug: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div>
        <p className="text-sm text-white">{update.version} — {update.title}</p>
        <p className="text-xs text-zinc-500">
          {update.published_at
            ? format(new Date(update.published_at), "d MMM yyyy", { locale: ptBR })
            : format(new Date(update.created_at), "d MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {update.published ? (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/40 text-xs">
            Publicado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-zinc-500 text-xs">Rascunho</Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-zinc-400 hover:text-white"
          onClick={() => navigate(`/${agentSlug}/atualizacoes/${update.id}/editar`)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── EquipmentAccordion ───────────────────────────────────────────────────────

function EquipmentAccordion({
  equipment,
  agentSlug,
  onEdit,
}: {
  equipment: EquipmentType
  agentSlug: string
  onEdit: (eq: EquipmentType) => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: updates = [], isLoading } = useFirmwareUpdatesAdmin(equipment.id)

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          className="flex flex-1 items-center gap-3 text-left min-w-0"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{equipment.name}</p>
            {equipment.description && (
              <p className="text-xs text-zinc-500 truncate">{equipment.description}</p>
            )}
          </div>
        </button>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onEdit(equipment)}
          >
            <Edit2 className="mr-1 h-3 w-3" />
            Editar
          </Button>
          <Button
            size="sm"
            className="h-8 bg-red-600 hover:bg-red-700 text-xs"
            onClick={() => navigate(`/${agentSlug}/atualizacoes/${equipment.slug}/novo`)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Update
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-700 px-4 pb-4 pt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : updates.length === 0 ? (
            <p className="py-3 text-center text-xs text-zinc-500">
              Nenhum update criado ainda.
            </p>
          ) : (
            updates.map((u) => (
              <UpdateRow key={u.id} update={u} agentSlug={agentSlug} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── EquipmentModal ───────────────────────────────────────────────────────────

function EquipmentModal({
  equipment,
  open,
  onOpenChange,
}: {
  equipment: EquipmentType | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const upsert = useUpsertEquipmentType()
  const [name, setName] = useState(equipment?.name ?? '')
  const [description, setDescription] = useState(equipment?.description ?? '')

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  async function handleSave() {
    if (!name.trim()) return
    await upsert.mutateAsync({
      ...(equipment?.id ? { id: equipment.id } : {}),
      name: name.trim(),
      slug,
      description: description.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipment ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Scanner X200"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (auto-gerado)</Label>
            <Input value={slug} disabled className="text-zinc-400" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do equipamento"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || upsert.isPending}
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700"
          >
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AtualizacoesMatrizPage() {
  const { agentSlug } = useParams<{ agentSlug: string }>()
  const { data: equipments = [], isLoading } = useEquipmentTypes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null)

  function openNew() {
    setEditingEquipment(null)
    setModalOpen(true)
  }

  function openEdit(eq: EquipmentType) {
    setEditingEquipment(eq)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-400" />
          <h1 className="text-xl font-bold text-white">Firmware</h1>
        </div>
        <Button onClick={openNew} className="bg-red-600 hover:bg-red-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : equipments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Zap className="h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            Nenhum equipamento cadastrado. Clique em "Novo Equipamento" para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {equipments.map((eq) => (
            <EquipmentAccordion
              key={eq.id}
              equipment={eq}
              agentSlug={agentSlug ?? ''}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <EquipmentModal
        equipment={editingEquipment}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "AtualizacoesMatrizPage" | head -10
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/atualizacoes/AtualizacoesMatrizPage.tsx
git commit -m "feat: add matrix firmware management page (accordion per equipment + create/edit equipment modal)"
```

---

### Task 7: FirmwareEditorPage — editor de blocos

**Files:**
- Create: `src/pages/app/atualizacoes/FirmwareEditorPage.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Upload, Loader2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useFirmwareUpdate,
  useFirmwareFiles,
  useSaveFirmwareUpdate,
  useAddFirmwareFile,
  useDeleteFirmwareFile,
  type Block,
  type BlockType,
  type FirmwareFile,
} from '@/hooks/useFirmwareUpdates'
import { supabase } from '@/lib/supabase'
import { uploadFirmwareImageToR2, uploadFirmwareFileToR2 } from '@/lib/r2'

// ─── Block helpers ────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  aviso:  '⚠ Aviso',
  texto:  'P Texto',
  passos: '# Passos',
  imagem: '🖼 Imagem',
  video:  '▶ Vídeo',
}

function defaultBlock(type: BlockType): Block {
  switch (type) {
    case 'aviso':  return { type: 'aviso', content: '' }
    case 'texto':  return { type: 'texto', content: '' }
    case 'passos': return { type: 'passos', items: [''] }
    case 'imagem': return { type: 'imagem', r2_key: '', caption: '' }
    case 'video':  return { type: 'video', url: '' }
  }
}

// ─── Block type editors ───────────────────────────────────────────────────────

function AvisoEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  return (
    <Textarea
      value={block.content ?? ''}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Texto do aviso..."
      rows={3}
      className="bg-zinc-950 border-yellow-500/30 text-yellow-200 placeholder:text-yellow-900"
    />
  )
}

function TextoEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  return (
    <Textarea
      value={block.content ?? ''}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Texto (markdown simples)..."
      rows={5}
      className="bg-zinc-950 font-mono text-sm"
    />
  )
}

function PassosEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const items = block.items ?? ['']

  function updateItem(i: number, val: string) {
    const next = [...items]; next[i] = val
    onChange({ ...block, items: next })
  }

  function addItem() {
    onChange({ ...block, items: [...items, ''] })
  }

  function removeItem(i: number) {
    const next = items.filter((_, idx) => idx !== i)
    onChange({ ...block, items: next.length ? next : [''] })
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {i + 1}
          </span>
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={`Passo ${i + 1}`}
            className="bg-zinc-950 text-sm"
          />
          {items.length > 1 && (
            <button onClick={() => removeItem(i)} className="text-zinc-600 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
        <Plus className="mr-1 h-3 w-3" /> Passo
      </Button>
    </div>
  )
}

function ImagemEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão expirada')
      const result = await uploadFirmwareImageToR2({ file, accessToken: session.access_token })
      onChange({ ...block, r2_key: result.key })
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {block.r2_key ? (
          <p className="flex-1 truncate text-xs text-emerald-400">{block.r2_key}</p>
        ) : (
          <p className="flex-1 text-xs text-zinc-500">Nenhuma imagem selecionada</p>
        )}
        <Button
          variant="outline" size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-7 text-xs"
        >
          {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
          Upload
        </Button>
        <input
          ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
      </div>
      <Input
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Legenda (opcional)"
        className="bg-zinc-950 text-sm"
      />
    </div>
  )
}

function VideoEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  return (
    <Input
      value={block.url ?? ''}
      onChange={(e) => onChange({ ...block, url: e.target.value })}
      placeholder="https://youtube.com/watch?v=..."
      className="bg-zinc-950 text-sm"
    />
  )
}

// ─── BlockEditor wrapper ──────────────────────────────────────────────────────

function BlockEditor({
  block, index, total, onChange, onMove, onDelete,
}: {
  block: Block; index: number; total: number
  onChange: (b: Block) => void
  onMove: (from: number, to: number) => void
  onDelete: (i: number) => void
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-3 ${
      block.type === 'aviso'
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : 'border-zinc-700 bg-zinc-900'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{BLOCK_LABELS[block.type]}</span>
        <div className="flex items-center gap-1">
          <button disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded p-1 text-zinc-500 hover:text-white disabled:opacity-30">
            <ChevronUp className="h-3 w-3" />
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(index, index + 1)} className="rounded p-1 text-zinc-500 hover:text-white disabled:opacity-30">
            <ChevronDown className="h-3 w-3" />
          </button>
          <button onClick={() => onDelete(index)} className="rounded p-1 text-zinc-500 hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {block.type === 'aviso'  && <AvisoEditor  block={block} onChange={onChange} />}
      {block.type === 'texto'  && <TextoEditor  block={block} onChange={onChange} />}
      {block.type === 'passos' && <PassosEditor block={block} onChange={onChange} />}
      {block.type === 'imagem' && <ImagemEditor block={block} onChange={onChange} />}
      {block.type === 'video'  && <VideoEditor  block={block} onChange={onChange} />}
    </div>
  )
}

// ─── FilesSection ─────────────────────────────────────────────────────────────

function FilesSection({ updateId }: { updateId: string | undefined }) {
  const { data: files = [], isLoading } = useFirmwareFiles(updateId)
  const addFile = useAddFirmwareFile()
  const deleteFile = useDeleteFirmwareFile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (!updateId) {
    return <p className="text-xs text-zinc-500">Salve como rascunho primeiro para adicionar arquivos.</p>
  }

  async function handleFile(file: File) {
    if (!updateId) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão expirada')
      const result = await uploadFirmwareFileToR2({ file, accessToken: session.access_token })
      await addFile.mutateAsync({
        update_id: updateId,
        r2_key: result.key,
        file_name: file.name,
        file_size: file.size,
        sort_order: files.length,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : files.length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhum arquivo adicionado.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f: FirmwareFile) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <p className="text-sm text-white truncate">{f.file_name}</p>
              <button onClick={() => deleteFile.mutate(f)} className="flex-shrink-0 text-zinc-500 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline" size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="h-8 text-xs"
      >
        {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
        {uploading ? 'Enviando...' : 'Adicionar arquivo'}
      </Button>
      <input
        ref={fileRef} type="file" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FirmwareEditorPage() {
  const navigate = useNavigate()
  const { agentSlug, equipmentSlug, updateId } = useParams<{
    agentSlug: string
    equipmentSlug?: string
    updateId?: string
  }>()

  const isEditing = !!updateId && updateId !== 'novo'
  const { data: existingUpdate, isLoading: loadingUpdate } = useFirmwareUpdate(
    isEditing ? updateId : undefined
  )
  const save = useSaveFirmwareUpdate()

  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [savedId, setSavedId] = useState<string | undefined>(isEditing ? updateId : undefined)

  useEffect(() => {
    if (existingUpdate) {
      setVersion(existingUpdate.version)
      setTitle(existingUpdate.title)
      setBlocks(existingUpdate.blocks ?? [])
      setSavedId(existingUpdate.id)
    }
  }, [existingUpdate])

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, defaultBlock(type)])
  }

  function updateBlock(index: number, block: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)))
  }

  function moveBlock(from: number, to: number) {
    setBlocks((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function deleteBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(publish: boolean) {
    if (!version.trim() || !title.trim()) return

    let equipmentId = existingUpdate?.equipment_id ?? ''

    if (!equipmentId && equipmentSlug) {
      const { data } = await (supabase as any)
        .from('equipment_types')
        .select('id')
        .eq('slug', equipmentSlug)
        .single()
      equipmentId = data?.id ?? ''
    }

    if (!equipmentId) {
      console.error('equipment_id não resolvido')
      return
    }

    const result = await save.mutateAsync({
      id: savedId,
      equipment_id: equipmentId,
      version: version.trim(),
      title: title.trim(),
      blocks,
      published: publish,
    })

    setSavedId(result.id)
    if (publish) navigate(`/${agentSlug}/atualizacoes`)
  }

  if (isEditing && loadingUpdate) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/${agentSlug}/atualizacoes`)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Firmware
        </button>
        <span className="text-zinc-600">/</span>
        <span className="text-sm font-medium text-white">
          {isEditing ? 'Editar Update' : 'Novo Update'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Versão</Label>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v2.1.0"
            className="bg-zinc-950"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Correção de leitura OBD"
            className="bg-zinc-950"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Conteúdo</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Bloco
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.entries(BLOCK_LABELS) as [BlockType, string][]).map(([type, label]) => (
                <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 py-8 text-center text-xs text-zinc-500">
            Clique em "+ Bloco" para adicionar conteúdo
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <BlockEditor
                key={i}
                block={block}
                index={i}
                total={blocks.length}
                onChange={(b) => updateBlock(i, b)}
                onMove={moveBlock}
                onDelete={deleteBlock}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Arquivos para download</Label>
        <FilesSection updateId={savedId} />
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={!version.trim() || !title.trim() || save.isPending}
          onClick={() => handleSave(false)}
          className="flex-1"
        >
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar rascunho
        </Button>
        <Button
          disabled={!version.trim() || !title.trim() || save.isPending}
          onClick={() => handleSave(true)}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          Publicar
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | grep "FirmwareEditorPage" | head -10
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/atualizacoes/FirmwareEditorPage.tsx
git commit -m "feat: add firmware block editor page (aviso/texto/passos/imagem/video, file upload, draft/publish)"
```

---

### Task 8: Router — rotas da matriz + lazy imports

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Adicionar lazy imports**

Localizar o bloco de imports lazy perto das linhas 39+ de `src/router/index.tsx`. Adicionar após a linha do `AtualizacoesPage`:

```typescript
const AtualizacoesMatrizPage = lazy(() => import('@/pages/app/atualizacoes/AtualizacoesMatrizPage'))
const FirmwareEditorPage     = lazy(() => import('@/pages/app/atualizacoes/FirmwareEditorPage'))
```

- [ ] **Step 2: Adicionar rotas da matriz**

Localizar o bloco de rotas da matriz (que contém `{ path: 'materiais', element: <S><MateriaisMatrizPage /></S> }` por volta da linha 148). Adicionar logo após essa linha:

```typescript
{ path: 'atualizacoes',                                 element: <S><AtualizacoesMatrizPage /></S> },
{ path: 'atualizacoes/:equipmentSlug/novo',             element: <S><FirmwareEditorPage /></S> },
{ path: 'atualizacoes/:updateId/editar',                element: <S><FirmwareEditorPage /></S> },
```

- [ ] **Step 3: Verificar TypeScript completo**

```bash
cd "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 erros.

- [ ] **Step 4: Verificar no browser — franqueado**

Abrir `http://localhost:5173/promax-franquia/anderson-valerio/atualizacoes`. Deve aparecer a nova página de firmware com grid de equipamentos (vazio, exibindo "Em breve"). Sem erros de console.

- [ ] **Step 5: Verificar no browser — matriz**

Abrir `http://localhost:5173/<agentSlug>/atualizacoes` com o slug do agente da matriz. Deve aparecer a página com botão "Novo Equipamento" e lista vazia.

- [ ] **Step 6: Commit**

```bash
git add src/router/index.tsx
git commit -m "feat: add matrix firmware routes (accordion + editor) to router"
```

---

## Self-Review — Cobertura da Spec

**Spec vs. Plano:**

| Requisito da Spec | Task |
|-------------------|------|
| Tabelas: equipment_types, firmware_updates, firmware_update_files, firmware_update_acceptances | Task 1 |
| JSONB blocks com 5 tipos | Tasks 1, 4, 7 |
| Constraint UNIQUE(update_id, user_id) em acceptances | Task 1 |
| RLS granular por role | Task 1 |
| Bucket promax-firmware + wrangler.toml | Task 2 |
| POST /r2-firmware-img-upload (matrix admin) | Task 2 |
| POST /r2-firmware-file-upload (matrix admin) | Task 2 |
| POST /r2-firmware-download (auth + verifica aceite) | Task 2 |
| r2.ts — helpers firmware | Task 3 |
| Hook: equipment types, updates, files, acceptances | Task 4 |
| Franqueado Estado 1: cards de equipamentos | Task 5 |
| Franqueado Estado 2: lista de versões + badges NOVO/ACEITO | Task 5 |
| Franqueado Estado 3: artigo + blocos + aceite + download | Task 5 |
| Checkbox desmarcado → botão locked | Task 5 |
| Click download → POST aceite → download R2 | Task 5 |
| Se já aceitou → badge data + download direto | Task 5 |
| Matriz: accordion por equipamento | Task 6 |
| Modal: criar/editar equipamento com slug auto-gerado | Task 6 |
| Editor: campos versão + título | Task 7 |
| Editor: 5 tipos de bloco com edição inline | Task 7 |
| Editor: upload de imagem → R2 no bloco imagem | Task 7 |
| Editor: seção de arquivos com upload + delete | Task 7 |
| Editor: botões "Salvar rascunho" e "Publicar" | Task 7 |
| Router: rotas matriz para accordion + editor | Task 8 |

**Fora de escopo confirmado** (não implementado intencionalmente):
- Notificações push de nova publicação
- Versionamento/diff entre versões
- Comentários por update
- Update obrigatório que bloqueia operação

**Nota sobre imagens em produção:** O bloco `imagem` usa a rota `/r2-firmware-img-serve` para exibir imagens no artigo — esta rota serve conteúdo públicamente (necessária para `<img src=...>`). O Worker precisará de uma rota extra para isso no deploy. Para desenvolvimento local, as imagens não aparecerão corretamente (worker local necessário), mas não quebrarão — o `onError` esconde a tag.
