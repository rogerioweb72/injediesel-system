import { Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWizard } from '../WizardContext'

export function Step3Territory() {
  const { form } = useWizard()
  const { register, control, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Delimitação Territorial</p>

        <div className="space-y-1">
          <Label>Raio de Atendimento (km)</Label>
          <Input type="number" min={0} step={0.5} {...register('raio_atendimento_km')} placeholder="50" />
          {errors.raio_atendimento_km && <p className="text-xs text-red-400">{errors.raio_atendimento_km.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>
            Cidades Atendidas
            <span className="text-[10px] text-muted-foreground font-normal ml-1">(separadas por vírgula)</span>
          </Label>
          <Textarea {...register('cidades_atendidas_txt')} rows={3} placeholder="São Paulo, Guarulhos, Campinas..." />
        </div>

        <div className="space-y-1">
          <Label>Cidade Fiscal <span className="text-[10px] text-muted-foreground font-normal">(domicílio tributário)</span></Label>
          <Input {...register('cidade_fiscal')} placeholder="Município para emissão de NF" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <Label className="cursor-pointer">Perímetro Exclusivo</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info size={13} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                Proteção territorial: nenhuma outra unidade da rede poderá atender clientes dentro do raio definido desta unidade.
              </TooltipContent>
            </Tooltip>
          </div>
          <Controller
            control={control}
            name="perimetro_exclusivo"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </div>
  )
}
