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
    if (fields.length) markAutofilled(fields)
  }, [status, data, setValue, markAutofilled])

  function handleCepBlur() { lookup(cepRaw ?? '') }

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
