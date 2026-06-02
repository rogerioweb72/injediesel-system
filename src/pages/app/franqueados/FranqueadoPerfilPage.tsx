import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import {
  Lock, Eye, EyeOff, Upload, RefreshCw, ArrowLeft, UserPlus, Plus,
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
import { useCommissions } from '@/hooks/useCaixa'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { NovoLancamentoModal } from '@/pages/app/caixa/NovoLancamentoModal'

// ─── Schema ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const perfilSchema = z.object({
  name:            z.string().min(3, 'Mínimo 3 caracteres'),
  phone:           z.string().refine(v => v.replace(/\D/g, '').length >= 10, 'Celular inválido'),
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

// ─── Password strength ───────────────────────────────────────────────────────
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

// ─── PhoneMaskInput ───────────────────────────────────────────────────────────
function applyPhoneMask(digits: string) {
  // 11 digits → (XX) XXXXX-XXXX   |   10 digits → (XX) XXXX-XXXX
  const d = digits.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function PhoneMaskInput({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  name?: string
}) {
  const toDisplay = (raw: string) => applyPhoneMask(raw.replace(/\D/g, ''))

  const [display, setDisplay] = useState(() => toDisplay(value ?? ''))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplay(toDisplay(value ?? ''))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setDisplay(applyPhoneMask(digits))
    onChange(applyPhoneMask(digits))
  }

  return (
    <Input
      name={name}
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder="(99) 99999-9999"
      maxLength={16}
      inputMode="numeric"
    />
  )
}

// ─── DateMaskInput ────────────────────────────────────────────────────────────
function DateMaskInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toDisplay = (iso: string) => {
    if (!iso || iso.length < 10) return ''
    const [y, m, d] = iso.split('-')
    return y && m && d ? `${d}/${m}/${y}` : ''
  }

  const [display, setDisplay] = useState(() => toDisplay(value))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplay(toDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setDisplay(formatted)
    if (digits.length === 8) {
      onChange(`${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`)
    } else {
      onChange('')
    }
  }

  return (
    <Input
      value={display}
      onChange={handleChange}
      placeholder="DD/MM/AAAA"
      maxLength={10}
      inputMode="numeric"
    />
  )
}

// ─── LockedInput ─────────────────────────────────────────────────────────────
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

// ─── PerfilDadosUnidade ──────────────────────────────────────────────────────
type UnitData = NonNullable<ReturnType<typeof useMyUnit>['data']>['franchise_units']

function PerfilDadosUnidade({ unit }: { unit: UnitData | undefined }) {
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
        <LockedInput label="Nome fantasia"              value={unit?.name} />
        <LockedInput label="Razão social"               value={unit?.razao_social} />
        <LockedInput label="CNPJ"                       value={unit?.cnpj} />
        <LockedInput label="Inscrição estadual"         value={unit?.inscricao_estadual} />
        <LockedInput label="Data de abertura"           value={fmtDate(unit?.data_abertura ?? null)} />
        <LockedInput label="Início do contrato"         value={fmtDate(unit?.contract_start_date ?? null)} />
        <LockedInput label="Término do contrato"        value={fmtDate(unit?.contract_end_date ?? null)} />
        <LockedInput label="Plano contratado"           value={unit?.plan ? (planLabel[unit.plan] ?? unit.plan) : null} />
        <LockedInput label="Status financeiro"          value={unit?.financial_status} />
        <LockedInput label="ID da unidade"              value={unit?.id} />
        <LockedInput label="Limite de arquivos"         value={unit?.file_limit?.toString()} />
        <LockedInput label="Telefone comercial"         value={unit?.commercial_phone} />
        <LockedInput label="E-mail comercial"           value={unit?.commercial_email} />
        <LockedInput label="Horário de funcionamento"   value={unit?.business_hours} />
        <LockedInput label="Técnico responsável"
          value={unit?.main_technician ? `${unit.main_technician.name} — ${unit.main_technician.contact}` : null} />
      </div>
    </div>
  )
}

// ─── RenovarContratoModal ────────────────────────────────────────────────────
function RenovarContratoModal({
  open, onClose, unitId,
}: { open: boolean; onClose: () => void; unitId: string | undefined }) {
  const [periodo, setPeriodo] = useState<string>('12')
  const [obs, setObs] = useState('')
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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

// ─── PerfilIdentidadePanel ───────────────────────────────────────────────────
function PerfilIdentidadePanel({
  profile,
  unit,
  onRenovar,
}: {
  profile: ReturnType<typeof useFranchiseeProfile>['data']
  unit: UnitData | undefined
  onRenovar: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useUploadAvatar()
  const createTicket = useCreateSupportTicket()

  const [trocaNomeOpen, setTrocaNomeOpen] = useState(false)
  const [nomeDesejado, setNomeDesejado] = useState('')

  const initials = (profile?.name ?? '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

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
          {unit?.city}{unit?.state ? ` / ${unit.state}` : ''}
        </p>
        <button
          onClick={() => setTrocaNomeOpen(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Trocar Nome de usuário
        </button>
      </div>

      {/* Contrato */}
      {unit?.contract_start_date && unit?.contract_end_date ? (
        <div className="w-full">
          <ContractProgressBar
            startDate={unit.contract_start_date}
            endDate={unit.contract_end_date}
          />
        </div>
      ) : (
        <p className="text-xs text-center w-full" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          Datas de contrato não configuradas.<br />Entre em contato com a franqueadora.
        </p>
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

// ─── PerfilFormPanel ─────────────────────────────────────────────────────────
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
  unit: UnitData | undefined
}) {
  const updateProfile = useUpdateProfile()
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [oldPwdError, setOldPwdError] = useState('')

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors, isSubmitting } } = useForm<PerfilFormData>({
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

  useEffect(() => {
    if (!profile) return
    reset({
      name:           profile.name ?? '',
      phone:          profile.phone ?? '',
      birth_date:     profile.birth_date ?? '',
      cep:            profile.cep ?? '',
      street:         profile.street ?? '',
      address_number: profile.address_number ?? '',
      complement:     profile.complement ?? '',
      neighborhood:   profile.neighborhood ?? '',
      city:           profile.city ?? '',
      state:          profile.state ?? '',
    })
  }, [profile, reset])

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

    if (data.email || data.newPassword) {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email ?? ''
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: data.oldPassword ?? '',
      })
      if (authErr) {
        setOldPwdError('Senha antiga incorreta.')
        return
      }
    }

    if (data.email) {
      const { error } = await supabase.auth.updateUser({ email: data.email })
      if (error) { toast.error('Erro ao trocar e-mail: ' + translateError(error.message)); return }
      toast.info('Verifique seu novo e-mail para confirmar a troca.')
    }

    if (data.newPassword) {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword })
      if (error) { toast.error('Erro ao trocar senha: ' + translateError(error.message)); return }
    }

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
      reset({
        // eslint-disable-next-line react-hooks/incompatible-library
        ...watch(),
        email:           '',
        emailConfirm:    '',
        newPassword:     '',
        confirmPassword: '',
        oldPassword:     '',
      })
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
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneMaskInput
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>

        <FormField label="Data de nascimento" error={errors.birth_date?.message}>
          <Controller
            name="birth_date"
            control={control}
            render={({ field }) => (
              <DateMaskInput value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
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
      <div>
        <FormField label="Senha antiga (obrigatório para trocar e-mail ou senha)" error={errors.oldPassword?.message}>
          <div className="relative max-w-sm">
            <Input type={showOld ? 'text' : 'password'} {...register('oldPassword')} className="pr-9" />
            <button type="button" tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowOld(v => !v)}>
              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </FormField>
        {oldPwdError && <p className="text-[11px] text-red-400 mt-1">{oldPwdError}</p>}
      </div>

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

// ─── FranqueadoPerfilPage ────────────────────────────────────────────────────
export default function FranqueadoPerfilPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { data: profile, isLoading: loadingProfile } = useFranchiseeProfile()
  const { data: myUnit, isLoading: loadingUnit } = useMyUnit()
  const unit = myUnit?.franchise_units
  const unitId = myUnit?.unit_id ?? ''
  const [renovarOpen, setRenovarOpen] = useState(false)
  const [lancamentoOpen, setLancamentoOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { data: commissions = [] } = useCommissions(user?.id)
  const totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0)

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
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} className="mr-1.5" />
              Voltar ↵
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`${prefix}/clientes/novo`)}
              style={{ background: '#16A34A', color: '#fff', border: 'none' }}
            >
              <UserPlus size={14} className="mr-1.5" />
              Novo Cliente
            </Button>
            <Button
              size="sm"
              onClick={() => setLancamentoOpen(true)}
              style={{ background: '#2563EB', color: '#fff', border: 'none' }}
            >
              <Plus size={14} className="mr-1.5" />
              Novo Lançamento
            </Button>
          </div>
        }
      />

      <div
        className="mt-6 p-6 rounded-xl"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid hsl(var(--pm-gray-800))' }}
      >
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

      {commissions.length > 0 && (
        <div
          className="mt-6 rounded-2xl p-5 space-y-4"
          style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Minhas Comissões</h3>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
            >
              Total: {totalCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Data', 'Serviço', 'Cliente', 'Valor Bruto', 'Desconto', '%', 'Comissão'].map((h) => (
                    <th
                      key={h}
                      className="text-left pb-2 pr-4 text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: 'hsl(var(--pm-gray-500))' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-400))', fontFamily: 'var(--pm-font-mono)', fontSize: 11 }}>
                      {new Date(c.paid_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 pr-4 text-white">{c.ecu_jobs?.service_type ?? '—'}</td>
                    <td className="py-2 pr-4" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                      {c.ecu_jobs?.customers?.name ?? '—'}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-300))' }}>
                      {c.gross_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap" style={{ color: '#F87171' }}>
                      {c.discount_amount > 0
                        ? `- ${c.discount_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-4" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                      {c.commission_rate}%
                    </td>
                    <td className="py-2 font-semibold whitespace-nowrap" style={{ color: '#4ADE80' }}>
                      {c.commission_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RenovarContratoModal
        open={renovarOpen}
        onClose={() => setRenovarOpen(false)}
        unitId={unit?.id}
      />

      {lancamentoOpen && (
        <NovoLancamentoModal
          unitId={unitId}
          onClose={() => setLancamentoOpen(false)}
          onSuccess={() => setLancamentoOpen(false)}
        />
      )}
    </div>
  )
}
