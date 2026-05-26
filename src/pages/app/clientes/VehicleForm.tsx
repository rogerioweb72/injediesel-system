import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlateLookup } from './PlateLookup'
import { useCreateVehicle } from '@/hooks/useVehicles'
import type { VehicleInfo } from '@/hooks/useBrasilAPI'

const schema = z.object({
  plate: z.string().nullable(),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  year: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v),
    z.number().int().min(1900).max(2100).nullable(),
  ),
  vehicle_type: z.enum(['automotivo', 'maquina_agricola', 'maquina_pesada', 'nautica']),
  engine: z.string().nullable(),
  notes: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  automotivo: 'Automotivo',
  maquina_agricola: 'Máquina Agrícola',
  maquina_pesada: 'Máquina Pesada',
  nautica: 'Náutica',
}

interface VehicleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

export function VehicleForm({ open, onOpenChange, customerId }: VehicleFormProps) {
  const createVehicle = useCreateVehicle()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: {
        plate: null, brand: '', model: '', year: null,
        vehicle_type: 'automotivo', engine: null, notes: null,
      },
    })

  // eslint-disable-next-line react-hooks/incompatible-library
  const plate = watch('plate')
  const vehicleType = watch('vehicle_type')

  function handlePlateLookupFound(info: VehicleInfo) {
    setValue('brand', info.marca)
    setValue('model', info.modelo)
    if (info.anoModelo) setValue('year', info.anoModelo)
    if (info.motor) setValue('engine', info.motor)
  }

  async function onSubmit(values: FormValues) {
    await createVehicle.mutateAsync({
      customer_id: customerId,
      plate: values.plate ?? null,
      brand: values.brand,
      model: values.model,
      year: values.year ?? null,
      vehicle_type: values.vehicle_type,
      engine: values.engine ?? null,
      notes: values.notes ?? null,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adicionar Veículo</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label>Tipo de Veículo</Label>
            <Select
              value={vehicleType}
              onValueChange={(v) => setValue('vehicle_type', v as FormValues['vehicle_type'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vehicleType === 'automotivo' && (
            <div className="space-y-1">
              <Label>Placa (busca automática)</Label>
              <PlateLookup
                value={plate ?? ''}
                onChange={(v) => setValue('plate', v)}
                onFound={handlePlateLookupFound}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Marca *</Label>
              <Input {...register('brand')} />
              {errors.brand && <p className="text-xs text-red-400">{errors.brand.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Modelo *</Label>
              <Input {...register('model')} />
              {errors.model && <p className="text-xs text-red-400">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input type="number" {...register('year')} />
            </div>
            <div className="space-y-1">
              <Label>Motor</Label>
              <Input {...register('engine')} placeholder="2.0 TSI" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} style={{ background: 'var(--pm-accent-gradient)' }}>
              {isSubmitting ? 'Salvando...' : 'Adicionar Veículo'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
