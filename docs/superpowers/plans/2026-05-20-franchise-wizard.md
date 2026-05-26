# Franchise Unit Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `FranchiseeForm.tsx` por um wizard 7 passos com novos campos, lookup de CNPJ/CEP, upload de logo, validação de CPF/CNPJ, status enum e modal de confirmação.

**Architecture:** Um `WizardContext` compartilha um único `useForm` entre todos os steps. O `FranchiseeWizard` shell gerencia navegação e progress bar dentro de um Sheet. Cada step é um componente isolado que recebe o context via hook. O submit segue o fluxo: validar → confirmar → criar unidade → upload logo → update logo_url.

**Tech Stack:** React 19, React Hook Form 7, Zod 4, TanStack Query 5, Supabase JS SDK v2, Vitest 4 + Testing Library

---

## Mapa de Arquivos

**Criar:**
- `supabase/migrations/037_franchise_wizard_columns.sql`
- `src/lib/validators.ts` — validarCNPJ, validarCPF, masks
- `src/hooks/useCnpjLookup.ts` — BrasilAPI CNPJ
- `src/hooks/useCepLookup.ts` — ViaCEP
- `src/pages/app/franqueados/wizard/WizardContext.tsx`
- `src/pages/app/franqueados/wizard/FranchiseeWizard.tsx`
- `src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx`
- `src/pages/app/franqueados/wizard/steps/Step1ContractType.tsx`
- `src/pages/app/franqueados/wizard/steps/Step2Identity.tsx`
- `src/pages/app/franqueados/wizard/steps/Step3Territory.tsx`
- `src/pages/app/franqueados/wizard/steps/Step4LegalContact.tsx`
- `src/pages/app/franqueados/wizard/steps/Step5OpContact.tsx`
- `src/pages/app/franqueados/wizard/steps/Step6Address.tsx`
- `src/pages/app/franqueados/wizard/steps/Step7Operational.tsx`
- `tests/unit/lib/validators.test.ts`
- `tests/unit/hooks/useCnpjLookup.test.ts`
- `tests/unit/hooks/useCepLookup.test.ts`

**Modificar:**
- `src/hooks/useFranchiseUnits.ts` — adicionar UnitStatus, novos campos em FranchiseUnit, upload helper
- `src/pages/app/franqueados/FranchiseesPage.tsx` — trocar FranchiseeForm por FranchiseeWizard
- `src/pages/app/franqueados/FranchiseeDetail.tsx` — badge de status, logo, novos campos

**Remover:**
- `src/pages/app/franqueados/FranchiseeForm.tsx` — substituído pelo wizard

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/037_franchise_wizard_columns.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/037_franchise_wizard_columns.sql

-- Novas colunas em franchise_units
ALTER TABLE franchise_units
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'em_implantacao'
    CHECK (status IN ('em_implantacao','ativa','suspensa','encerrada')),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS perimetro_exclusivo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS responsavel_legal_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_cpf TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_email TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_telefone TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_legal_cargo TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_mesmo_legal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS responsavel_op_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_email TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_op_telefone TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS limite_colaboradores INTEGER,
  ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;

-- Trigger: sincronizar active com status
CREATE OR REPLACE FUNCTION sync_franchise_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.active := (NEW.status = 'ativa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_franchise_status ON franchise_units;
CREATE TRIGGER trg_franchise_status
  BEFORE INSERT OR UPDATE ON franchise_units
  FOR EACH ROW EXECUTE FUNCTION sync_franchise_status();

-- Migrar registros existentes
UPDATE franchise_units
SET status = CASE WHEN active THEN 'ativa' ELSE 'em_implantacao' END
WHERE status = 'em_implantacao' AND active = TRUE;

-- Bucket logos-unidades (público para preview direto)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-unidades', 'logos-unidades', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos-unidades');

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos-unidades');

CREATE POLICY "Authenticated update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos-unidades');
```

- [ ] **Step 2: Aplicar migration localmente**

```bash
supabase db reset
```

Expected: migration 037 aplicada sem erros. Verificar com:
```bash
supabase db diff
```
Expected: sem diffs pendentes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/037_franchise_wizard_columns.sql
git commit -m "feat(db): add franchise wizard columns, status enum, logos bucket"
```

---

## Task 2: Validators + Masks

**Files:**
- Create: `src/lib/validators.ts`
- Create: `tests/unit/lib/validators.test.ts`

- [ ] **Step 1: Escrever os testes primeiro**

```ts
// tests/unit/lib/validators.test.ts
import { describe, it, expect } from 'vitest'
import {
  validarCNPJ, validarCPF,
  maskCNPJ, maskCPF, maskPhone, maskCEP,
} from '@/lib/validators'

describe('validarCNPJ', () => {
  it('aceita CNPJ válido', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true)
  })
  it('rejeita CNPJ com dígitos repetidos', () => {
    expect(validarCNPJ('11.111.111/1111-11')).toBe(false)
  })
  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(validarCNPJ('11.222.333/0001-00')).toBe(false)
  })
  it('rejeita string vazia', () => {
    expect(validarCNPJ('')).toBe(false)
  })
})

describe('validarCPF', () => {
  it('aceita CPF válido', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
  })
  it('rejeita CPF com dígitos repetidos', () => {
    expect(validarCPF('111.111.111-11')).toBe(false)
  })
  it('rejeita CPF com dígito verificador errado', () => {
    expect(validarCPF('529.982.247-00')).toBe(false)
  })
})

describe('maskCNPJ', () => {
  it('formata 14 dígitos', () => {
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('aceita entrada já parcialmente mascarada', () => {
    expect(maskCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })
})

describe('maskCPF', () => {
  it('formata 11 dígitos', () => {
    expect(maskCPF('52998224725')).toBe('529.982.247-25')
  })
})

describe('maskPhone', () => {
  it('formata 11 dígitos (celular)', () => {
    expect(maskPhone('11999990000')).toBe('(11) 99999-0000')
  })
  it('formata 10 dígitos (fixo)', () => {
    expect(maskPhone('1133330000')).toBe('(11) 3333-0000')
  })
})

describe('maskCEP', () => {
  it('formata 8 dígitos', () => {
    expect(maskCEP('01310100')).toBe('01310-100')
  })
})
```

- [ ] **Step 2: Verificar que os testes falham**

```bash
npm run test -- tests/unit/lib/validators.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/validators'"

- [ ] **Step 3: Criar `src/lib/validators.ts`**

```ts
// src/lib/validators.ts

export function validarCNPJ(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false
  const calc = (len: number) => {
    let sum = 0, pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(n[len - i]) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13])
}

export function validarCPF(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  const d1 = n.slice(0, 9).split('').reduce((s, c, i) => s + +c * (10 - i), 0)
  const r1 = (d1 * 10) % 11
  const v1 = r1 >= 10 ? 0 : r1
  const d2 = n.slice(0, 10).split('').reduce((s, c, i) => s + +c * (11 - i), 0)
  const r2 = (d2 * 10) % 11
  const v2 = r2 >= 10 ? 0 : r2
  return v1 === +n[9] && v2 === +n[10]
}

export function maskCNPJ(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskCPF(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCEP(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}
```

- [ ] **Step 4: Rodar testes e verificar que passam**

```bash
npm run test -- tests/unit/lib/validators.test.ts
```

Expected: PASS — todos os describes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators.ts tests/unit/lib/validators.test.ts
git commit -m "feat(lib): CNPJ/CPF validators and input masks"
```

---

## Task 3: Hook useCnpjLookup

**Files:**
- Create: `src/hooks/useCnpjLookup.ts`
- Create: `tests/unit/hooks/useCnpjLookup.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
// tests/unit/hooks/useCnpjLookup.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'

const mockResponse = {
  razao_social: 'EMPRESA TESTE LTDA',
  logradouro: 'Av. Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  municipio: 'São Paulo',
  uf: 'SP',
  cep: '01310-100',
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useCnpjLookup', () => {
  it('estado inicial é idle', () => {
    const { result } = renderHook(() => useCnpjLookup())
    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
  })

  it('retorna dados ao buscar CNPJ válido', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('11222333000181')
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data?.razao_social).toBe('EMPRESA TESTE LTDA')
  })

  it('define status error quando API falha', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('11222333000181')
    })
    expect(result.current.status).toBe('error')
    expect(result.current.data).toBeNull()
  })

  it('não busca se CNPJ inválido', async () => {
    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('123')
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})
```

- [ ] **Step 2: Verificar que falham**

```bash
npm run test -- tests/unit/hooks/useCnpjLookup.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Criar `src/hooks/useCnpjLookup.ts`**

```ts
// src/hooks/useCnpjLookup.ts
import { useState, useCallback } from 'react'
import { validarCNPJ } from '@/lib/validators'

export interface CnpjData {
  razao_social: string
  logradouro: string
  numero: string
  bairro: string
  municipio: string
  uf: string
  cep: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useCnpjLookup() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<CnpjData | null>(null)

  const lookup = useCallback(async (raw: string) => {
    const cnpj = raw.replace(/\D/g, '')
    if (!validarCNPJ(cnpj)) return
    setStatus('loading')
    setData(null)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (!res.ok) throw new Error('not_found')
      const json = await res.json()
      setData(json as CnpjData)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
  }, [])

  return { status, data, lookup, reset }
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm run test -- tests/unit/hooks/useCnpjLookup.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCnpjLookup.ts tests/unit/hooks/useCnpjLookup.test.ts
git commit -m "feat(hooks): useCnpjLookup via BrasilAPI"
```

---

## Task 4: Hook useCepLookup

**Files:**
- Create: `src/hooks/useCepLookup.ts`
- Create: `tests/unit/hooks/useCepLookup.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
// tests/unit/hooks/useCepLookup.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCepLookup } from '@/hooks/useCepLookup'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useCepLookup', () => {
  it('estado inicial é idle', () => {
    const { result } = renderHook(() => useCepLookup())
    expect(result.current.status).toBe('idle')
  })

  it('preenche dados ao encontrar CEP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Av. Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
        erro: undefined,
      }),
    } as Response)

    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('01310100')
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data?.logradouro).toBe('Av. Paulista')
    expect(result.current.data?.localidade).toBe('São Paulo')
  })

  it('define error quando ViaCEP retorna erro', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response)

    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('99999999')
    })
    expect(result.current.status).toBe('error')
  })

  it('ignora CEP com menos de 8 dígitos', async () => {
    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('0131010')
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})
```

- [ ] **Step 2: Verificar que falham**

```bash
npm run test -- tests/unit/hooks/useCepLookup.test.ts
```

Expected: FAIL

- [ ] **Step 3: Criar `src/hooks/useCepLookup.ts`**

```ts
// src/hooks/useCepLookup.ts
import { useState, useCallback } from 'react'

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useCepLookup() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<CepData | null>(null)

  const lookup = useCallback(async (raw: string) => {
    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) return
    setStatus('loading')
    setData(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const json = await res.json()
      if (json.erro) throw new Error('not_found')
      setData(json as CepData)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
  }, [])

  return { status, data, lookup, reset }
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm run test -- tests/unit/hooks/useCepLookup.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCepLookup.ts tests/unit/hooks/useCepLookup.test.ts
git commit -m "feat(hooks): useCepLookup via ViaCEP"
```

---

## Task 5: Atualizar useFranchiseUnits + tipos

**Files:**
- Modify: `src/hooks/useFranchiseUnits.ts`

- [ ] **Step 1: Atualizar o arquivo**

Substituir o conteúdo de `src/hooks/useFranchiseUnits.ts` por:

```ts
// src/hooks/useFranchiseUnits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { ContractType } from '@/types/app'

export type UnitStatus = 'em_implantacao' | 'ativa' | 'suspensa' | 'encerrada'

export interface FranchiseUnit {
  id: string
  name: string
  status: UnitStatus
  logo_url: string | null
  // Dados fiscais
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  cidade_fiscal: string | null
  website: string | null
  // Contato
  phone: string | null
  email: string | null
  // Endereço estruturado
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  city: string | null
  state: string | null
  address: string | null
  // Território
  raio_atendimento_km: number | null
  cidades_atendidas: string[] | null
  perimetro_exclusivo: boolean
  // Responsável Legal
  responsavel_legal_nome: string | null
  responsavel_legal_cpf: string | null
  responsavel_legal_email: string | null
  responsavel_legal_telefone: string | null
  responsavel_legal_cargo: string | null
  // Responsável Operacional
  responsavel_op_mesmo_legal: boolean
  responsavel_op_nome: string | null
  responsavel_op_email: string | null
  responsavel_op_telefone: string | null
  // Contrato
  contract_type: ContractType
  contract_start_date: string | null
  contract_end_date: string | null
  contract_blocked: boolean
  contract_blocked_reason: string | null
  contract_blocked_at: string | null
  // Operacional
  active: boolean
  commission_rate: number
  manager_id: string | null
  limite_colaboradores: number | null
  observacoes_internas: string | null
  created_at: string
}

interface ListFilter {
  q?: string
  page?: number
  pageSize?: number
}

export function useFranchiseUnits({ q = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['franchise-units', q, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('franchise_units')
        .select('*', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as FranchiseUnit[], total: (count as number) ?? 0 }
    },
  })
}

export function useFranchiseUnit(id: string) {
  return useQuery({
    queryKey: ['franchise-unit', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').select('*').eq('id', id).single()
      if (error) throw error
      return data as FranchiseUnit
    },
  })
}

export function useExpiringContracts(days = 90) {
  return useQuery({
    queryKey: ['franchise-units-expiring', days],
    queryFn: async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + days)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units')
        .select('id, name, contract_end_date, contract_type')
        .eq('active', true)
        .not('contract_end_date', 'is', null)
        .lte('contract_end_date', cutoff.toISOString().split('T')[0])
        .order('contract_end_date')
      if (error) throw error
      return (data ?? []) as Pick<FranchiseUnit, 'id' | 'name' | 'contract_end_date' | 'contract_type'>[]
    },
    staleTime: 300_000,
  })
}

type CreatePayload = Omit<FranchiseUnit, 'id' | 'created_at'>

export function useCreateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').insert(payload).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'created' })
    },
  })
}

export function useUpdateFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FranchiseUnit> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('franchise_units').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as FranchiseUnit
    },
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      qc.invalidateQueries({ queryKey: ['franchise-unit', u.id] })
      log({ entity: 'franchise_unit', entityId: u.id, action: 'updated' })
    },
  })
}

export function useDeleteFranchiseUnit() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('franchise_units').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: id, action: 'deleted' })
    },
  })
}

export async function uploadLogo(unitId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${unitId}/logo.${ext}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).storage
    .from('logos-unidades')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (supabase as any).storage
    .from('logos-unidades')
    .getPublicUrl(path)
  return data.publicUrl as string
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: sem erros de tipo relacionados a `FranchiseUnit`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFranchiseUnits.ts
git commit -m "feat(types): UnitStatus enum, expanded FranchiseUnit, uploadLogo helper"
```

---

## Task 6: WizardContext

**Files:**
- Create: `src/pages/app/franqueados/wizard/WizardContext.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/pages/app/franqueados/wizard/WizardContext.tsx
import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { validarCNPJ, validarCPF } from '@/lib/validators'
import type { UnitStatus } from '@/hooks/useFranchiseUnits'

export const wizardSchema = z.object({
  // Step 1
  contract_type: z.enum(['full', 'linha_leve']),
  contract_duration: z.enum(['1','2','3','5','custom']).default('1'),
  contract_start_date: z.string().min(1, 'Data de início obrigatória'),
  contract_end_date: z.string().min(1, 'Data de término obrigatória'),
  // Step 2
  name: z.string().min(2, 'Nome fantasia obrigatório'),
  cnpj: z.string().refine(validarCNPJ, 'CNPJ inválido'),
  razao_social: z.string().nullable(),
  inscricao_estadual: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable(),
  website: z.string().nullable(),
  // Step 3
  raio_atendimento_km: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().positive().nullable(),
  ),
  cidades_atendidas_txt: z.string().nullable(),
  cidade_fiscal: z.string().nullable(),
  perimetro_exclusivo: z.boolean().default(false),
  // Step 4
  responsavel_legal_nome: z.string().min(2, 'Nome obrigatório'),
  responsavel_legal_cpf: z.string().refine(validarCPF, 'CPF inválido'),
  responsavel_legal_email: z.string().email('E-mail inválido'),
  responsavel_legal_telefone: z.string().min(10, 'Telefone obrigatório'),
  responsavel_legal_cargo: z.string().nullable(),
  // Step 5
  responsavel_op_mesmo_legal: z.boolean().default(true),
  responsavel_op_nome: z.string().nullable(),
  responsavel_op_email: z.string().nullable(),
  responsavel_op_telefone: z.string().nullable(),
  // Step 6
  cep: z.string().min(8, 'CEP obrigatório'),
  logradouro: z.string().nullable(),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().nullable(),
  bairro: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  // Step 7
  status: z.enum(['em_implantacao','ativa','suspensa','encerrada']).default('em_implantacao'),
  limite_colaboradores: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().int().positive().nullable(),
  ),
  observacoes_internas: z.string().nullable(),
})

export type WizardValues = z.infer<typeof wizardSchema>

export const STEP_FIELDS: Record<number, (keyof WizardValues)[]> = {
  1: ['contract_type', 'contract_start_date', 'contract_end_date'],
  2: ['name', 'cnpj'],
  3: [],
  4: ['responsavel_legal_nome', 'responsavel_legal_cpf', 'responsavel_legal_email', 'responsavel_legal_telefone'],
  5: [],
  6: ['cep', 'numero'],
  7: [],
}

export const STEP_TITLES: Record<number, string> = {
  1: 'Logo & Contrato',
  2: 'Identificação',
  3: 'Área de Abrangência',
  4: 'Responsável Legal',
  5: 'Resp. Operacional',
  6: 'Endereço',
  7: 'Operacional',
}

interface WizardCtxValue {
  form: UseFormReturn<WizardValues>
  currentStep: number
  setStep: (n: number) => void
  logoFile: File | null
  logoPreviewUrl: string | null
  setLogoFile: (f: File | null) => void
  autofilled: Set<string>
  markAutofilled: (fields: string[]) => void
  clearAutofilled: (field: string) => void
}

const WizardCtx = createContext<WizardCtxValue | null>(null)

export function useWizard() {
  const ctx = useContext(WizardCtx)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}

interface WizardProviderProps {
  children: ReactNode
  initialValues?: Partial<WizardValues>
}

export function WizardProvider({ children, initialValues }: WizardProviderProps) {
  const [currentStep, setStep] = useState(1)
  const [logoFile, setLogoFileState] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialValues ? null : null
  )
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set())
  const prevUrlRef = useRef<string | null>(null)

  const form = useForm<WizardValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      contract_type: 'full',
      contract_duration: '1',
      contract_start_date: '',
      contract_end_date: '',
      name: '',
      cnpj: '',
      razao_social: null,
      inscricao_estadual: null,
      phone: null,
      email: null,
      website: null,
      raio_atendimento_km: null,
      cidades_atendidas_txt: null,
      cidade_fiscal: null,
      perimetro_exclusivo: false,
      responsavel_legal_nome: '',
      responsavel_legal_cpf: '',
      responsavel_legal_email: '',
      responsavel_legal_telefone: '',
      responsavel_legal_cargo: null,
      responsavel_op_mesmo_legal: true,
      responsavel_op_nome: null,
      responsavel_op_email: null,
      responsavel_op_telefone: null,
      cep: '',
      logradouro: null,
      numero: '',
      complemento: null,
      bairro: null,
      city: null,
      state: null,
      status: 'em_implantacao',
      limite_colaboradores: null,
      observacoes_internas: null,
      ...initialValues,
    },
  })

  function setLogoFile(f: File | null) {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    if (f) {
      const url = URL.createObjectURL(f)
      prevUrlRef.current = url
      setLogoPreviewUrl(url)
    } else {
      setLogoPreviewUrl(null)
    }
    setLogoFileState(f)
  }

  function markAutofilled(fields: string[]) {
    setAutofilled(prev => new Set([...prev, ...fields]))
  }

  function clearAutofilled(field: string) {
    setAutofilled(prev => { const s = new Set(prev); s.delete(field); return s })
  }

  return (
    <WizardCtx.Provider value={{
      form, currentStep, setStep,
      logoFile, logoPreviewUrl, setLogoFile,
      autofilled, markAutofilled, clearAutofilled,
    }}>
      {children}
    </WizardCtx.Provider>
  )
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros no arquivo novo.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/wizard/WizardContext.tsx
git commit -m "feat(wizard): WizardContext with shared form and logo state"
```

---

## Task 7: FranchiseeWizard Shell

**Files:**
- Create: `src/pages/app/franqueados/wizard/FranchiseeWizard.tsx`

- [ ] **Step 1: Criar o shell**

```tsx
// src/pages/app/franqueados/wizard/FranchiseeWizard.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { WizardProvider, useWizard, STEP_FIELDS, STEP_TITLES } from './WizardContext'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'
import { Step1ContractType } from './steps/Step1ContractType'
import { Step2Identity } from './steps/Step2Identity'
import { Step3Territory } from './steps/Step3Territory'
import { Step4LegalContact } from './steps/Step4LegalContact'
import { Step5OpContact } from './steps/Step5OpContact'
import { Step6Address } from './steps/Step6Address'
import { Step7Operational } from './steps/Step7Operational'
import { ConfirmSummaryDialog } from './ConfirmSummaryDialog'
import { useState } from 'react'

const TOTAL_STEPS = 7

const STEP_COMPONENTS: Record<number, React.FC> = {
  1: Step1ContractType,
  2: Step2Identity,
  3: Step3Territory,
  4: Step4LegalContact,
  5: Step5OpContact,
  6: Step6Address,
  7: Step7Operational,
}

function ProgressBar() {
  const { currentStep, setStep } = useWizard()
  const isEdit = false // will be passed from parent later via context if needed
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => isEdit && setStep(step)}
            className={[
              'h-2 rounded-full transition-all duration-200',
              step === currentStep ? 'w-6 bg-[hsl(var(--pm-red-500))]' :
              step < currentStep ? 'w-2 bg-[hsl(var(--pm-red-500))]/40' :
              'w-2 bg-white/10',
              isEdit ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          />
        ))}
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">
          Passo {currentStep} de {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
        </span>
      </div>
    </div>
  )
}

interface WizardInnerProps {
  isEdit: boolean
  unit?: FranchiseUnit
  onOpenChange: (open: boolean) => void
}

function WizardInner({ isEdit, unit, onOpenChange }: WizardInnerProps) {
  const { form, currentStep, setStep, logoFile } = useWizard()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const StepComponent = STEP_COMPONENTS[currentStep]

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep]
    const valid = await form.trigger(fields as never[])
    if (!valid) return
    if (currentStep === TOTAL_STEPS) {
      const allValid = await form.trigger()
      if (allValid) setConfirmOpen(true)
    } else {
      setStep(currentStep + 1)
    }
  }

  function handlePrev() {
    if (currentStep === 1) {
      onOpenChange(false)
    } else {
      setStep(currentStep - 1)
    }
  }

  return (
    <>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/[0.06] px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-base">
              {isEdit ? `Editar Unidade${unit ? ` — ${unit.name}` : ''}` : 'Nova Unidade Franqueada'}
            </SheetTitle>
          </SheetHeader>
          <ProgressBar />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StepComponent />
        </div>

        <div className="sticky bottom-0 border-t border-white/[0.06] bg-background/95 backdrop-blur px-6 py-4 flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrev}
          >
            {currentStep === 1 ? 'Cancelar' : (
              <><ChevronLeft size={16} className="mr-1" />Anterior</>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {currentStep === TOTAL_STEPS ? (
              <><Save size={15} className="mr-1.5" />{isEdit ? 'Salvar Alterações' : 'Salvar Unidade'}</>
            ) : (
              <>Próximo<ChevronRight size={16} className="ml-1" /></>
            )}
          </Button>
        </div>
      </SheetContent>

      <ConfirmSummaryDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        isEdit={isEdit}
        unit={unit}
        logoFile={logoFile}
        onSuccess={() => onOpenChange(false)}
      />
    </>
  )
}

interface FranchiseeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: FranchiseUnit
}

function unitToInitialValues(unit: FranchiseUnit) {
  return {
    contract_type: unit.contract_type,
    contract_duration: 'custom' as const,
    contract_start_date: unit.contract_start_date?.split('T')[0] ?? '',
    contract_end_date: unit.contract_end_date?.split('T')[0] ?? '',
    name: unit.name,
    cnpj: unit.cnpj ?? '',
    razao_social: unit.razao_social,
    inscricao_estadual: unit.inscricao_estadual,
    phone: unit.phone,
    email: unit.email,
    website: unit.website,
    raio_atendimento_km: unit.raio_atendimento_km,
    cidades_atendidas_txt: unit.cidades_atendidas?.join(', ') ?? null,
    cidade_fiscal: unit.cidade_fiscal,
    perimetro_exclusivo: unit.perimetro_exclusivo ?? false,
    responsavel_legal_nome: unit.responsavel_legal_nome ?? '',
    responsavel_legal_cpf: unit.responsavel_legal_cpf ?? '',
    responsavel_legal_email: unit.responsavel_legal_email ?? '',
    responsavel_legal_telefone: unit.responsavel_legal_telefone ?? '',
    responsavel_legal_cargo: unit.responsavel_legal_cargo,
    responsavel_op_mesmo_legal: unit.responsavel_op_mesmo_legal ?? true,
    responsavel_op_nome: unit.responsavel_op_nome,
    responsavel_op_email: unit.responsavel_op_email,
    responsavel_op_telefone: unit.responsavel_op_telefone,
    cep: unit.cep ?? '',
    logradouro: unit.logradouro,
    numero: unit.numero ?? '',
    complemento: unit.complemento,
    bairro: unit.bairro,
    city: unit.city,
    state: unit.state,
    status: unit.status ?? 'em_implantacao',
    limite_colaboradores: unit.limite_colaboradores,
    observacoes_internas: unit.observacoes_internas,
  }
}

export function FranchiseeWizard({ open, onOpenChange, unit }: FranchiseeWizardProps) {
  const isEdit = !!unit
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <WizardProvider key={unit?.id ?? 'new'} initialValues={isEdit && unit ? unitToInitialValues(unit) : undefined}>
        <WizardInner isEdit={isEdit} unit={unit} onOpenChange={onOpenChange} />
      </WizardProvider>
    </Sheet>
  )
}
```

- [ ] **Step 2: Criar stubs temporários dos steps (para compilar)**

Criar cada stub com o mínimo para compilar. Exemplo para todos os steps:

```tsx
// src/pages/app/franqueados/wizard/steps/Step1ContractType.tsx
export function Step1ContractType() { return <div>Step 1 — TODO</div> }
```

Repetir para Step2Identity, Step3Territory, Step4LegalContact, Step5OpContact, Step6Address, Step7Operational.

Criar stub do ConfirmSummaryDialog:
```tsx
// src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'
interface Props { open: boolean; onOpenChange: (o: boolean) => void; isEdit: boolean; unit?: FranchiseUnit; logoFile: File | null; onSuccess: () => void }
export function ConfirmSummaryDialog({ onOpenChange }: Props) { return null }
```

- [ ] **Step 3: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/franqueados/wizard/
git commit -m "feat(wizard): shell with progress bar, step navigation, stub steps"
```

---

## Task 8: Step 1 — Logo & Contrato

**Files:**
- Modify: `src/pages/app/franqueados/wizard/steps/Step1ContractType.tsx`

- [ ] **Step 1: Implementar o step**

```tsx
// src/pages/app/franqueados/wizard/steps/Step1ContractType.tsx
import { useRef, useEffect } from 'react'
import { Controller } from 'react-hook-form'
import { Camera, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWizard } from '../WizardContext'

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 ano' },
  { value: '2', label: '2 anos' },
  { value: '3', label: '3 anos' },
  { value: '5', label: '5 anos' },
  { value: 'custom', label: 'Personalizado' },
]

export function Step1ContractType() {
  const { form, logoFile, logoPreviewUrl, setLogoFile } = useWizard()
  const { register, control, watch, setValue, formState: { errors } } = form
  const fileRef = useRef<HTMLInputElement>(null)

  const name = watch('name')
  const contractStart = watch('contract_start_date')
  const duration = watch('contract_duration')

  // Auto-calcular end date quando start ou duration mudar
  useEffect(() => {
    if (!contractStart || duration === 'custom') return
    const years = parseInt(duration)
    if (!isNaN(years)) {
      setValue('contract_end_date', addYears(contractStart, years))
    }
  }, [contractStart, duration, setValue])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2MB.')
      return
    }
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) {
      alert('Formato inválido. Use JPG, PNG ou WEBP.')
      return
    }
    setLogoFile(f)
  }

  const initials = name?.slice(0, 2).toUpperCase() ?? 'UN'

  const endDate = watch('contract_end_date')
  const startDate = watch('contract_start_date')
  const vigenciaOk = startDate && endDate
    ? new Date(endDate) >= new Date(addYears(startDate, 1))
    : true

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Identidade Visual</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 hover:border-[hsl(var(--pm-red-500))]/50 transition-colors flex items-center justify-center bg-white/5 group"
          >
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                {initials}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </button>
          <div className="space-y-1">
            <p className="text-sm font-medium">Logo da Unidade</p>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · máx. 2MB · opcional</p>
            {logoFile && (
              <button
                type="button"
                onClick={() => setLogoFile(null)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remover
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>

      {/* Tipo de contrato */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo & Contrato</p>

        <div className="space-y-1">
          <Label>Tipo de Contrato *</Label>
          <Controller
            control={control}
            name="contract_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full — acesso completo</SelectItem>
                  <SelectItem value="linha_leve">Linha Leve — catálogo restrito</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Data de Início *</Label>
          <Input type="date" {...register('contract_start_date')} />
          {errors.contract_start_date && <p className="text-xs text-red-400">{errors.contract_start_date.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Duração do Contrato</Label>
          <Controller
            control={control}
            name="contract_duration"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Data de Término *</Label>
          <Input
            type="date"
            {...register('contract_end_date')}
            readOnly={duration !== 'custom'}
            className={duration !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}
          />
          {errors.contract_end_date && <p className="text-xs text-red-400">{errors.contract_end_date.message}</p>}
          {!vigenciaOk && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={12} />
              <p className="text-xs">Vigência mínima obrigatória: 12 meses</p>
            </div>
          )}
          {vigenciaOk && startDate && endDate && (
            <p className="text-[10px] text-muted-foreground">Vigência mínima obrigatória: 12 meses</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/wizard/steps/Step1ContractType.tsx
git commit -m "feat(wizard): Step1 - logo upload, contract type, auto-calculated end date"
```

---

## Task 9: Step 2 — Identificação

**Files:**
- Modify: `src/pages/app/franqueados/wizard/steps/Step2Identity.tsx`

- [ ] **Step 1: Implementar**

```tsx
// src/pages/app/franqueados/wizard/steps/Step2Identity.tsx
import { useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardContext'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import { maskCNPJ, maskPhone } from '@/lib/validators'

function AutofilledIcon() {
  return <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
}

export function Step2Identity() {
  const { form, markAutofilled, clearAutofilled, autofilled } = useWizard()
  const { register, setValue, watch, formState: { errors } } = form
  const { status, data, lookup } = useCnpjLookup()

  const cnpjRaw = watch('cnpj')

  // Quando lookup retorna dados, preencher campos
  useEffect(() => {
    if (status !== 'success' || !data) return
    const fields: string[] = []
    if (data.razao_social) { setValue('razao_social', data.razao_social); fields.push('razao_social') }
    if (data.logradouro) { fields.push('logradouro') }
    if (data.municipio) { setValue('city', data.municipio); fields.push('city') }
    if (data.uf) { setValue('state', data.uf); fields.push('state') }
    if (data.cep) { setValue('cep', data.cep.replace(/\D/g,'')); fields.push('cep') }
    if (data.logradouro) {
      const addr = [data.logradouro, data.numero, data.bairro].filter(Boolean).join(', ')
      setValue('logradouro', data.logradouro)
      setValue('bairro', data.bairro)
      setValue('numero', data.numero)
      fields.push('logradouro', 'bairro', 'numero')
    }
    markAutofilled(fields)
  }, [status, data, setValue, markAutofilled])

  function handleCnpjBlur() {
    lookup(cnpjRaw ?? '')
  }

  function handleMaskedChange(
    field: Parameters<typeof register>[0],
    maskFn: (v: string) => string
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskFn(e.target.value)
      setValue(field as never, masked as never)
      clearAutofilled(field as string)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Dados Fiscais</p>

        <div className="space-y-1">
          <Label>CNPJ *</Label>
          <div className="relative">
            <Input
              {...register('cnpj')}
              placeholder="00.000.000/0000-00"
              onChange={handleMaskedChange('cnpj', maskCNPJ)}
              onBlur={handleCnpjBlur}
              maxLength={18}
            />
            {status === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          {errors.cnpj && <p className="text-xs text-red-400">{errors.cnpj.message}</p>}
          {status === 'error' && <p className="text-xs text-amber-400">CNPJ não encontrado na Receita Federal</p>}
        </div>

        <div className="space-y-1">
          <Label>Nome Fantasia *</Label>
          <Input {...register('name')} placeholder="Promax Tuner São Paulo" onChange={() => clearAutofilled('name')} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Razão Social</Label>
          <div className="relative">
            <Input {...register('razao_social')} placeholder="Empresa Ltda." onChange={() => clearAutofilled('razao_social')} />
            {autofilled.has('razao_social') && <AutofilledIcon />}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Inscrição Estadual</Label>
          <Input {...register('inscricao_estadual')} placeholder="000.000.000.000" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Contato</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input
              {...register('phone')}
              placeholder="(11) 99999-9999"
              onChange={handleMaskedChange('phone', maskPhone)}
              maxLength={15}
            />
          </div>
          <div className="space-y-1">
            <Label>E-mail Corporativo</Label>
            <Input type="email" {...register('email')} placeholder="contato@unidade.com.br" />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Website</Label>
          <Input {...register('website')} placeholder="https://unidade.promaxtuner.com.br" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/wizard/steps/Step2Identity.tsx
git commit -m "feat(wizard): Step2 - identity with CNPJ autofill from BrasilAPI"
```

---

## Task 10: Steps 3, 4, 5 — Território + Responsáveis

**Files:**
- Modify: `src/pages/app/franqueados/wizard/steps/Step3Territory.tsx`
- Modify: `src/pages/app/franqueados/wizard/steps/Step4LegalContact.tsx`
- Modify: `src/pages/app/franqueados/wizard/steps/Step5OpContact.tsx`

- [ ] **Step 1: Implementar Step3Territory**

```tsx
// src/pages/app/franqueados/wizard/steps/Step3Territory.tsx
import { Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWizard } from '../WizardContext'

export function Step3Territory() {
  const { form } = useWizard()
  const { register, control, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Delimitação Territorial</p>

        <div className="space-y-1">
          <Label>Raio de Atendimento (km)</Label>
          <Input type="number" min={0} step={0.5} {...register('raio_atendimento_km')} placeholder="50" />
          {errors.raio_atendimento_km && <p className="text-xs text-red-400">{errors.raio_atendimento_km.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>
            Cidades Atendidas
            <span className="text-[10px] text-muted-foreground font-normal ml-1">(separadas por vírgula)</span>
          </Label>
          <Textarea
            {...register('cidades_atendidas_txt')}
            rows={3}
            placeholder="São Paulo, Guarulhos, Campinas..."
          />
        </div>

        <div className="space-y-1">
          <Label>Cidade Fiscal <span className="text-[10px] text-muted-foreground font-normal">(domicílio tributário)</span></Label>
          <Input {...register('cidade_fiscal')} placeholder="Município para emissão de NF" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <Label className="cursor-pointer">Perímetro Exclusivo</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info size={13} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                Proteção territorial: nenhuma outra unidade da rede poderá atender clientes dentro do raio definido desta unidade.
              </TooltipContent>
            </Tooltip>
          </div>
          <Controller
            control={control}
            name="perimetro_exclusivo"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implementar Step4LegalContact**

```tsx
// src/pages/app/franqueados/wizard/steps/Step4LegalContact.tsx
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardContext'
import { maskCPF, maskPhone } from '@/lib/validators'

export function Step4LegalContact() {
  const { form } = useWizard()
  const { register, setValue, formState: { errors } } = form

  function masked(field: 'responsavel_legal_cpf' | 'responsavel_legal_telefone', fn: (v: string) => string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setValue(field, fn(e.target.value))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Responsável Legal</p>

        <div className="space-y-1">
          <Label>Nome Completo *</Label>
          <Input {...register('responsavel_legal_nome')} placeholder="João da Silva" />
          {errors.responsavel_legal_nome && <p className="text-xs text-red-400">{errors.responsavel_legal_nome.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>CPF *</Label>
          <Input
            {...register('responsavel_legal_cpf')}
            placeholder="000.000.000-00"
            onChange={masked('responsavel_legal_cpf', maskCPF)}
            maxLength={14}
          />
          {errors.responsavel_legal_cpf && <p className="text-xs text-red-400">{errors.responsavel_legal_cpf.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>E-mail *</Label>
            <Input type="email" {...register('responsavel_legal_email')} placeholder="joao@empresa.com" />
            {errors.responsavel_legal_email && <p className="text-xs text-red-400">{errors.responsavel_legal_email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Telefone / WhatsApp *</Label>
            <Input
              {...register('responsavel_legal_telefone')}
              placeholder="(11) 99999-9999"
              onChange={masked('responsavel_legal_telefone', maskPhone)}
              maxLength={15}
            />
            {errors.responsavel_legal_telefone && <p className="text-xs text-red-400">{errors.responsavel_legal_telefone.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Cargo</Label>
          <Input {...register('responsavel_legal_cargo')} placeholder="Sócio-Diretor, Gerente..." />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implementar Step5OpContact**

```tsx
// src/pages/app/franqueados/wizard/steps/Step5OpContact.tsx
import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useWizard } from '../WizardContext'
import { maskPhone } from '@/lib/validators'

export function Step5OpContact() {
  const { form } = useWizard()
  const { register, control, watch, setValue } = form
  const mesmoLegal = watch('responsavel_op_mesmo_legal')

  function masked(field: 'responsavel_op_telefone', fn: (v: string) => string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setValue(field, fn(e.target.value))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Responsável Operacional</p>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3">
          <Label className="cursor-pointer">Mesmo que o Responsável Legal</Label>
          <Controller
            control={control}
            name="responsavel_op_mesmo_legal"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {!mesmoLegal && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input {...register('responsavel_op_nome')} placeholder="Maria Souza" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" {...register('responsavel_op_email')} placeholder="maria@empresa.com" />
              </div>
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  {...register('responsavel_op_telefone')}
                  placeholder="(11) 99999-9999"
                  onChange={masked('responsavel_op_telefone', maskPhone)}
                  maxLength={15}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/franqueados/wizard/steps/Step3Territory.tsx \
        src/pages/app/franqueados/wizard/steps/Step4LegalContact.tsx \
        src/pages/app/franqueados/wizard/steps/Step5OpContact.tsx
git commit -m "feat(wizard): Steps 3-5 - territory, legal contact, operational contact"
```

---

## Task 11: Steps 6 e 7 — Endereço + Operacional

**Files:**
- Modify: `src/pages/app/franqueados/wizard/steps/Step6Address.tsx`
- Modify: `src/pages/app/franqueados/wizard/steps/Step7Operational.tsx`

- [ ] **Step 1: Implementar Step6Address**

```tsx
// src/pages/app/franqueados/wizard/steps/Step6Address.tsx
import { useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardContext'
import { useCepLookup } from '@/hooks/useCepLookup'
import { maskCEP } from '@/lib/validators'

export function Step6Address() {
  const { form, autofilled, markAutofilled, clearAutofilled } = useWizard()
  const { register, setValue, watch, formState: { errors } } = form
  const { status, data, lookup } = useCepLookup()

  const cepRaw = watch('cep')

  useEffect(() => {
    if (status !== 'success' || !data) return
    const fields: string[] = []
    if (data.logradouro) { setValue('logradouro', data.logradouro); fields.push('logradouro') }
    if (data.bairro) { setValue('bairro', data.bairro); fields.push('bairro') }
    if (data.localidade) { setValue('city', data.localidade); fields.push('city') }
    if (data.uf) { setValue('state', data.uf); fields.push('state') }
    markAutofilled(fields)
  }, [status, data, setValue, markAutofilled])

  function handleCepBlur() {
    lookup(cepRaw ?? '')
  }

  function AutoIcon({ field }: { field: string }) {
    return autofilled.has(field)
      ? <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
      : null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Endereço Completo</p>

        <div className="space-y-1">
          <Label>CEP *</Label>
          <div className="relative">
            <Input
              {...register('cep')}
              placeholder="00000-000"
              maxLength={9}
              onChange={(e) => { setValue('cep', maskCEP(e.target.value)); clearAutofilled('cep') }}
              onBlur={handleCepBlur}
            />
            {status === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          {errors.cep && <p className="text-xs text-red-400">{errors.cep.message}</p>}
          {status === 'error' && <p className="text-xs text-amber-400">CEP não encontrado</p>}
        </div>

        <div className="space-y-1">
          <Label>Logradouro</Label>
          <div className="relative">
            <Input {...register('logradouro')} placeholder="Av. Paulista" onChange={() => clearAutofilled('logradouro')} />
            <AutoIcon field="logradouro" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Número *</Label>
            <Input {...register('numero')} placeholder="1000" />
            {errors.numero && <p className="text-xs text-red-400">{errors.numero.message}</p>}
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Complemento</Label>
            <Input {...register('complemento')} placeholder="Sala 10, Galpão A..." />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Bairro</Label>
          <div className="relative">
            <Input {...register('bairro')} placeholder="Bela Vista" onChange={() => clearAutofilled('bairro')} />
            <AutoIcon field="bairro" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Cidade</Label>
            <div className="relative">
              <Input {...register('city')} placeholder="São Paulo" onChange={() => clearAutofilled('city')} />
              <AutoIcon field="city" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>UF</Label>
            <div className="relative">
              <Input {...register('state')} maxLength={2} placeholder="SP" className="uppercase" onChange={() => clearAutofilled('state')} />
              <AutoIcon field="state" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implementar Step7Operational**

```tsx
// src/pages/app/franqueados/wizard/steps/Step7Operational.tsx
import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWizard } from '../WizardContext'

const STATUS_OPTIONS = [
  { value: 'em_implantacao', label: 'Em Implantação', desc: 'Unidade em processo de abertura' },
  { value: 'ativa', label: 'Ativa', desc: 'Operando normalmente' },
  { value: 'suspensa', label: 'Suspensa', desc: 'Temporariamente inativa' },
  { value: 'encerrada', label: 'Encerrada', desc: 'Contrato encerrado' },
] as const

export function Step7Operational() {
  const { form } = useWizard()
  const { register, control, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Operacional</p>

        <div className="space-y-1">
          <Label>Status da Unidade</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <div>
                        <span>{o.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">— {o.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-[10px] text-muted-foreground">Padrão para novas unidades: Em Implantação</p>
        </div>

        <div className="space-y-1">
          <Label>Limite de Colaboradores <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input type="number" min={1} {...register('limite_colaboradores')} placeholder="Sem limite" />
          {errors.limite_colaboradores && <p className="text-xs text-red-400">{errors.limite_colaboradores.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Observações Internas <span className="text-muted-foreground font-normal text-xs">(visível apenas para a matriz)</span></Label>
          <Textarea
            {...register('observacoes_internas')}
            rows={4}
            placeholder="Notas internas, histórico de negociação, pendências..."
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/franqueados/wizard/steps/Step6Address.tsx \
        src/pages/app/franqueados/wizard/steps/Step7Operational.tsx
git commit -m "feat(wizard): Steps 6-7 - address with ViaCEP autofill, operational status"
```

---

## Task 12: ConfirmSummaryDialog + Submit

**Files:**
- Modify: `src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx`

- [ ] **Step 1: Implementar o dialog**

```tsx
// src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useWizard } from './WizardContext'
import { useCreateFranchiseUnit, useUpdateFranchiseUnit, uploadLogo, type FranchiseUnit } from '@/hooks/useFranchiseUnits'

const STATUS_LABEL: Record<string, string> = {
  em_implantacao: 'Em Implantação',
  ativa: 'Ativa',
  suspensa: 'Suspensa',
  encerrada: 'Encerrada',
}

const CONTRACT_LABEL: Record<string, string> = {
  full: 'Full',
  linha_leve: 'Linha Leve',
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  isEdit: boolean
  unit?: FranchiseUnit
  logoFile: File | null
  onSuccess: () => void
}

export function ConfirmSummaryDialog({ open, onOpenChange, isEdit, unit, logoFile, onSuccess }: Props) {
  const { form } = useWizard()
  const { getValues } = form
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const create = useCreateFranchiseUnit()
  const update = useUpdateFranchiseUnit()
  const [submitting, setSubmitting] = useState(false)

  const values = getValues()

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const cidades = values.cidades_atendidas_txt
        ? values.cidades_atendidas_txt.split(',').map(s => s.trim()).filter(Boolean)
        : null

      const payload = {
        name: values.name,
        status: values.status,
        logo_url: unit?.logo_url ?? null,
        razao_social: values.razao_social || null,
        cnpj: values.cnpj || null,
        inscricao_estadual: values.inscricao_estadual || null,
        cidade_fiscal: values.cidade_fiscal || null,
        website: values.website || null,
        phone: values.phone || null,
        email: values.email || null,
        cep: values.cep || null,
        logradouro: values.logradouro || null,
        numero: values.numero || null,
        complemento: values.complemento || null,
        bairro: values.bairro || null,
        city: values.city || null,
        state: values.state || null,
        address: [values.logradouro, values.numero, values.bairro].filter(Boolean).join(', ') || null,
        raio_atendimento_km: values.raio_atendimento_km ?? null,
        cidades_atendidas: cidades,
        perimetro_exclusivo: values.perimetro_exclusivo,
        responsavel_legal_nome: values.responsavel_legal_nome || null,
        responsavel_legal_cpf: values.responsavel_legal_cpf || null,
        responsavel_legal_email: values.responsavel_legal_email || null,
        responsavel_legal_telefone: values.responsavel_legal_telefone || null,
        responsavel_legal_cargo: values.responsavel_legal_cargo || null,
        responsavel_op_mesmo_legal: values.responsavel_op_mesmo_legal,
        responsavel_op_nome: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_nome || null),
        responsavel_op_email: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_email || null),
        responsavel_op_telefone: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_telefone || null),
        contract_type: values.contract_type,
        contract_start_date: values.contract_start_date || null,
        contract_end_date: values.contract_end_date || null,
        limite_colaboradores: values.limite_colaboradores ?? null,
        observacoes_internas: values.observacoes_internas || null,
        active: values.status === 'ativa',
        commission_rate: unit?.commission_rate ?? 0,
        manager_id: unit?.manager_id ?? null,
        contract_blocked: unit?.contract_blocked ?? false,
        contract_blocked_reason: unit?.contract_blocked_reason ?? null,
        contract_blocked_at: unit?.contract_blocked_at ?? null,
      }

      if (isEdit && unit) {
        // Modo edição: update → upload logo se novo
        await update.mutateAsync({ id: unit.id, ...payload })
        if (logoFile) {
          const logo_url = await uploadLogo(unit.id, logoFile)
          await update.mutateAsync({ id: unit.id, logo_url })
        }
        toast.success('Unidade atualizada')
        onSuccess()
      } else {
        // Criação: create → upload logo → update logo_url
        const created = await create.mutateAsync(payload)
        if (logoFile) {
          const logo_url = await uploadLogo(created.id, logoFile)
          await update.mutateAsync({ id: created.id, logo_url })
        }
        toast.success('Unidade criada com sucesso')
        onSuccess()
        navigate(`${prefix}/franqueados/${created.id}`)
      }
    } catch (err) {
      toast.error('Erro ao salvar unidade. Tente novamente.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Confirmar Alterações' : 'Confirmar Criação'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground text-xs">
            {isEdit ? 'Você está atualizando a unidade:' : 'Você está criando a unidade:'}
          </p>

          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
            <p className="font-semibold">{values.name}</p>
            {values.city && values.state && (
              <p className="text-xs text-muted-foreground">{values.city} — {values.state}</p>
            )}
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contrato</span>
                <span>{CONTRACT_LABEL[values.contract_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vigência</span>
                <span>{fmt(values.contract_start_date)} → {fmt(values.contract_end_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsável</span>
                <span className="truncate max-w-[140px]">{values.responsavel_legal_nome || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status inicial</span>
                <span>{STATUS_LABEL[values.status]}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {submitting ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" />Salvando...</>
            ) : (
              isEdit ? 'Confirmar Alterações' : 'Confirmar e Criar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/franqueados/wizard/ConfirmSummaryDialog.tsx
git commit -m "feat(wizard): ConfirmSummaryDialog with create/edit submit flow and logo upload"
```

---

## Task 13: Atualizar FranchiseesPage + FranchiseeDetail

**Files:**
- Modify: `src/pages/app/franqueados/FranchiseesPage.tsx`
- Modify: `src/pages/app/franqueados/FranchiseeDetail.tsx`
- Delete: `src/pages/app/franqueados/FranchiseeForm.tsx`

- [ ] **Step 1: Atualizar FranchiseesPage**

Substituir a linha de import e uso de `FranchiseeForm` por `FranchiseeWizard`:

```tsx
// src/pages/app/franqueados/FranchiseesPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
import { useFranchiseUnits, type FranchiseUnit, type UnitStatus } from '@/hooks/useFranchiseUnits'

const CONTRACT_LABELS: Record<string, string> = { full: 'Full', linha_leve: 'Linha Leve' }

const STATUS_COLORS: Record<UnitStatus, { bg: string; color: string; label: string }> = {
  em_implantacao: { bg: 'rgba(96,165,250,0.1)', color: '#60A5FA', label: 'Em Implantação' },
  ativa:          { bg: 'rgba(52,211,153,0.1)', color: '#34D399',  label: 'Ativa' },
  suspensa:       { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24',  label: 'Suspensa' },
  encerrada:      { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Encerrada' },
}

const COLUMNS: Column<FranchiseUnit>[] = [
  { key: 'name', header: 'Nome' },
  {
    key: 'location', header: 'Localidade',
    cell: (r) => r.city && r.state ? `${r.city} — ${r.state}` : r.city ?? r.state ?? '—',
  },
  {
    key: 'contract_type', header: 'Contrato',
    cell: (r) => {
      const isFullContract = r.contract_type === 'full'
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: isFullContract ? 'rgba(177,40,37,0.1)' : 'rgba(96,165,250,0.1)', color: isFullContract ? '#B12825' : '#60A5FA', fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isFullContract ? '#B12825' : '#60A5FA', flexShrink: 0 }} />
          {CONTRACT_LABELS[r.contract_type]}
        </span>
      )
    },
  },
  {
    key: 'status', header: 'Status',
    cell: (r) => {
      if (r.contract_blocked) {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
            Bloqueada
          </span>
        )
      }
      const s = STATUS_COLORS[r.status ?? 'em_implantacao']
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          {s.label}
        </span>
      )
    },
  },
]

export default function FranchiseesPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const PAGE_SIZE = 20

  const { data, isLoading } = useFranchiseUnits({ q, page, pageSize: PAGE_SIZE })

  return (
    <div>
      <PageHeader
        title="Franqueados"
        subtitle="Unidades da rede Promax Tuner"
        actions={
          <Button onClick={() => setFormOpen(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={16} className="mr-2" />Nova Unidade
          </Button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchValue={q}
        searchPlaceholder="Buscar por nome..."
        onRowClick={(r) => navigate(`${prefix}/franqueados/${r.id}`)}
        emptyTitle="Nenhuma unidade"
        emptyDescription="Clique em Nova Unidade para adicionar."
      />

      <FranchiseeWizard open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
```

- [ ] **Step 2: Atualizar FranchiseeDetail — usar FranchiseeWizard e mostrar status**

No `FranchiseeDetail.tsx`, substituir as linhas que importam `FranchiseeForm` e renderizam `<FranchiseeForm`:

```tsx
// Linha de import a substituir:
import { FranchiseeForm } from './FranchiseeForm'
// Por:
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
```

```tsx
// Linha a substituir no JSX:
<FranchiseeForm open={editOpen} onOpenChange={setEditOpen} unit={unit} />
// Por:
<FranchiseeWizard open={editOpen} onOpenChange={setEditOpen} unit={unit} />
```

Adicionar logo no header do Detail — após a linha do `PageHeader`, se `unit.logo_url` existir:

```tsx
{unit.logo_url && (
  <img
    src={unit.logo_url}
    alt={unit.name}
    className="w-12 h-12 rounded-full object-cover border border-white/10"
  />
)}
```

No card de Identificação, substituir a linha de Status:
```tsx
// Substituir:
<div>
  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
  <span className={`text-sm font-medium ${unit.active ? 'text-green-400' : 'text-muted-foreground'}`}>
    {unit.active ? 'Ativa' : 'Inativa'}
  </span>
</div>
// Por:
<div>
  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
  {(() => {
    const s = { em_implantacao: { color: '#60A5FA', label: 'Em Implantação' }, ativa: { color: '#34D399', label: 'Ativa' }, suspensa: { color: '#FBBF24', label: 'Suspensa' }, encerrada: { color: '#64748B', label: 'Encerrada' } }
    const cur = s[unit.status ?? 'em_implantacao']
    return <span style={{ fontSize: 13, fontWeight: 600, color: cur.color }}>{cur.label}</span>
  })()}
</div>
```

- [ ] **Step 3: Remover FranchiseeForm.tsx**

```bash
rm "/Users/rogeriolima/Documents/projetos lovable/promax tuner/promax-tuner/src/pages/app/franqueados/FranchiseeForm.tsx"
```

- [ ] **Step 4: Build final completo**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules" | head -20
```

Expected: Build concluído sem erros.

- [ ] **Step 5: Rodar todos os testes**

```bash
npm run test
```

Expected: todos passando.

- [ ] **Step 6: Commit final**

```bash
git add src/pages/app/franqueados/FranchiseesPage.tsx \
        src/pages/app/franqueados/FranchiseeDetail.tsx
git rm src/pages/app/franqueados/FranchiseeForm.tsx
git commit -m "feat(franqueados): replace FranchiseeForm with 7-step wizard, update Detail with status badge"
```

---

## Self-Review

### Spec coverage check

| Seção do spec | Task |
|---------------|------|
| Seção 0 — Logo | Task 8 (Step1) ✓ |
| Seção 1 — Tipo & Contrato (vigência auto) | Task 8 (Step1) ✓ |
| Seção 2 — Identificação + CNPJ lookup | Task 9 (Step2) ✓ |
| Seção 3 — Área de Abrangência + perímetro | Task 10 (Step3) ✓ |
| Seção 4 — Responsável Legal + CPF | Task 10 (Step4) ✓ |
| Seção 5 — Responsável Operacional + toggle | Task 10 (Step5) ✓ |
| Seção 6 — Endereço + CEP lookup | Task 11 (Step6) ✓ |
| Seção 7 — Status + limite + observações | Task 11 (Step7) ✓ |
| DB migration | Task 1 ✓ |
| Validators CNPJ/CPF + masks | Task 2 ✓ |
| useCnpjLookup | Task 3 ✓ |
| useCepLookup | Task 4 ✓ |
| Status padrão Em Implantação | WizardContext defaultValues ✓ |
| Modal confirmação | Task 12 ✓ |
| Logo upload Supabase Storage | Task 12 (uploadLogo) ✓ |
| Progress bar Passo X de 7 | Task 7 ✓ |
| Campos autofilled com ícone | Tasks 9, 11 ✓ |
| Seção 8 — Contratos assinados | Fora do escopo (Ciclo 2) ✓ |
| Auth invite | Fora do escopo (Ciclo 2) ✓ |

### Consistência de tipos verificada
- `UnitStatus` definido em Task 5, usado em Tasks 11, 13 ✓
- `uploadLogo` definido em Task 5, usado em Task 12 ✓
- `WizardValues` definido em Task 6 (WizardContext), todas as refs de fields batem ✓
- `STEP_FIELDS` cobre steps 1-7 com campos corretos ✓
