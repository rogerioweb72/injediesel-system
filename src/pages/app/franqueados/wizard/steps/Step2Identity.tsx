import { useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardContext'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import { maskCNPJ, maskCPF, maskPhone } from '@/lib/validators'

function AutofilledIcon() {
  return <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
}

export function Step2Identity() {
  const { form, markAutofilled, clearAutofilled, autofilled } = useWizard()
  const { register, setValue, watch, formState: { errors } } = form
  const { status, data, lookup } = useCnpjLookup()

  const documentType = watch('document_type')
  const isPJ = documentType !== 'cpf'
  const cnpjRaw = watch('cnpj')

  useEffect(() => {
    if (!isPJ) return // autofill da Receita NUNCA no modo PF (não existe lookup de CPF)
    if (status !== 'success' || !data) return
    const fields: string[] = []
    if (data.razao_social) { setValue('razao_social', data.razao_social); fields.push('razao_social') }
    if (data.municipio) { setValue('city', data.municipio); fields.push('city') }
    if (data.uf) { setValue('state', data.uf); fields.push('state') }
    if (data.cep) { setValue('cep', data.cep.replace(/\D/g,'')); fields.push('cep') }
    if (data.logradouro) { setValue('logradouro', data.logradouro); fields.push('logradouro') }
    if (data.bairro) { setValue('bairro', data.bairro); fields.push('bairro') }
    if (data.numero) { setValue('numero', data.numero); fields.push('numero') }
    if (fields.length) markAutofilled(fields)
  }, [isPJ, status, data, setValue, markAutofilled])

  function handleCnpjBlur() {
    lookup(cnpjRaw ?? '')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {isPJ ? 'Dados Fiscais' : 'Dados do Responsável'}
        </p>

        {isPJ ? (
          <div className="space-y-1">
            <Label>CNPJ *</Label>
            <div className="relative">
              <Input
                {...register('cnpj')}
                placeholder="00.000.000/0000-00"
                onChange={(e) => { setValue('cnpj', maskCNPJ(e.target.value)); clearAutofilled('cnpj') }}
                onBlur={handleCnpjBlur}
                maxLength={18}
              />
              {status === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {errors.cnpj && <p className="text-xs text-red-400">{errors.cnpj.message}</p>}
            {status === 'error' && <p className="text-xs text-amber-400">CNPJ não encontrado na Receita Federal</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <Label>CPF *</Label>
            <Input
              {...register('cpf')}
              placeholder="000.000.000-00"
              onChange={(e) => setValue('cpf', maskCPF(e.target.value))}
              maxLength={14}
            />
            {errors.cpf && <p className="text-xs text-red-400">{errors.cpf.message}</p>}
            <p className="text-[11px] text-muted-foreground">Representante autônomo (Pessoa Física) — sem consulta à Receita.</p>
          </div>
        )}

        <div className="space-y-1">
          <Label>Nome Fantasia *</Label>
          <Input
            {...register('name')}
            placeholder={isPJ ? 'Injediesel System São Paulo' : 'Nome comercial do representante'}
            onChange={() => clearAutofilled('name')}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        {isPJ && (
          <>
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
          </>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Contato</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input
              {...register('phone')}
              placeholder="(11) 99999-9999"
              onChange={(e) => setValue('phone', maskPhone(e.target.value))}
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
          <Input {...register('website')} placeholder="https://unidade.injediesel.com.br" />
        </div>
      </div>
    </div>
  )
}
