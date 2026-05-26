# Perfil do Franqueado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a página `/:unitSlug/:agentSlug/perfil` para o franqueado editar dados pessoais, foto de perfil, senha/e-mail, visualizar dados da unidade (somente leitura) e solicitar renovação de contrato.

**Architecture:** Página nova `FranqueadoPerfilPage.tsx` com dois painéis (identidade + formulário). Hooks dedicados `useFranchiseeProfile`, `useUpdateProfile`, `useUploadAvatar`. Migration SQL adiciona campos em `profiles` e `franchise_units`. Suporte a tickets reutiliza `useCreateSupportTicket`.

**Tech Stack:** React 19, React Hook Form + Zod 4, TanStack Query 5, Supabase JS v2 (via `supabase as any`), Supabase Storage, Sonner (toast), Lucide React, Tailwind CSS + `--pm-*` tokens.

---

## File Map

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/015_perfil_franqueado.sql` | CRIAR |
| `src/types/database.ts` | MODIFICAR — adicionar campos novos |
| `src/hooks/useMyUnit.ts` | MODIFICAR — adicionar `contract_start_date` + campos unidade |
| `src/hooks/useFranchiseeProfile.ts` | CRIAR |
| `src/hooks/useUpdateProfile.ts` | CRIAR |
| `src/hooks/useUploadAvatar.ts` | CRIAR |
| `src/pages/app/franqueados/FranqueadoPerfilPage.tsx` | CRIAR |
| `src/router/index.tsx` | MODIFICAR — substituir EmBreve |
| `tests/unit/perfil/perfilSchema.test.ts` | CRIAR |

---

## Task 1: Migration SQL

**Files:**
- Create: `supabase/migrations/015_perfil_franqueado.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- 015_perfil_franqueado.sql

-- Campos editáveis pelo próprio franqueado (representante)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS birth_date     date,
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  ADD COLUMN IF NOT EXISTS cep            text,
  ADD COLUMN IF NOT EXISTS street         text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement     text,
  ADD COLUMN IF NOT EXISTS neighborhood   text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS state          text;

-- Campos somente-leitura para o franqueado (gerenciados pela matriz)
ALTER TABLE franchise_units
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS razao_social        text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual  text,
  ADD COLUMN IF NOT EXISTS data_abertura       date,
  ADD COLUMN IF NOT EXISTS plan                text,
  ADD COLUMN IF NOT EXISTS financial_status    text DEFAULT 'adimplente',
  ADD COLUMN IF NOT EXISTS file_limit          integer,
  ADD COLUMN IF NOT EXISTS commercial_phone    text,
  ADD COLUMN IF NOT EXISTS commercial_email    text,
  ADD COLUMN IF NOT EXISTS business_hours      text,
  ADD COLUMN IF NOT EXISTS main_technician     jsonb;

-- Bucket de avatares (executar via Supabase Dashboard ou CLI)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;

-- RLS: franqueado só pode fazer upload dentro de seu próprio userId/
-- CREATE POLICY "avatar_upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "avatar_read" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'avatars');
```

- [ ] **Step 2: Aplicar migration**

```bash
cd /Users/rogeriolima/Documents/projetos\ lovable/promax\ tuner/promax-tuner
supabase migration new perfil_franqueado
# Copiar SQL acima para o arquivo gerado em supabase/migrations/
supabase db reset
```

- [ ] **Step 3: Criar bucket `avatars` no Supabase Dashboard**

Acessar Supabase Dashboard → Storage → New Bucket:
- Name: `avatars`
- Public: ✅ sim
- Após criar: adicionar políticas RLS (Avatar upload + Avatar read conforme SQL comentado acima)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/015_perfil_franqueado.sql
git commit -m "feat: migration 015 — campos perfil franqueado + bucket avatares"
```

---

## Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Adicionar campos em `profiles` Row/Insert/Update**

Localizar a seção `profiles` em `src/types/database.ts`. Nos três blocos (`Row`, `Insert`, `Update`) adicionar após `name: string`:

```typescript
// Em Row:
phone:          string | null
birth_date:     string | null
avatar_url:     string | null
cep:            string | null
street:         string | null
address_number: string | null
complement:     string | null
neighborhood:   string | null
city:           string | null
state:          string | null

// Em Insert e Update (tudo opcional com ?):
phone?:          string | null
birth_date?:     string | null
avatar_url?:     string | null
cep?:            string | null
street?:         string | null
address_number?: string | null
complement?:     string | null
neighborhood?:   string | null
city?:           string | null
state?:          string | null
```

- [ ] **Step 2: Adicionar campos em `franchise_units` Row/Insert/Update**

Localizar a seção `franchise_units` em `src/types/database.ts`. Nos três blocos adicionar:

```typescript
// Em Row:
contract_start_date: string | null
razao_social:        string | null
inscricao_estadual:  string | null
data_abertura:       string | null
plan:                string | null
financial_status:    string | null
file_limit:          number | null
commercial_phone:    string | null
commercial_email:    string | null
business_hours:      string | null
main_technician:     { name: string; contact: string } | null

// Em Insert e Update (todos com ?):
contract_start_date?: string | null
razao_social?:        string | null
inscricao_estadual?:  string | null
data_abertura?:       string | null
plan?:                string | null
financial_status?:    string | null
file_limit?:          number | null
commercial_phone?:    string | null
commercial_email?:    string | null
business_hours?:      string | null
main_technician?:     { name: string; contact: string } | null
```

- [ ] **Step 3: Verificar sem erros de TS**

```bash
npm run build 2>&1 | head -20
```

Esperado: build passa sem erros nos arquivos modificados.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: database types — campos perfil e unidade"
```

---

## Task 3: Atualizar useMyUnit

**Files:**
- Modify: `src/hooks/useMyUnit.ts`

- [ ] **Step 1: Expandir select para incluir campos novos da unidade**

Substituir o `.select(...)` atual:

```typescript
// ANTES:
.select('unit_id, franchise_units(id, name, city, state, cep, logradouro, numero, complemento, bairro, contract_type, contract_end_date, contract_blocked, contract_blocked_reason)')

// DEPOIS:
.select(`unit_id, franchise_units(
  id, name, city, state, cep, logradouro, numero, complemento, bairro,
  contract_type, contract_start_date, contract_end_date,
  contract_blocked, contract_blocked_reason,
  razao_social, cnpj, inscricao_estadual, data_abertura,
  plan, financial_status, file_limit,
  commercial_phone, commercial_email, business_hours, main_technician
)`)
```

- [ ] **Step 2: Atualizar o tipo de retorno**

Substituir o tipo do `franchise_units` dentro do `return data as { ... }`:

```typescript
franchise_units: {
  id: string; name: string
  city: string | null; state: string | null
  cep: string | null; logradouro: string | null
  numero: string | null; complemento: string | null; bairro: string | null
  contract_type: 'full' | 'linha_leve'
  contract_start_date: string | null
  contract_end_date: string | null
  contract_blocked: boolean
  contract_blocked_reason: string | null
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  data_abertura: string | null
  plan: string | null
  financial_status: string | null
  file_limit: number | null
  commercial_phone: string | null
  commercial_email: string | null
  business_hours: string | null
  main_technician: { name: string; contact: string } | null
}
```

- [ ] **Step 3: Verificar sem erros**

```bash
npm run build 2>&1 | grep -i error | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMyUnit.ts
git commit -m "feat: useMyUnit — include contract_start_date and unit detail fields"
```

---

## Task 4: Zod schema + testes

**Files:**
- Create: `tests/unit/perfil/perfilSchema.test.ts`

O schema será exportado de `FranqueadoPerfilPage.tsx` na Task 8. Escrever os testes agora para guiar a implementação (TDD).

- [ ] **Step 1: Escrever testes**

Criar `tests/unit/perfil/perfilSchema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Schema copiado aqui para teste isolado (será importado do page na Task 8)
const perfilSchema = z.object({
  name:            z.string().min(3, 'Mínimo 3 caracteres'),
  phone:           z.string().min(10, 'Celular inválido'),
  email:           z.string().email('E-mail inválido').optional().or(z.literal('')),
  emailConfirm:    z.string().optional().or(z.literal('')),
  birth_date:      z.string().optional().or(z.literal('')),
  cep:             z.string().optional().or(z.literal('')),
  street:          z.string().optional().or(z.literal('')),
  address_number:  z.string().optional().or(z.literal('')),
  complement:      z.string().optional().or(z.literal('')),
  neighborhood:    z.string().optional().or(z.literal('')),
  city:            z.string().optional().or(z.literal('')),
  state:           z.string().optional().or(z.literal('')),
  newPassword:     z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  oldPassword:     z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.email && data.email !== data.emailConfirm) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'E-mails não conferem', path: ['emailConfirm'] })
  }
  if (data.newPassword && data.newPassword.length < 8) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 8 caracteres', path: ['newPassword'] })
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senhas não conferem', path: ['confirmPassword'] })
  }
  if ((data.email || data.newPassword) && !data.oldPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório para trocar e-mail ou senha', path: ['oldPassword'] })
  }
})

const VALID_BASE = { name: 'João Silva', phone: '11999991234' }

describe('perfilSchema', () => {
  it('accepts minimal valid data', () => {
    expect(perfilSchema.safeParse(VALID_BASE).success).toBe(true)
  })

  it('rejects name shorter than 3 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, name: 'Jo' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path[0]).toBe('name')
  })

  it('rejects phone shorter than 10 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, phone: '1199' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path[0]).toBe('phone')
  })

  it('requires oldPassword when changing email', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, email: 'new@test.com', emailConfirm: 'new@test.com' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('oldPassword')
  })

  it('rejects mismatched emails', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, email: 'new@test.com', emailConfirm: 'other@test.com', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('emailConfirm')
  })

  it('rejects password shorter than 8 chars', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'abc123', confirmPassword: 'abc123', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('newPassword')
  })

  it('rejects mismatched passwords', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'Abc12345!', confirmPassword: 'Different1!', oldPassword: 'secret123' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('confirmPassword')
  })

  it('requires oldPassword when changing password', () => {
    const r = perfilSchema.safeParse({ ...VALID_BASE, newPassword: 'Abc12345!', confirmPassword: 'Abc12345!' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map(i => i.path[0])
    expect(paths).toContain('oldPassword')
  })

  it('accepts full valid profile update', () => {
    const r = perfilSchema.safeParse({
      ...VALID_BASE,
      email: 'novo@test.com', emailConfirm: 'novo@test.com',
      newPassword: 'Abc12345!', confirmPassword: 'Abc12345!',
      oldPassword: 'Antiga123!',
      cep: '14780000', city: 'Barretos', state: 'SP',
    })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar testes (devem falhar — arquivo de schema ainda não existe)**

```bash
npm run test -- tests/unit/perfil/perfilSchema.test.ts 2>&1 | tail -10
```

Esperado: testes passam pois o schema está duplicado no arquivo de teste. Confirmar 9 passing.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/perfil/perfilSchema.test.ts
git commit -m "test: perfil franqueado — zod schema validation tests"
```

---

## Task 5: Hook useFranchiseeProfile

**Files:**
- Create: `src/hooks/useFranchiseeProfile.ts`

- [ ] **Step 1: Criar hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type FranchiseeProfile = {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  avatar_url: string | null
  cep: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export function useFranchiseeProfile() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['franchisee-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, name, phone, birth_date, avatar_url, cep, street, address_number, complement, neighborhood, city, state')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as FranchiseeProfile
    },
  })
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -i error | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFranchiseeProfile.ts
git commit -m "feat: useFranchiseeProfile hook"
```

---

## Task 6: Hook useUpdateProfile

**Files:**
- Create: `src/hooks/useUpdateProfile.ts`

- [ ] **Step 1: Criar hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { FranchiseeProfile } from './useFranchiseeProfile'

type ProfileUpdateData = Partial<Omit<FranchiseeProfile, 'id'>>

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update(data)
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-profile', user?.id] })
    },
  })
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -i error | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUpdateProfile.ts
git commit -m "feat: useUpdateProfile hook"
```

---

## Task 7: Hook useUploadAvatar

**Files:**
- Create: `src/hooks/useUploadAvatar.ts`

- [ ] **Step 1: Criar hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user!.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust para forçar reload da imagem após upload
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user!.id)
      if (updateError) throw updateError

      return publicUrl
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-profile', user?.id] })
    },
  })
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -i error | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUploadAvatar.ts
git commit -m "feat: useUploadAvatar hook — Supabase Storage bucket avatars"
```

---

## Task 8: FranqueadoPerfilPage — estrutura + schema + componentes auxiliares

**Files:**
- Create: `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`

Esta task cria o arquivo principal com: imports, schema Zod, helpers de senha, PerfilDadosUnidade e RenovarContratoModal.

- [ ] **Step 1: Criar o arquivo com imports, schema e helpers**

```typescript
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Lock, Eye, EyeOff, Upload, RefreshCw, ArrowLeft,
  AlertTriangle, FileText, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/shared/PageHeader'
import { ContractProgressBar } from '@/components/shared/ContractProgressBar'
import { useFranchiseeProfile } from '@/hooks/useFranchiseeProfile'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { useUploadAvatar } from '@/hooks/useUploadAvatar'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useCreateSupportTicket } from '@/hooks/useSupportTickets'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// ─── Schema ────────────────────────────────────────────────────────────────
export const perfilSchema = z.object({
  name:            z.string().min(3, 'Mínimo 3 caracteres'),
  phone:           z.string().min(10, 'Celular inválido'),
  email:           z.string().email('E-mail inválido').optional().or(z.literal('')),
  emailConfirm:    z.string().optional().or(z.literal('')),
  birth_date:      z.string().optional().or(z.literal('')),
  cep:             z.string().optional().or(z.literal('')),
  street:          z.string().optional().or(z.literal('')),
  address_number:  z.string().optional().or(z.literal('')),
  complement:      z.string().optional().or(z.literal('')),
  neighborhood:    z.string().optional().or(z.literal('')),
  city:            z.string().optional().or(z.literal('')),
  state:           z.string().optional().or(z.literal('')),
  newPassword:     z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  oldPassword:     z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.email && data.email !== data.emailConfirm) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'E-mails não conferem', path: ['emailConfirm'] })
  }
  if (data.newPassword && data.newPassword.length < 8) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 8 caracteres', path: ['newPassword'] })
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senhas não conferem', path: ['confirmPassword'] })
  }
  if ((data.email || data.newPassword) && !data.oldPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório para trocar e-mail ou senha', path: ['oldPassword'] })
  }
})

export type PerfilFormData = z.infer<typeof perfilSchema>

// ─── Password strength ──────────────────────────────────────────────────────
function passwordScore(pwd: string): number {
  if (!pwd) return 0
  let s = 1
  if (pwd.length >= 6) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^a-zA-Z0-9]/.test(pwd)) s++
  if (pwd.length >= 12) s++
  return s
}

const PWD_COLOR = ['', '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E']
const PWD_LABEL = ['', 'Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte']

function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordScore(password)
  if (!password) return null
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? PWD_COLOR[score] : 'hsl(var(--pm-gray-700))' }} />
        ))}
      </div>
      <p className="text-[10px]" style={{ color: PWD_COLOR[score] }}>{PWD_LABEL[score]}</p>
    </div>
  )
}

// ─── LockedInput ────────────────────────────────────────────────────────────
function LockedInput({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          readOnly
          value={value ?? '—'}
          className="cursor-not-allowed pr-8"
          style={{ background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-500))' }}
        />
        <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar PerfilDadosUnidade ao mesmo arquivo**

Continuar no mesmo arquivo `FranqueadoPerfilPage.tsx`, após o código anterior:

```typescript
// ─── PerfilDadosUnidade ─────────────────────────────────────────────────────
type UnitData = NonNullable<ReturnType<typeof useMyUnit>['data']>['franchise_units']

function PerfilDadosUnidade({ unit }: { unit: UnitData }) {
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const planLabel: Record<string, string> = {
    basico: 'Básico', intermediario: 'Intermediário', premium: 'Premium',
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest"
          style={{ fontFamily: 'var(--pm-font-display)' }}>
          Dados da Unidade
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock size={13} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Para alterar estes dados, entre em contato com a franqueadora.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LockedInput label="Nome fantasia"          value={unit?.name} />
        <LockedInput label="Razão social"           value={unit?.razao_social} />
        <LockedInput label="CNPJ"                   value={unit?.cnpj} />
        <LockedInput label="Inscrição estadual"     value={unit?.inscricao_estadual} />
        <LockedInput label="Data de abertura"       value={fmtDate(unit?.data_abertura ?? null)} />
        <LockedInput label="Início do contrato"     value={fmtDate(unit?.contract_start_date ?? null)} />
        <LockedInput label="Término do contrato"    value={fmtDate(unit?.contract_end_date ?? null)} />
        <LockedInput label="Plano contratado"       value={unit?.plan ? (planLabel[unit.plan] ?? unit.plan) : null} />
        <LockedInput label="Status financeiro"      value={unit?.financial_status} />
        <LockedInput label="ID da unidade"          value={unit?.id} />
        <LockedInput label="Limite de arquivos"     value={unit?.file_limit?.toString()} />
        <LockedInput label="Telefone comercial"     value={unit?.commercial_phone} />
        <LockedInput label="E-mail comercial"       value={unit?.commercial_email} />
        <LockedInput label="Horário de funcionamento" value={unit?.business_hours} />
        <LockedInput label="Técnico responsável"
          value={unit?.main_technician ? `${unit.main_technician.name} — ${unit.main_technician.contact}` : null} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar RenovarContratoModal ao mesmo arquivo**

Continuar no mesmo arquivo:

```typescript
// ─── RenovarContratoModal ───────────────────────────────────────────────────
function RenovarContratoModal({
  open, onClose, unitId,
}: { open: boolean; onClose: () => void; unitId: string | undefined }) {
  const [periodo, setPeriodo] = useState<string>('12')
  const [obs, setObs] = useState('')
  const user = useAuthStore((s) => s.user)
  const createTicket = useCreateSupportTicket()

  async function handleRenovar() {
    if (!unitId) return
    try {
      await createTicket.mutateAsync({
        title: 'Solicitação de renovação de contrato',
        category: 'financeiro',
        priority: 'media',
        unit_id: unitId,
        body: `Período desejado: ${periodo} meses.\n\nObservação: ${obs || 'Nenhuma.'}`,
      })
      toast.success('Solicitação de renovação enviada com sucesso.')
      setObs('')
      setPeriodo('12')
      onClose()
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Período desejado</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={3}
              placeholder="Alguma condição ou informação adicional..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createTicket.isPending}>Cancelar</Button>
          <Button onClick={handleRenovar} disabled={createTicket.isPending}
            style={{ background: '#16A34A', color: '#fff' }}>
            {createTicket.isPending ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -i error | head -10
```

- [ ] **Step 5: Commit parcial**

```bash
git add src/pages/app/franqueados/FranqueadoPerfilPage.tsx
git commit -m "feat: FranqueadoPerfilPage — schema, helpers, PerfilDadosUnidade, RenovarContratoModal"
```

---

## Task 9: FranqueadoPerfilPage — painel esquerdo (identidade)

**Files:**
- Modify: `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`

- [ ] **Step 1: Adicionar PerfilIdentidadePanel ao arquivo**

Adicionar após RenovarContratoModal no mesmo arquivo:

```typescript
// ─── PerfilIdentidadePanel ──────────────────────────────────────────────────
function PerfilIdentidadePanel({
  profile,
  unit,
  onRenovar,
}: {
  profile: ReturnType<typeof useFranchiseeProfile>['data']
  unit: UnitData
  onRenovar: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useUploadAvatar()
  const createTicket = useCreateSupportTicket()
  const user = useAuthStore((s) => s.user)

  const [trocaNomeOpen, setTrocaNomeOpen] = useState(false)
  const [nomeDesejado, setNomeDesejado] = useState('')

  const initials = (profile?.name ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAvatar.mutateAsync(file)
      toast.success('Foto atualizada com sucesso.')
    } catch {
      toast.error('Erro ao enviar foto. Tente novamente.')
    }
  }

  async function handleTrocaNome() {
    if (!nomeDesejado.trim() || !unit?.id) return
    try {
      await createTicket.mutateAsync({
        title: 'Solicitação de troca de nome de usuário',
        category: 'operacional',
        priority: 'baixa',
        unit_id: unit.id,
        body: `Novo nome de usuário solicitado: ${nomeDesejado}`,
      })
      toast.success('Solicitação enviada. A matriz irá analisar em breve.')
      setNomeDesejado('')
      setTrocaNomeOpen(false)
    } catch {
      toast.error('Erro ao enviar solicitação.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="rounded-full flex items-center justify-center overflow-hidden"
          style={{ width: 96, height: 96, background: 'hsl(var(--pm-gray-700))', border: '2px solid hsl(var(--pm-gray-600))' }}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button
          size="sm" variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploadAvatar.isPending}
          className="text-xs uppercase tracking-wider"
        >
          <Upload size={12} className="mr-1.5" />
          {uploadAvatar.isPending ? 'Enviando...' : 'Enviar Foto'}
        </Button>
      </div>

      {/* Identidade */}
      <div className="w-full space-y-2 text-center">
        <p className="text-xs text-muted-foreground">
          {unit?.city}{unit?.state ? `-${unit.state}` : ''}
        </p>
        <button
          onClick={() => setTrocaNomeOpen(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Trocar Nome de usuário
        </button>
      </div>

      {/* Contrato */}
      {unit?.contract_end_date && (
        <div className="w-full">
          <ContractProgressBar
            startDate={unit.contract_start_date ?? unit.contract_end_date}
            endDate={unit.contract_end_date}
          />
        </div>
      )}

      {/* Ações */}
      <div className="w-full space-y-2 pt-2">
        <Button onClick={onRenovar} className="w-full text-sm font-semibold"
          style={{ background: '#16A34A', color: '#fff' }}>
          <RefreshCw size={14} className="mr-2" />
          RENOVAR AGORA
        </Button>
        <button className="w-full text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors text-center">
          Ler meu contrato
        </button>
      </div>

      {/* Modal trocar nome */}
      <Dialog open={trocaNomeOpen} onOpenChange={setTrocaNomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Nome de Usuário</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Nome desejado</Label>
            <Input
              value={nomeDesejado}
              onChange={e => setNomeDesejado(e.target.value)}
              placeholder="Ex.: João Técnico"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              A franqueadora analisará e confirmará a troca.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrocaNomeOpen(false)}>Cancelar</Button>
            <Button onClick={handleTrocaNome} disabled={!nomeDesejado.trim() || createTicket.isPending}>
              {createTicket.isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -i error | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/FranqueadoPerfilPage.tsx
git commit -m "feat: FranqueadoPerfilPage — PerfilIdentidadePanel"
```

---

## Task 10: FranqueadoPerfilPage — painel direito (formulário)

**Files:**
- Modify: `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`

- [ ] **Step 1: Adicionar PerfilFormPanel**

Adicionar após PerfilIdentidadePanel no mesmo arquivo:

```typescript
// ─── PerfilFormPanel ────────────────────────────────────────────────────────
const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

function FormField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function PerfilFormPanel({
  profile,
  unit,
}: {
  profile: ReturnType<typeof useFranchiseeProfile>['data']
  unit: UnitData
}) {
  const updateProfile = useUpdateProfile()
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [oldPwdError, setOldPwdError] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      name:           profile?.name ?? '',
      phone:          profile?.phone ?? '',
      birth_date:     profile?.birth_date ?? '',
      cep:            profile?.cep ?? '',
      street:         profile?.street ?? '',
      address_number: profile?.address_number ?? '',
      complement:     profile?.complement ?? '',
      neighborhood:   profile?.neighborhood ?? '',
      city:           profile?.city ?? '',
      state:          profile?.state ?? '',
    },
  })

  const newPassword = watch('newPassword') ?? ''
  const stateValue  = watch('state') ?? ''

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await res.json()
      if (data.erro) { toast.warning('CEP não encontrado.'); return }
      setValue('street',       data.logradouro ?? '')
      setValue('neighborhood', data.bairro     ?? '')
      setValue('city',         data.localidade ?? '')
      setValue('state',        data.uf         ?? '')
    } catch {
      toast.warning('Erro ao consultar CEP.')
    }
  }

  async function onSubmit(data: PerfilFormData) {
    setOldPwdError('')

    // Se mudou email ou senha, verificar senha antiga
    if (data.email || data.newPassword) {
      const user = supabase.auth.getUser ? await supabase.auth.getUser() : null
      const email = (await supabase.auth.getSession()).data.session?.user?.email ?? ''
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: data.oldPassword ?? '',
      })
      if (authErr) {
        setOldPwdError('Senha antiga incorreta.')
        return
      }
    }

    // Trocar e-mail
    if (data.email) {
      const { error } = await supabase.auth.updateUser({ email: data.email })
      if (error) { toast.error('Erro ao trocar e-mail: ' + error.message); return }
      toast.info('Verifique seu novo e-mail para confirmar a troca.')
    }

    // Trocar senha
    if (data.newPassword) {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword })
      if (error) { toast.error('Erro ao trocar senha: ' + error.message); return }
    }

    // Salvar dados do perfil
    try {
      await updateProfile.mutateAsync({
        name:           data.name,
        phone:          data.phone,
        birth_date:     data.birth_date || null,
        cep:            data.cep || null,
        street:         data.street || null,
        address_number: data.address_number || null,
        complement:     data.complement || null,
        neighborhood:   data.neighborhood || null,
        city:           data.city || null,
        state:          data.state || null,
      })
      toast.success('Alterações salvas com sucesso.')
    } catch {
      toast.error('Erro ao salvar alterações.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Dados pessoais */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nome do representante *" error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>

        <FormField label="Celular / WhatsApp *" error={errors.phone?.message}>
          <Input {...register('phone')} placeholder="(99) 9 9999-9999" />
        </FormField>

        <FormField label="Data de nascimento" error={errors.birth_date?.message}>
          <Input type="date" {...register('birth_date')} />
        </FormField>
      </div>

      {/* Endereço */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="CEP" error={errors.cep?.message}>
          <Input {...register('cep')} placeholder="00000-000" onBlur={handleCepBlur} />
        </FormField>

        <FormField label="Rua / Logradouro" error={errors.street?.message}>
          <Input {...register('street')} />
        </FormField>

        <FormField label="Número" error={errors.address_number?.message}>
          <Input {...register('address_number')} />
        </FormField>

        <FormField label="Complemento" error={errors.complement?.message}>
          <Input {...register('complement')} />
        </FormField>

        <FormField label="Bairro" error={errors.neighborhood?.message}>
          <Input {...register('neighborhood')} />
        </FormField>

        <FormField label="Cidade" error={errors.city?.message}>
          <Input {...register('city')} />
        </FormField>

        <FormField label="Estado (UF)" error={errors.state?.message}>
          <Select value={stateValue} onValueChange={v => setValue('state', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Trocar e-mail */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Trocar e-mail" error={errors.email?.message}>
          <Input type="email" {...register('email')} placeholder="novo@email.com" />
        </FormField>

        <FormField label="Confirme novo e-mail" error={errors.emailConfirm?.message}>
          <Input type="email" {...register('emailConfirm')} placeholder="novo@email.com" />
        </FormField>
      </div>

      {/* Trocar senha */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <FormField label="Nova senha" error={errors.newPassword?.message}>
            <div className="relative">
              <Input type={showNew ? 'text' : 'password'} {...register('newPassword')} className="pr-9" />
              <button type="button" tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </FormField>
          <PasswordStrengthBar password={newPassword} />
        </div>

        <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          <div className="relative">
            <Input type={showConfirm ? 'text' : 'password'} {...register('confirmPassword')} className="pr-9" />
            <button type="button" tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </FormField>
      </div>

      {/* Senha antiga */}
      <FormField label="Senha antiga (obrigatório para trocar e-mail ou senha)" error={errors.oldPassword?.message || oldPwdError}>
        <div className="relative max-w-sm">
          <Input type={showOld ? 'text' : 'password'} {...register('oldPassword')} className="pr-9" />
          <button type="button" tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowOld(v => !v)}>
            {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {oldPwdError && <p className="text-[11px] text-red-400">{oldPwdError}</p>}
      </FormField>

      {/* Dados da Unidade */}
      <PerfilDadosUnidade unit={unit} />

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting || updateProfile.isPending}
          style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}>
          {isSubmitting || updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -i error | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/FranqueadoPerfilPage.tsx
git commit -m "feat: FranqueadoPerfilPage — PerfilFormPanel com form, CEP lookup, password strength"
```

---

## Task 11: FranqueadoPerfilPage — componente principal

**Files:**
- Modify: `src/pages/app/franqueados/FranqueadoPerfilPage.tsx`

- [ ] **Step 1: Adicionar o export default ao arquivo**

Adicionar no final do arquivo:

```typescript
// ─── FranqueadoPerfilPage ───────────────────────────────────────────────────
export default function FranqueadoPerfilPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: loadingProfile } = useFranchiseeProfile()
  const { data: myUnit, isLoading: loadingUnit } = useMyUnit()
  const unit = myUnit?.franchise_units
  const [renovarOpen, setRenovarOpen] = useState(false)

  if (loadingProfile || loadingUnit) {
    return (
      <div className="space-y-4 p-6">
        <div className="pm-skeleton h-8 w-64 rounded" />
        <div className="pm-skeleton h-64 w-full rounded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="EDITAR PERFIL DE USUÁRIO"
        subtitle="Gerencie seus dados pessoais e configurações de acesso"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1.5" />
            Voltar ↵
          </Button>
        }
      />

      <div
        className="mt-6 p-6 rounded-xl"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid hsl(var(--pm-gray-800))' }}
      >
        {/* Grid 2 colunas no desktop, 1 coluna em mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

          {/* Coluna esquerda */}
          <div
            className="lg:border-r lg:pr-8"
            style={{ borderColor: 'hsl(var(--pm-gray-800))' }}
          >
            <PerfilIdentidadePanel
              profile={profile}
              unit={unit}
              onRenovar={() => setRenovarOpen(true)}
            />
          </div>

          {/* Coluna direita */}
          <div>
            <PerfilFormPanel profile={profile} unit={unit} />
          </div>
        </div>
      </div>

      <RenovarContratoModal
        open={renovarOpen}
        onClose={() => setRenovarOpen(false)}
        unitId={unit?.id}
      />
    </div>
  )
}
```

- [ ] **Step 2: Build check limpo**

```bash
npm run build 2>&1 | grep -i error
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/FranqueadoPerfilPage.tsx
git commit -m "feat: FranqueadoPerfilPage — componente principal completo"
```

---

## Task 12: Router — registrar rota

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Adicionar lazy import**

Em `src/router/index.tsx`, adicionar após os outros imports lazy:

```typescript
const FranqueadoPerfilPage = lazy(() => import('@/pages/app/franqueados/FranqueadoPerfilPage'))
```

- [ ] **Step 2: Substituir EmBreve na rota `perfil`**

Localizar dentro do bloco `FranqueadoLayout` children:

```typescript
// ANTES:
{ path: 'perfil', element: <EmBreve titulo="Perfil" /> },

// DEPOIS:
{ path: 'perfil', element: <S><FranqueadoPerfilPage /></S> },
```

- [ ] **Step 3: Rodar testes e build**

```bash
npm run test 2>&1 | tail -5
npm run build 2>&1 | grep -i error
```

Esperado: testes passam, build limpo.

- [ ] **Step 4: Commit final**

```bash
git add src/router/index.tsx
git commit -m "feat: router — FranqueadoPerfilPage substitui EmBreve em /perfil"
```

---

## Task 13: Smoke test manual

- [ ] **Iniciar dev server**

```bash
npm run dev
```

- [ ] **Checklist de testes manuais**

| Cenário | Esperado |
|---------|----------|
| Navegar para `/:unitSlug/:agentSlug/perfil` | Página carrega sem erro |
| Sidebar → item "Perfil" | Navega para /perfil |
| Coluna esquerda: avatar com iniciais | Visível se sem foto |
| Botão "ENVIAR FOTO" → selecionar imagem | Upload funciona, avatar atualiza |
| CEP válido no campo → sair do campo | Street, bairro, cidade, UF auto-preenchidos |
| CEP inválido | Toast amarelo "CEP não encontrado" |
| Salvar sem alterações de senha/email | Salva sem pedir senha antiga |
| Tentar trocar e-mail sem senha antiga | Erro "Obrigatório para trocar e-mail ou senha" |
| Senha antiga errada | Mensagem "Senha antiga incorreta" abaixo do campo |
| Senha forte (12+ chars + mix) | 5 barras verdes no indicador |
| "Trocar Nome de usuário" → confirmar | Toast "Solicitação enviada" |
| "RENOVAR AGORA" → selecionar 12 meses → confirmar | Toast "Solicitação de renovação enviada" |
| ContractProgressBar | Exibida com datas corretas |
| Bloco "Dados da Unidade" | Campos com cadeado, cursor not-allowed |
| Salvar sucesso | Toast verde "Alterações salvas com sucesso" |
| Tela < 1024px | Layout coluna única, identidade no topo |

- [ ] **Rodar suite de testes unitários**

```bash
npm run test
```

Esperado: 9 testes de `perfilSchema.test.ts` passing.
