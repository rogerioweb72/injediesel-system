import { useRef, useEffect } from 'react'
import { Controller } from 'react-hook-form'
import { Camera, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWizard } from '../WizardContext'

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 ano' },
  { value: '2', label: '2 anos' },
  { value: '3', label: '3 anos' },
  { value: '5', label: '5 anos' },
  { value: 'custom', label: 'Personalizado' },
]

export function Step1ContractType() {
  const { form, logoFile, logoPreviewUrl, setLogoFile } = useWizard()
  const { register, control, watch, setValue, formState: { errors } } = form
  const fileRef = useRef<HTMLInputElement>(null)

  const name = watch('name')
  const contractStart = watch('contract_start_date')
  const duration = watch('contract_duration')

  useEffect(() => {
    if (!contractStart || duration === 'custom') return
    const years = parseInt(duration)
    if (!isNaN(years)) {
      setValue('contract_end_date', addYears(contractStart, years))
    }
  }, [contractStart, duration, setValue])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2MB.')
      return
    }
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) {
      alert('Formato inválido. Use JPG, PNG ou WEBP.')
      return
    }
    setLogoFile(f)
  }

  const initials = name?.slice(0, 2).toUpperCase() ?? 'UN'
  const endDate = watch('contract_end_date')
  const startDate = watch('contract_start_date')
  const vigenciaOk = startDate && endDate
    ? new Date(endDate) >= new Date(addYears(startDate, 1))
    : true

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Identidade Visual</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 hover:border-[hsl(var(--pm-red-500))]/50 transition-colors flex items-center justify-center bg-white/5 group"
          >
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                {initials}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </button>
          <div className="space-y-1">
            <p className="text-sm font-medium">Logo da Unidade</p>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · máx. 2MB · opcional</p>
            {logoFile && (
              <button type="button" onClick={() => setLogoFile(null)} className="text-xs text-red-400 hover:text-red-300">
                Remover
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo & Contrato</p>

        <div className="space-y-1">
          <Label>Tipo de Contrato *</Label>
          <Controller
            control={control}
            name="contract_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full — acesso completo</SelectItem>
                  <SelectItem value="linha_leve">Linha Leve — catálogo restrito</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Data de Início *</Label>
          <Input type="date" {...register('contract_start_date')} />
          {errors.contract_start_date && <p className="text-xs text-red-400">{errors.contract_start_date.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Duração do Contrato</Label>
          <Controller
            control={control}
            name="contract_duration"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Data de Término *</Label>
          <Input
            type="date"
            {...register('contract_end_date')}
            readOnly={duration !== 'custom'}
            className={duration !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}
          />
          {errors.contract_end_date && <p className="text-xs text-red-400">{errors.contract_end_date.message}</p>}
          {!vigenciaOk && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={12} />
              <p className="text-xs">Vigência mínima obrigatória: 12 meses</p>
            </div>
          )}
          {vigenciaOk && startDate && endDate && (
            <p className="text-[10px] text-muted-foreground">Vigência mínima obrigatória: 12 meses</p>
          )}
        </div>
      </div>
    </div>
  )
}
