import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCompanySettings, useUpdateCompanySettings, PDV_DEFAULTS, type PdvSettings } from '@/hooks/useCompanySettings'

const schema = z.object({
  name:  z.string().min(2, 'Nome obrigatório'),
  cnpj:  z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city:   z.string().optional(),
    state:  z.string().optional(),
    zip:    z.string().optional(),
  }).optional(),
})

type FormData = z.infer<typeof schema>

function PdvSettingsCard() {
  const { data: settings } = useCompanySettings()
  const update = useUpdateCompanySettings()
  const current: PdvSettings = { ...PDV_DEFAULTS, ...(settings?.pdv_settings ?? {}) }

  const [form, setForm] = useState<PdvSettings>(current)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings?.pdv_settings) setForm({ ...PDV_DEFAULTS, ...settings.pdv_settings })
  }, [settings])

  function handleChange(field: keyof PdvSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
  }

  async function save() {
    await update.mutateAsync({ pdv_settings: form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="pm-card space-y-4">
      <p className="text-sm font-medium text-foreground">Configurações de Pagamento (PDV)</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Taxa de Juros Mensal (%)</label>
          <Input
            type="number" step="0.1" min="0" max="100"
            value={form.interest_rate}
            onChange={(e) => handleChange('interest_rate', e.target.value)}
            placeholder="3.5"
          />
          <p className="text-xs text-muted-foreground/60">Aplicada no parcelamento no cartão</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Parcelas sem Juros</label>
          <Input
            type="number" step="1" min="1" max="12"
            value={form.interest_free_installments}
            onChange={(e) => handleChange('interest_free_installments', e.target.value)}
            placeholder="2"
          />
          <p className="text-xs text-muted-foreground/60">Até Nx sem cobrança de juros</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desconto Dinheiro / PIX (%)</label>
          <Input
            type="number" step="0.5" min="0" max="50"
            value={form.cash_pix_discount}
            onChange={(e) => handleChange('cash_pix_discount', e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground/60">0 = sem desconto</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Máximo de Parcelas</label>
          <Input
            type="number" step="1" min="1" max="24"
            value={form.max_installments}
            onChange={(e) => handleChange('max_installments', e.target.value)}
            placeholder="12"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={update.isPending}
          style={{ background: 'var(--pm-accent-gradient)' }}
        >
          {update.isPending ? 'Salvando...' : 'Salvar PDV'}
        </Button>
        {saved && <p className="text-sm text-green-400">Salvo!</p>}
      </div>
    </div>
  )
}

export function CompanyTab() {
  const { data: settings, isLoading } = useCompanySettings()
  const update = useUpdateCompanySettings()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (settings) {
      reset({
        name:  settings.name,
        cnpj:  settings.cnpj ?? '',
        email: settings.email ?? '',
        phone: settings.phone ?? '',
        address: {
          street: settings.address?.street ?? '',
          city:   settings.address?.city   ?? '',
          state:  settings.address?.state  ?? '',
          zip:    settings.address?.zip    ?? '',
        },
      })
    }
  }, [settings, reset])

  async function onSubmit(data: FormData) {
    await update.mutateAsync({
      name:    data.name,
      cnpj:    data.cnpj   || null,
      email:   data.email  || null,
      phone:   data.phone  || null,
      address: data.address ?? null,
    })
    reset(data)
  }

  if (isLoading) return <div className="pm-skeleton h-64 rounded" />

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">

      <div className="pm-card space-y-4">
        <p className="text-sm font-medium text-foreground">Dados da Empresa</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Nome da empresa *</label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">CNPJ</label>
            <Input {...register('cnpj')} placeholder="00.000.000/0001-00" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Telefone</label>
            <Input {...register('phone')} placeholder="(00) 0000-0000" />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">E-mail</label>
            <Input {...register('email')} placeholder="contato@empresa.com" />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      <div className="pm-card space-y-4">
        <p className="text-sm font-medium text-foreground">Endereço</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Logradouro</label>
            <Input {...register('address.street')} placeholder="Rua, Av., número" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cidade</label>
            <Input {...register('address.city')} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Estado</label>
            <Input {...register('address.state')} placeholder="SP" maxLength={2} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">CEP</label>
            <Input {...register('address.zip')} placeholder="00000-000" />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!isDirty || update.isPending}
        style={{ background: 'var(--pm-accent-gradient)' }}
      >
        {update.isPending ? 'Salvando...' : 'Salvar Configurações'}
      </Button>

      {update.isSuccess && (
        <p className="text-sm text-green-400">Configurações salvas com sucesso.</p>
      )}
    </form>
    <div className="mt-6 max-w-2xl">
      <PdvSettingsCard />
    </div>
    </>
  )
}
