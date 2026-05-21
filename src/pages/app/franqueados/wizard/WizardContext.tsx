import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { validarCNPJ, validarCPF } from '@/lib/validators'

export const wizardSchema = z.object({
  contract_type: z.enum(['full', 'linha_leve']),
  contract_duration: z.enum(['1','2','3','5','custom']).default('1'),
  contract_start_date: z.string().min(1, 'Data de início obrigatória'),
  contract_end_date: z.string().min(1, 'Data de término obrigatória'),
  name: z.string().min(2, 'Nome fantasia obrigatório'),
  cnpj: z.string().refine(validarCNPJ, 'CNPJ inválido'),
  razao_social: z.string().nullable(),
  inscricao_estadual: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable(),
  website: z.string().nullable(),
  raio_atendimento_km: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().positive().nullable(),
  ),
  cidades_atendidas_txt: z.string().nullable(),
  cidade_fiscal: z.string().nullable(),
  perimetro_exclusivo: z.boolean().default(false),
  responsavel_legal_nome: z.string().min(2, 'Nome obrigatório'),
  responsavel_legal_cpf: z.string().refine(validarCPF, 'CPF inválido'),
  responsavel_legal_email: z.string().email('E-mail inválido'),
  responsavel_legal_telefone: z.string().min(10, 'Telefone obrigatório'),
  responsavel_legal_cargo: z.string().nullable(),
  responsavel_op_mesmo_legal: z.boolean().default(true),
  responsavel_op_nome: z.string().nullable(),
  responsavel_op_email: z.string().nullable(),
  responsavel_op_telefone: z.string().nullable(),
  cep: z.string().min(8, 'CEP obrigatório'),
  logradouro: z.string().nullable(),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().nullable(),
  bairro: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
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
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
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
