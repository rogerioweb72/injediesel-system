import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { validarCPF, validarCNPJ, maskCPF, maskCNPJ } from '@/lib/validators'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { LocationFields } from '@/components/shared/LocationFields'
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
import { FRANCHISE_ROLES } from '@/types/app'

const schema = z.object({
  country:   z.enum(['BR', 'PY']),
  name:      z.string().min(2, 'Nome é obrigatório'),
  email:     z.string().email('E-mail inválido').or(z.literal('')).nullable(),
  phone:     z.string().min(1, 'Celular é obrigatório'),
  // Documento livre por padrão; CPF/CNPJ só é validado quando country=BR (ver refine).
  document:  z.string().min(1, 'Documento é obrigatório'),
  price_tier: z.enum(['cliente_final', 'franqueado_linha_leve', 'franqueado_full']),
  active:    z.boolean(),
  // address (all optional). estado sem max(2) — PY tem departamentos com nome longo.
  logradouro: z.string().nullable(),
  numero:     z.string().nullable(),
  cidade:     z.string().nullable(),
  estado:     z.string().nullable(),
}).superRefine((val, ctx) => {
  // Só BR exige CPF/CNPJ válido. PY = cédula/RUC → digitação livre.
  if (val.country === 'BR' && !(validarCPF(val.document) || validarCNPJ(val.document))) {
    ctx.addIssue({ path: ['document'], code: 'custom', message: 'CPF ou CNPJ inválido' })
  }
})

type FormValues = z.infer<typeof schema>

export default function CustomerForm() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: customer, isLoading } = useCustomer(id ?? '')
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const { profile } = useProfile()
  const { data: myUnit } = useMyUnit()
  const isFranchise = FRANCHISE_ROLES.includes(profile?.role as never)

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      country: 'BR', name: '', email: null, phone: '', document: '',
      price_tier: 'cliente_final', active: true,
      logradouro: null, numero: null, cidade: null, estado: null,
    },
  })

  useEffect(() => {
    if (customer) {
      setValue('country',   customer.country ?? 'BR')
      setValue('name',      customer.name)
      setValue('email',     customer.email)
      setValue('phone',     customer.phone ?? '')
      setValue('document',  customer.document ?? '')
      setValue('price_tier', customer.price_tier)
      setValue('active',    customer.active)
      const addr = customer.address
      if (addr) {
        setValue('logradouro', addr.logradouro ?? null)
        setValue('numero',     addr.numero     ?? null)
        setValue('cidade',     addr.cidade     ?? null)
        setValue('estado',     addr.estado     ?? null)
      }
    }
  }, [customer, setValue])

  async function onSubmit(values: FormValues) {
    const address = (values.logradouro || values.numero || values.cidade || values.estado)
      ? {
          logradouro: values.logradouro || undefined,
          numero:     values.numero     || undefined,
          cidade:     values.cidade     || undefined,
          estado:     values.estado     || undefined,
        }
      : null

    const payload = {
      country:          values.country,
      name:             values.name,
      email:            values.email  || null,
      phone:            values.phone  || null,
      document:         values.document || null,
      price_tier:       values.price_tier,
      unit_id: isFranchise ? (myUnit?.unit_id ?? null) : null,
      active:           values.active,
      address,
    }

    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    navigate(`${prefix}/clientes`)
  }

  if (isEdit && isLoading) return <div className="pm-skeleton h-64 w-full rounded" />

  // eslint-disable-next-line react-hooks/incompatible-library
  const priceTier = watch('price_tier')
  const country = watch('country')
  const isPY = country === 'PY'

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle={isEdit ? `Editando ${customer?.name ?? ''}` : 'Preencha os dados do cliente'}
        actions={
          <Button variant="ghost" onClick={() => navigate(`${prefix}/clientes`)}>
            <ArrowLeft size={16} className="mr-2" />Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Dados pessoais */}
          <div className="pm-card space-y-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Dados Pessoais</p>

            {/* País do cliente — BR segue padrões brasileiros; PY libera documento/celular livres */}
            <div className="space-y-1">
              <Label>País *</Label>
              <div className="flex gap-2">
                {([['BR', '🇧🇷', 'Brasil'], ['PY', '🇵🇾', 'Paraguai']] as const).map(([code, flag, label]) => (
                  <button
                    key={code} type="button"
                    onClick={() => setValue('country', code, { shouldValidate: true })}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                      country === code
                        ? 'bg-[hsl(var(--pm-red-500))] border-[hsl(var(--pm-red-500))] text-white'
                        : 'bg-transparent border-[hsl(var(--pm-gray-700))] text-muted-foreground hover:border-[hsl(var(--pm-gray-500))]',
                    )}
                  >
                    <span className="text-base leading-none">{flag}</span>{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" {...register('name')} placeholder="João da Silva" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Celular *</Label>
                <Input id="phone" {...register('phone')} placeholder={isPY ? '+595 9XX XXX XXX' : '(11) 99999-9999'} />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} placeholder="exemplo@email.com" />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="document">{isPY ? 'Cédula / RUC / Documento *' : 'CPF / CNPJ *'}</Label>
                <Input
                  id="document"
                  {...register('document')}
                  placeholder={isPY ? 'Documento do Paraguai (livre)' : '000.000.000-00 ou 00.000.000/0001-00'}
                  onChange={e => {
                    if (isPY) {
                      // PY: digitação livre (cédula/RUC não seguem máscara BR)
                      setValue('document', e.target.value, { shouldValidate: true })
                    } else {
                      const digits = e.target.value.replace(/\D/g, '')
                      const masked = digits.length <= 11 ? maskCPF(digits) : maskCNPJ(digits)
                      setValue('document', masked, { shouldValidate: true })
                    }
                  }}
                />
                {errors.document && <p className="text-xs text-red-400">{errors.document.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tier de Preço</Label>
                <Select value={priceTier} onValueChange={(v) => setValue('price_tier', v as FormValues['price_tier'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente_final">Cliente Final</SelectItem>
                    <SelectItem value="franqueado_linha_leve">Franqueado — Linha Leve</SelectItem>
                    <SelectItem value="franqueado_full">Franqueado — Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" {...register('active')} className="h-4 w-4 rounded border-gray-600" />
              <Label htmlFor="active">Cliente ativo</Label>
            </div>
          </div>

          {/* Endereço */}
          <div className="pm-card space-y-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Endereço <span className="normal-case font-normal text-muted-foreground/50">(opcional)</span>
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" {...register('logradouro')} placeholder="Rua, Av., Alameda..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" {...register('numero')} placeholder="123" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LocationFields
                country={country}
                cidade={watch('cidade') ?? ''}
                estado={watch('estado') ?? ''}
                onCidade={(v) => setValue('cidade', v || null)}
                onEstado={(v) => setValue('estado', v || null)}
                idPrefix="cust"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="ghost" onClick={() => navigate(`${prefix}/clientes`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} style={{ background: 'var(--pm-accent-gradient)' }}>
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
