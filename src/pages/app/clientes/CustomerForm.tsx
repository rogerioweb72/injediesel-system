import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
import { FRANCHISE_ROLES } from '@/types/app'

const schema = z.object({
  name:      z.string().min(2, 'Nome é obrigatório'),
  email:     z.string().email('E-mail inválido').or(z.literal('')).nullable(),
  phone:     z.string().min(1, 'Celular é obrigatório'),
  document:  z.string().min(1, 'CPF / CNPJ é obrigatório'),
  price_tier: z.enum(['cliente_final', 'franqueado_linha_leve', 'franqueado_full']),
  active:    z.boolean(),
  // address (all optional)
  logradouro: z.string().nullable(),
  numero:     z.string().nullable(),
  cidade:     z.string().nullable(),
  estado:     z.string().max(2).nullable(),
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
      name: '', email: null, phone: '', document: '',
      price_tier: 'cliente_final', active: true,
      logradouro: null, numero: null, cidade: null, estado: null,
    },
  })

  useEffect(() => {
    if (customer) {
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

            <div className="space-y-1">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" {...register('name')} placeholder="João da Silva" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Celular *</Label>
                <Input id="phone" {...register('phone')} placeholder="(11) 99999-9999" />
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
                <Label htmlFor="document">CPF / CNPJ *</Label>
                <Input id="document" {...register('document')} placeholder="000.000.000-00" />
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

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" {...register('cidade')} placeholder="São Paulo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" {...register('estado')} placeholder="SP" maxLength={2} className="uppercase" />
                {errors.estado && <p className="text-xs text-red-400">{errors.estado.message}</p>}
              </div>
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
