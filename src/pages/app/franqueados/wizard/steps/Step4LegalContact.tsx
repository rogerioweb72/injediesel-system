import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardContext'
import { maskCPF, maskPhone } from '@/lib/validators'

export function Step4LegalContact() {
  const { form } = useWizard()
  const { register, setValue, formState: { errors } } = form

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
            onChange={(e) => setValue('responsavel_legal_cpf', maskCPF(e.target.value))}
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
              onChange={(e) => setValue('responsavel_legal_telefone', maskPhone(e.target.value))}
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
