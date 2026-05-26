# Design: Wizard de Cadastro de Unidade Franqueada

**Data:** 2026-05-20  
**Ciclo:** 1 de 2  
**Arquivos afetados:** `src/pages/app/franqueados/`, `src/hooks/`, `supabase/migrations/`

---

## Escopo do Ciclo 1

Entrega:
- Wizard 7 passos substituindo `FranchiseeForm.tsx`
- DB migration com novas colunas em `franchise_units`
- Logo upload (bucket `logos-unidades`, público)
- ViaCEP + BrasilAPI CNPJ (auto-preenchimento)
- Máscaras + validação de dígitos (CNPJ, CPF, CEP, telefone)
- Status enum (Em implantação / Ativa / Suspensa / Encerrada)
- Modal de confirmação antes de salvar

Ciclo 2 (fora do escopo agora):
- Bucket `contratos-unidades` (privado + signed URL)
- Tabela `unidade_contratos`
- Auth invite via Supabase (credenciais de acesso)
- E-mail de boas-vindas

---

## Arquitetura de Arquivos

```
src/pages/app/franqueados/
├── FranchiseesPage.tsx          (sem mudança)
├── FranchiseeDetail.tsx         (ajuste: status enum + novos campos)
├── FranchiseeForm.tsx           (removido — substituído pelo wizard)
└── wizard/
    ├── FranchiseeWizard.tsx     (shell: Sheet, progress bar, nav, submit)
    ├── WizardContext.tsx        (useForm compartilhado + state auxiliar)
    ├── ConfirmSummaryDialog.tsx (resumo antes do salvar)
    └── steps/
        ├── Step1ContractType.tsx   (logo upload + tipo & vigência)
        ├── Step2Identity.tsx       (CNPJ lookup + identidade + contato)
        ├── Step3Territory.tsx      (raio, cidades, cidade fiscal, perímetro)
        ├── Step4LegalContact.tsx   (responsável legal + CPF)
        ├── Step5OpContact.tsx      (responsável operacional, toggle)
        ├── Step6Address.tsx        (CEP lookup + endereço estruturado)
        └── Step7Operational.tsx    (status, limite colaboradores, observações)

src/hooks/
├── useFranchiseUnits.ts         (atualizar type FranchiseUnit + UnitStatus)
├── useCnpjLookup.ts             (BrasilAPI CNPJ)
└── useCepLookup.ts              (ViaCEP)
```

---

## Banco de Dados

### Novas colunas em `franchise_units`

```sql
ALTER TABLE franchise_units
  ADD COLUMN status TEXT NOT NULL DEFAULT 'em_implantacao'
    CHECK (status IN ('em_implantacao','ativa','suspensa','encerrada')),
  ADD COLUMN logo_url TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN perimetro_exclusivo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN responsavel_legal_nome TEXT,
  ADD COLUMN responsavel_legal_cpf TEXT,
  ADD COLUMN responsavel_legal_email TEXT,
  ADD COLUMN responsavel_legal_telefone TEXT,
  ADD COLUMN responsavel_legal_cargo TEXT,
  ADD COLUMN responsavel_op_mesmo_legal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN responsavel_op_nome TEXT,
  ADD COLUMN responsavel_op_email TEXT,
  ADD COLUMN responsavel_op_telefone TEXT,
  ADD COLUMN cep TEXT,
  ADD COLUMN logradouro TEXT,
  ADD COLUMN numero TEXT,
  ADD COLUMN complemento TEXT,
  ADD COLUMN bairro TEXT,
  ADD COLUMN limite_colaboradores INTEGER,
  ADD COLUMN observacoes_internas TEXT;
```

### Trigger de sincronização com `active`

```sql
CREATE OR REPLACE FUNCTION sync_franchise_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.active := (NEW.status = 'ativa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_franchise_status
  BEFORE INSERT OR UPDATE ON franchise_units
  FOR EACH ROW EXECUTE FUNCTION sync_franchise_status();

-- Migrar dados existentes
UPDATE franchise_units
SET status = CASE WHEN active THEN 'ativa' ELSE 'em_implantacao' END;
```

O campo `active` permanece na tabela por retrocompatibilidade com código existente. O trigger garante consistência. Remoção de `active` fica para sprint futuro após migrar todas as leituras para `status`.

### Bucket Storage

- Nome: `logos-unidades`
- Visibilidade: público (URL direta para preview)
- Estrutura: `logos-unidades/{unit_id}/logo.{ext}`
- Formatos aceitos: JPG, PNG, WEBP
- Tamanho máximo: 2MB (validado no frontend)

---

## Tipo `FranchiseUnit` atualizado

```ts
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
  address: string | null  // mantido para compatibilidade com Detail
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
  active: boolean  // deprecated — use status
  commission_rate: number
  manager_id: string | null
  limite_colaboradores: number | null
  observacoes_internas: string | null
  created_at: string
}
```

---

## Os 7 Passos do Wizard

| Passo | Título | Campos obrigatórios | Campos opcionais |
|-------|--------|--------------------|--------------------|
| 1 | Logo & Contrato | contract_type, contract_start_date, contract_end_date | logo (file) |
| 2 | Identificação | name, cnpj | razao_social, inscricao_estadual, phone, email, website |
| 3 | Área de Abrangência | — | raio_atendimento_km, cidades_atendidas, cidade_fiscal, perimetro_exclusivo |
| 4 | Responsável Legal | responsavel_legal_nome, responsavel_legal_cpf, responsavel_legal_email, responsavel_legal_telefone | responsavel_legal_cargo |
| 5 | Resp. Operacional | — (toggle oculta campos) | responsavel_op_nome, responsavel_op_email, responsavel_op_telefone |
| 6 | Endereço | cep, numero | logradouro, complemento, bairro, city, state |
| 7 | Operacional | — | status (default: em_implantacao), limite_colaboradores, observacoes_internas |

---

## Validações

### CNPJ (dígitos verificadores)
```ts
function validarCNPJ(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false
  const calc = (len: number) => {
    let sum = 0, pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(n[len - i]) * pos--
      if (pos < 2) pos = 9
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11)
  }
  return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13])
}
```

### CPF (dígitos verificadores)
```ts
function validarCPF(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  const d1 = n.slice(0,9).split('').reduce((s,c,i) => s + +c*(10-i), 0)
  const r1 = (d1 * 10) % 11
  const v1 = r1 >= 10 ? 0 : r1
  const d2 = n.slice(0,10).split('').reduce((s,c,i) => s + +c*(11-i), 0)
  const r2 = (d2 * 10) % 11
  const v2 = r2 >= 10 ? 0 : r2
  return v1 === +n[9] && v2 === +n[10]
}
```

### Vigência
- `contract_end_date` = readonly, calculado: `start_date + duração`
- Duração: select [1 ano | 2 anos | 3 anos | 5 anos | Personalizado]
- Personalizado: `end_date` editável, valida ≥ 12 meses
- Alerta vermelho inline se `end < start + 12 meses`

### Outras
- CEP: 8 dígitos numéricos
- E-mail: formato RFC (zod `.email()`)
- Telefone: ≥ 10 dígitos (após remover máscara)
- Data início: não pode ser passado — verificado via `superRefine` no schema; lê `useCurrentUser().role` no contexto do hook, e pula a validação se `role === 'admin_matriz'`

---

## Máscaras (sem dependência externa)

```ts
const maskCNPJ = (v: string) =>
  v.replace(/\D/g,'').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')

const maskCPF = (v: string) =>
  v.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g,'')
  return d.length <= 10
    ? d.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3')
    : d.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3')
}

const maskCEP = (v: string) =>
  v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')
```

---

## Hooks Externos

### `useCnpjLookup`
```ts
// GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
// Dispara onBlur do campo CNPJ se CNPJ válido
// Preenche: razao_social, address (logradouro+numero+bairro), city, state, cep
// Marca campos preenchidos em autofilled Set
// Estado: idle | loading | success | error
```

### `useCepLookup`
```ts
// GET https://viacep.com.br/ws/{cep}/json/
// Dispara onBlur do campo CEP se CEP = 8 dígitos
// Preenche: logradouro, bairro, city, state
// CEP tem prioridade sobre dados do CNPJ lookup (Step 6 usa CEP)
// Estado: idle | loading | success | error (CEP não encontrado)
```

### Indicador "preenchido via API"
- `autofilled: Set<string>` no `WizardContext`
- Campo em `autofilled` → ícone `CheckCircle2` cinza à direita
- Usuário edita → remove do Set

---

## WizardContext

```ts
interface WizardCtx {
  form: UseFormReturn<FormValues>
  currentStep: number
  setStep: (n: number) => void
  logoFile: File | null
  logoPreviewUrl: string | null
  setLogoFile: (f: File | null) => void
  autofilled: Set<string>
  markAutofilled: (fields: string[]) => void
  clearAutofilled: (field: string) => void
}
```

---

## WizardShell — Estrutura visual

```
Sheet (max-w-2xl, overflow-y-auto)
├── Header fixo (sticky top-0, bg blur)
│   ├── Título: "Nova Unidade Franqueada" / "Editar Unidade"
│   ├── 7 dots progress (● = atual, ◉ = completo, ○ = futuro)
│   └── Legenda: "Passo X de 7 — [Título do Passo]"
├── Corpo (flex-1, overflow-y-auto, padding)
│   └── <StepComponent />
└── Footer fixo (border-t, bg)
    ├── Esquerda: [Cancelar] (step 1) / [← Anterior] (steps 2-7)
    └── Direita: [Próximo →] (steps 1-6) / [Salvar Unidade ▶] (step 7)
```

### Navegação

```ts
async function handleNext() {
  const valid = await form.trigger(STEP_FIELDS[currentStep])
  if (valid) setStep(s => s + 1)
}

// Modo criação: dots não clicáveis (linear)
// Modo edição: dots clicáveis (qualquer step direto)
```

---

## Submit Flow

```
Step 7 → botão "Salvar Unidade"
  → form.trigger() — valida formulário completo
  → abre ConfirmSummaryDialog

ConfirmSummaryDialog exibe:
  "Você está criando a unidade [Nome Fantasia] em [Cidade — UF]"
  Contrato: [Full / Linha Leve]
  Vigência: [dd/mm/aaaa] → [dd/mm/aaaa]
  Responsável: [Nome] — [E-mail]
  Status inicial: Em implantação

  [Cancelar] → fecha dialog, wizard permanece aberto
  [Confirmar e Criar Unidade] →
    1. useCreateFranchiseUnit({ ...values, logo_url: null, status: 'em_implantacao' }) → unit.id
    2. se logoFile: upload para logos-unidades/{unit.id}/logo.{ext} → logo_url
    3. se logoFile: useUpdateFranchiseUnit({ id: unit.id, logo_url })
    4. toast.success('Unidade criada')
    5. onOpenChange(false)
    6. navigate(`${prefix}/franqueados/${unit.id}`)

Modo edição:
  - botão: "Salvar Alterações"
  - sem navigate após salvar
  - invalidar query cache da unidade
```

---

## Ajustes em `FranchiseeDetail.tsx`

- Mostrar `status` em vez de derivar de `active`
- Badge de status: Em Implantação (azul), Ativa (verde), Suspensa (amarelo), Encerrada (cinza)
- Exibir logo no header se `logo_url` presente
- Exibir campos novos: responsáveis, endereço estruturado, website
- Restante da lógica (bloqueio, renovação, upgrade) sem mudança

---

## Fora do Escopo (Ciclo 2)

- Upload de contrato assinado (Seção 8 do spec)
- Bucket `contratos-unidades` + tabela `unidade_contratos`
- Signed URL endpoint para download
- Auth invite Supabase + e-mail de boas-vindas
- Aba "Contratos" no `FranchiseeDetail`
