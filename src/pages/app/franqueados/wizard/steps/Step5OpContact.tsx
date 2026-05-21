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
                  onChange={(e) => setValue('responsavel_op_telefone', maskPhone(e.target.value))}
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
