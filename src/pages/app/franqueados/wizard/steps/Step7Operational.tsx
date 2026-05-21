import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWizard } from '../WizardContext'

const STATUS_OPTIONS = [
  { value: 'em_implantacao', label: 'Em Implantação', desc: 'Unidade em processo de abertura' },
  { value: 'ativa', label: 'Ativa', desc: 'Operando normalmente' },
  { value: 'suspensa', label: 'Suspensa', desc: 'Temporariamente inativa' },
  { value: 'encerrada', label: 'Encerrada', desc: 'Contrato encerrado' },
] as const

export function Step7Operational() {
  const { form } = useWizard()
  const { register, control, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Operacional</p>

        <div className="space-y-1">
          <Label>Status da Unidade</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label} <span className="text-muted-foreground text-xs">— {o.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-[10px] text-muted-foreground">Padrão para novas unidades: Em Implantação</p>
        </div>

        <div className="space-y-1">
          <Label>Limite de Colaboradores <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input type="number" min={1} {...register('limite_colaboradores')} placeholder="Sem limite" />
          {errors.limite_colaboradores && <p className="text-xs text-red-400">{errors.limite_colaboradores.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Observações Internas <span className="text-muted-foreground font-normal text-xs">(visível apenas para a matriz)</span></Label>
          <Textarea {...register('observacoes_internas')} rows={4} placeholder="Notas internas, histórico de negociação, pendências..." />
        </div>
      </div>
    </div>
  )
}
