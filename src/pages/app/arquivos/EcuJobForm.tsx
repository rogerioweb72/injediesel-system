import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, FileText, Search, Loader2, Plus, Lock } from 'lucide-react'
import { ContractBlockedModal } from '@/components/shared/ContractBlockedModal'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCustomers, useCreateCustomer, type Customer, type CustomerAddress } from '@/hooks/useCustomers'
import { useVehicles } from '@/hooks/useVehicles'
import { useCreateEcuJob } from '@/hooks/useEcuJobs'
import { useUploadEcuFile } from '@/hooks/useEcuFiles'
import { useUsers } from '@/hooks/useUsers'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useProfile } from '@/hooks/useProfile'
import { useBrasilAPI } from '@/hooks/useBrasilAPI'
import { useEcuCategories } from '@/hooks/useEcuCategories'
import { useEcuCatalogList } from '@/hooks/useEcuCatalog'
import { cn } from '@/lib/utils'

const SERVICE_TYPES = [
  'Remapeamento Estágio 1',
  'Remapeamento Estágio 2',
  'Remapeamento Estágio 3',
  'Remoção DPF/FAP',
  'Remoção EGR',
  'Remoção AdBlue',
  'Ajuste de Injeção',
  'Correção de Marcha Lenta',
  'Outro',
]

const SERVICE_TAGS = ['Performance', 'Emissões', 'Diagnóstico', 'Codificação', 'Transmissão', 'Especial'] as const
const VEHICLE_CATEGORIES = ['Carro/SUV', 'Pickup', 'Truck', 'Agrícola', 'Máquina Pesada', 'Moto', 'Náutica']
// Categorias bloqueadas para contrato linha_leve
const LEVE_BLOCKED = new Set(['Truck', 'Agrícola', 'Máquina Pesada'])
const VEHICLE_TRANSMISSIONS = ['Manual', 'Automático', 'CVT', 'DCT', 'AMT']
const PLATE_CATEGORIES = new Set(['Carro/SUV', 'Pickup', 'Truck', 'Moto'])
const PLATE_REGEX = /^[A-Z]{3}-?(?:\d{4}|\d[A-Z]\d{2})$/i
const ACCEPTED_EXTENSIONS = '.bin,.hex,.ori,.kfg,.bck,.eprom,.zip,.rar'
const MAX_BYTES = 256 * 1024 * 1024

const schema = z.object({
  customer_id:              z.string().min(1, 'Selecione um cliente'),
  vehicle_id:               z.string().nullable(),
  service_type:             z.string().min(1, 'Selecione o tipo de serviço'),
  service_type_custom:      z.string().optional(),
  service_tags:             z.array(z.string()).default([]),
  problem_description:      z.string().nullable(),
  lgpd_accepted:            z.boolean().refine(v => v === true, 'Confirme o aceite presencial do cliente antes de enviar'),
  seller_id:                z.string().optional().transform(v => v === '' ? null : v),
  amount_charged_to_customer: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number({ message: 'Informe o valor' }).min(0.01, 'Valor deve ser maior que zero')
  ),
  vehicle_categoria:  z.string().min(1, 'Categoria obrigatória'),
  vehicle_placa:      z.string().optional(),
  vehicle_marca:      z.string().optional(),
  vehicle_modelo:     z.string().optional(),
  vehicle_motor:      z.string().optional(),
  vehicle_transmissao: z.string().optional(),
  vehicle_ano:        z.string().optional(),
  vehicle_horas_km:   z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.vehicle_categoria && PLATE_CATEGORIES.has(data.vehicle_categoria)) {
    if (!data.vehicle_placa?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['vehicle_placa'], message: 'Placa obrigatória para esta categoria' })
    } else if (!PLATE_REGEX.test(data.vehicle_placa.trim())) {
      ctx.addIssue({ code: 'custom', path: ['vehicle_placa'], message: 'Formato inválido. Use AAA-0000 ou AAA-0A00' })
    }
  }
  if (data.vehicle_categoria && !data.vehicle_modelo?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['vehicle_modelo'], message: 'Informe o modelo ou nome do veículo' })
  }
  if (data.service_type === 'Outro' && !data.service_type_custom?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['service_type_custom'], message: 'Informe o título do serviço personalizado' })
  }
})

type FormValues = z.infer<typeof schema>

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateEcuFile(f: File): string | null {
  if (f.size > MAX_BYTES) return `Arquivo muito grande (máx 256 MB): ${formatBytes(f.size)}`
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['bin', 'hex', 'ori', 'kfg', 'bck', 'eprom', 'zip', 'rar'].includes(ext)) return `Formato não permitido: .${ext}`
  return null
}

// ── Inline "Novo Cliente" modal ───────────────────────────────────────────────
function NovoClienteModal({ open, onClose, onCreated, unitId }: {
  open: boolean
  onClose: () => void
  onCreated: (c: Customer) => void
  unitId: string | null
}) {
  const [name,       setName]       = useState('')
  const [phone,      setPhone]      = useState('')
  const [email,      setEmail]      = useState('')
  const [doc,        setDoc]        = useState('')
  const [cidade,     setCidade]     = useState('')
  const [estado,     setEstado]     = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero,     setNumero]     = useState('')

  const [nameErr,  setNameErr]  = useState(false)
  const [phoneErr, setPhoneErr] = useState(false)
  const [docErr,   setDocErr]   = useState(false)

  const create = useCreateCustomer()

  function resetForm() {
    setName(''); setPhone(''); setEmail(''); setDoc('')
    setCidade(''); setEstado(''); setLogradouro(''); setNumero('')
    setNameErr(false); setPhoneErr(false); setDocErr(false)
  }

  async function handleSave() {
    const nErr = !name.trim()
    const pErr = !phone.trim()
    const dErr = !doc.trim()
    setNameErr(nErr); setPhoneErr(pErr); setDocErr(dErr)
    if (nErr || pErr || dErr) return

    const address: CustomerAddress | null =
      cidade || estado || logradouro || numero
        ? { cidade: cidade || undefined, estado: estado || undefined, logradouro: logradouro || undefined, numero: numero || undefined }
        : null

    try {
      const c = await create.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: email || null,
        document: doc.trim(),
        address,
        active: true,
        price_tier: 'cliente_final',
        unit_id: unitId,
      })
      toast.success('Cliente criado com sucesso')
      resetForm()
      onCreated(c)
    } catch {
      toast.error('Erro ao criar cliente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input
              placeholder="Nome completo ou razão social"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(false) }}
              className={cn(nameErr && 'field-error-blink border-red-500')}
            />
            {nameErr && <p className="text-xs text-red-400">Nome obrigatório</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Celular *</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneErr(false) }}
                className={cn(phoneErr && 'field-error-blink border-red-500')}
              />
              {phoneErr && <p className="text-xs text-red-400">Celular obrigatório</p>}
            </div>
            <div className="space-y-1">
              <Label>CPF / CNPJ *</Label>
              <Input
                placeholder="000.000.000-00"
                value={doc}
                onChange={e => { setDoc(e.target.value); setDocErr(false) }}
                className={cn(docErr && 'field-error-blink border-red-500')}
              />
              {docErr && <p className="text-xs text-red-400">CPF obrigatório</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-3">Endereço (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Logradouro</Label>
                <Input placeholder="Rua / Av. / Travessa" value={logradouro} onChange={e => setLogradouro(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input placeholder="123" value={numero} onChange={e => setNumero(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input placeholder="São Paulo" value={cidade} onChange={e => setCidade(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input placeholder="SP" maxLength={2} value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-2">
            <Button variant="ghost" onClick={() => { resetForm(); onClose() }}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={create.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {create.isPending ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Placa input com auto-formatação ──────────────────────────────────────────
function formatPlaca(raw: string): string {
  // Mantém só alfanuméricos, uppercase, máx 7 chars sem traço
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7)
  let result = ''
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (i < 3) {
      if (/[A-Z]/.test(ch)) result += ch        // posições 0-2: só letras
    } else if (i === 3) {
      if (/\d/.test(ch)) result += ch            // posição 3: só dígito
    } else if (i === 4) {
      if (/[A-Z0-9]/.test(ch)) result += ch     // posição 4: letra (Mercosul) ou dígito (antigo)
    } else {
      if (/\d/.test(ch)) result += ch            // posições 5-6: só dígitos
    }
  }
  return result.length > 3 ? result.slice(0, 3) + '-' + result.slice(3) : result
}

interface PlacaInputProps {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  hasError?: boolean
}

function PlacaInput({ value, onChange, onBlur, hasError }: PlacaInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPlaca(e.target.value)
    onChange(formatted)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Ao apagar sobre o traço, remove o dígito antes dele
    if (e.key === 'Backspace') {
      const input = e.currentTarget
      const pos = input.selectionStart ?? value.length
      if (pos === 4 && value[3] === '-') {
        e.preventDefault()
        onChange(value.slice(0, 3))
      }
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      placeholder="ABC-1234"
      maxLength={8}
      spellCheck={false}
      style={{ letterSpacing: '0.22em', fontFamily: 'JetBrains Mono, monospace' }}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'uppercase tracking-wider',
        hasError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue-400',
      )}
    />
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function EcuJobForm() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { profile } = useProfile()
  const [ecuFiles, setEcuFiles] = useState<{ originalA: File | null; originalB: File | null }>({ originalA: null, originalB: null })
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newClientOpen, setNewClientOpen]   = useState(false)
  const [flashKey, setFlashKey]             = useState(0)
  const [lookupLoading, setLookupLoading]   = useState(false)
  const [costValue, setCostValue]           = useState<string>('')

  const createJob   = useCreateEcuJob()
  const uploadFile  = useUploadEcuFile()
  const { data: myUnit }        = useMyUnit()
  const isLinhaLeve  = myUnit?.franchise_units?.contract_type === 'linha_leve'
  const isBlocked    = myUnit?.franchise_units?.contract_blocked === true
  const blockedReason = myUnit?.franchise_units?.contract_blocked_reason ?? null
  const [blockedModalOpen, setBlockedModalOpen] = useState(false)
  const { data: usersData = [] } = useUsers()
  const isFranchise = !!myUnit?.unit_id
  const sellers = usersData.filter((u) =>
    u.active && (isFranchise ? u.role === 'unit_seller' : u.role === 'seller')
  )
  const { data: customersData } = useCustomers({ pageSize: 200 })
  const customers = customersData?.data ?? []

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: {
        customer_id: '', vehicle_id: null,
        service_type: '', service_type_custom: '', service_tags: [],
        problem_description: null,
        lgpd_accepted: false,
        seller_id: '',
        amount_charged_to_customer: undefined,
        vehicle_categoria: '', vehicle_placa: '',
        vehicle_marca: '', vehicle_modelo: '', vehicle_motor: '',
        vehicle_transmissao: '', vehicle_ano: '', vehicle_horas_km: '',
      },
    })

  const customerId         = watch('customer_id')
  const serviceType        = watch('service_type')
  const serviceTypeCustom  = watch('service_type_custom') ?? ''
  const serviceTags        = watch('service_tags')
  const vehicleCategoria = watch('vehicle_categoria')
  const vehicleMarca    = watch('vehicle_marca') ?? ''
  const vehicleModelo   = watch('vehicle_modelo') ?? ''
  const needsPlate      = !!vehicleCategoria && PLATE_CATEGORIES.has(vehicleCategoria)
  const hasClient       = !!customerId

  const { data: vehicles = [] } = useVehicles(customerId)
  const { lookupPlate }         = useBrasilAPI()
  const { data: categorias = [] } = useEcuCategories()

  // ECU catalog cost suggestion
  const categoriaSlug = useMemo(
    () => categorias.find(c => c.label === vehicleCategoria)?.slug ?? '',
    [categorias, vehicleCategoria],
  )

  const { data: ecuData } = useEcuCatalogList({
    categoriaSlug: categoriaSlug || 'all',
    pageSize: 5000,
  })

  const suggestedCost = useMemo(() => {
    const rows = ecuData?.data ?? []
    if (!rows.length || !categoriaSlug) return null

    let matches = rows
    if (vehicleMarca) {
      const byMarca = rows.filter(r => r.marca?.toLowerCase() === vehicleMarca.toLowerCase())
      if (byMarca.length) {
        matches = byMarca
        if (vehicleModelo) {
          const byModelo = byMarca.filter(r =>
            r.secao_original?.toLowerCase().includes(vehicleModelo.toLowerCase()) ||
            r.modelo_descricao?.toLowerCase().includes(vehicleModelo.toLowerCase()),
          )
          if (byModelo.length) matches = byModelo
        }
      }
    }

    const prices = matches.filter(r => r.preco_franqueado != null).map(r => r.preco_franqueado!)
    if (!prices.length) return null
    return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
  }, [ecuData, categoriaSlug, vehicleMarca, vehicleModelo])

  // Sync suggested cost into editable field
  const prevCostRef = useMemo(() => ({ current: '' }), [])
  if (suggestedCost !== null) {
    const str = String(suggestedCost)
    if (prevCostRef.current !== str) {
      prevCostRef.current = str
      setCostValue(str)
      setValue('amount_charged_to_customer', suggestedCost as never)
    }
  }

  const handlePlacaLookup = useCallback(async () => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const placa = watch('vehicle_placa') ?? ''
    if (!PLATE_REGEX.test(placa.trim())) return
    setLookupLoading(true)
    try {
      const info = await lookupPlate(placa.trim())
      if (!info) { toast.error('Placa não encontrada'); return }
      if (info.marca)     setValue('vehicle_marca',  info.marca)
      if (info.modelo)    setValue('vehicle_modelo', info.modelo)
      if (info.motor)     setValue('vehicle_motor',  info.motor)
      if (info.anoModelo) setValue('vehicle_ano',    String(info.anoModelo))
      toast.success('Dados preenchidos automaticamente')
    } catch {
      toast.error('Erro ao consultar placa')
    } finally {
      setLookupLoading(false)
    }
  }, [lookupPlate, setValue, watch])

  async function onSubmit(values: FormValues) {
    console.log('submitting job', {
      values,
      customer_id: values.customer_id,
      hasClient,
      ecuFiles,
    })
    if (!ecuFiles.originalA) {
      toast.error('Selecione o arquivo original antes de enviar o formulário.')
      return
    }
    // Hard-block: unidade bloqueada pela Matriz
    if (isBlocked) {
      setBlockedModalOpen(true)
      return
    }
    // Hard-block: categoria restrita para contrato linha_leve
    if (isLinhaLeve && LEVE_BLOCKED.has(values.vehicle_categoria)) {
      toast.error('Categoria não disponível para o seu tipo de contrato. Entre em contato com a Matriz para upgrade.')
      return
    }
    setUploading(true)
    setUploadProgress(10)
    try {
      const finalServiceType = values.service_type === 'Outro' && values.service_type_custom?.trim()
        ? `Outro — ${values.service_type_custom.trim()}`
        : values.service_type

      const job = await createJob.mutateAsync({
        customer_id: values.customer_id,
        vehicle_id:  values.vehicle_id || null,
        unit_id:     myUnit?.unit_id ?? null,
        service_type: finalServiceType,
        service_tags: values.service_tags,
        priority: 'normal',
        problem_description: values.problem_description || null,
        due_at: null,
        created_by: profile?.id ?? null,
        amount_charged_to_customer: values.amount_charged_to_customer ?? null,
        seller_id: values.seller_id || null,
        vehicle_info: {
          categoria: values.vehicle_categoria || undefined,
          placa:     values.vehicle_placa     || undefined,
          marca:     values.vehicle_marca     || undefined,
          modelo:    values.vehicle_modelo    || undefined,
          motor:     values.vehicle_motor     || undefined,
          transmissao: values.vehicle_transmissao || undefined,
          ano:       values.vehicle_ano       || undefined,
          horas_km:  values.vehicle_horas_km  || undefined,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      setUploadProgress(40)
      if (ecuFiles.originalA) await uploadFile.mutateAsync({ jobId: job.id, file: ecuFiles.originalA, fileType: 'original' })
      setUploadProgress(75)
      if (ecuFiles.originalB) await uploadFile.mutateAsync({ jobId: job.id, file: ecuFiles.originalB, fileType: 'original' })
      setUploadProgress(100)
      toast.success('Arquivo enviado com sucesso!')
      await new Promise(r => setTimeout(r, 600))
      navigate(`${prefix}/arquivos/${job.id}`)
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? String(err)
      toast.error(`Erro ao enviar arquivo: ${msg}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleInvalidSubmit(errors: any) {
    console.log('invalid submit', {
      errors,
      customer_id: watch('customer_id'),
      hasClient,
      ecuFiles,
    })
    toast.error('Corrija os campos obrigatórios antes de enviar.')
    setFlashKey((k) => k + 1)
  }

  const isLoading = isSubmitting || uploading

  // Helper: wrap a field to apply flash animation on error
  function fieldErr(name: keyof FormValues) {
    return !!errors[name]
  }

  function flashClass(name: keyof FormValues) {
    return fieldErr(name) ? 'field-error-blink border-red-500' : ''
  }

  return (
    <div>
      <PageHeader
        title="Novo Arquivo"
        subtitle="Novo registro para processamento"
        actions={
          <Button variant="ghost" onClick={() => navigate(`${prefix}/arquivos`)}>
            <ArrowLeft size={16} className="mr-2" />Voltar
          </Button>
        }
      />

      <ContractBlockedModal
        open={blockedModalOpen}
        onClose={() => setBlockedModalOpen(false)}
        reason={blockedReason}
      />

      <NovoClienteModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        unitId={myUnit?.unit_id ?? null}
        onCreated={(c) => {
          setValue('customer_id', c.id)
          setNewClientOpen(false)
        }}
      />

      <form
        onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
        className="pm-card max-w-3xl mx-auto space-y-5"
      >

        {/* ── Cliente ── */}
        <div className="space-y-1">
          <Label>Cliente <span className="text-red-400">*</span></Label>
          <div className="flex items-center gap-3">
            <div key={`cid-${flashKey}`} className={cn('flex-1 min-w-0', flashClass('customer_id'))}>
              <Select
                value={customerId}
                onValueChange={(v) => { setValue('customer_id', v); setValue('vehicle_id', null) }}
              >
                <SelectTrigger className={cn(fieldErr('customer_id') && 'border-red-500')}>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setNewClientOpen(true)}
              className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2 rounded-lg transition-all whitespace-nowrap"
            >
              <Plus size={11} /> Novo Cliente
            </button>
          </div>
          {errors.customer_id && <p className="text-xs text-red-400">{errors.customer_id.message}</p>}
        </div>

        {/* ── Restante do form — bloqueado sem cliente ── */}
        <fieldset disabled={!hasClient} className={cn('space-y-5', !hasClient && 'opacity-40 pointer-events-none select-none')}>

          {/* ── Vendedor responsável ── */}
          {(
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--pm-gray-300))' }}>
                Vendedor responsável
              </label>
              <select
                {...register('seller_id')}
                style={{
                  background: 'hsl(var(--pm-gray-800))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="">Empresa (sem vendedor)</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.seller_id && (
                <span className="text-xs text-red-400">{errors.seller_id.message as string}</span>
              )}
            </div>
          )}

          {/* Veículo vinculado */}
          {customerId && vehicles.length > 0 && (
            <div className="space-y-1">
              <Label>Veículo cadastrado</Label>
              <Select
                value={watch('vehicle_id') ?? '_none'}
                onValueChange={(v) => {
                  const id = v === '_none' ? null : v
                  setValue('vehicle_id', id)
                  if (id) {
                    const veh = vehicles.find(x => x.id === id)
                    if (veh) {
                      if (veh.plate)   setValue('vehicle_placa',  veh.plate)
                      if (veh.brand)   setValue('vehicle_marca',  veh.brand)
                      if (veh.model)   setValue('vehicle_modelo', veh.model)
                      if (veh.engine)  setValue('vehicle_motor',  veh.engine)
                      if (veh.year)    setValue('vehicle_ano',    String(veh.year))
                      const categoriaMap: Record<string, string> = {
                        maquina_agricola: 'Agrícola',
                        maquina_pesada:   'Máquina Pesada',
                        nautica:          'Náutica',
                      }
                      const cat = categoriaMap[veh.vehicle_type]
                      if (cat) setValue('vehicle_categoria', cat)
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem veículo associado</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.brand} {v.model} {v.plate ? `— ${v.plate}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Dados do Veículo ── */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              Dados do Veículo
            </Label>
            <div className="grid grid-cols-2 gap-3">

              {/* Categoria */}
              <div className="space-y-1">
                <Label className="text-xs">Categoria <span className="text-red-400">*</span></Label>
                <div key={`cat-${flashKey}`}>
                  <Select
                    value={vehicleCategoria ?? ''}
                    onValueChange={(v) => {
                      setValue('vehicle_categoria', v)
                      if (!PLATE_CATEGORIES.has(v)) setValue('vehicle_placa', '')
                    }}
                  >
                    <SelectTrigger className={cn(fieldErr('vehicle_categoria') && 'border-red-500')}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_CATEGORIES.map((c) => {
                        const blocked = isLinhaLeve && LEVE_BLOCKED.has(c)
                        return (
                          <SelectItem key={c} value={c} disabled={blocked}>
                            <span className="flex items-center gap-1.5">
                              {blocked && <Lock size={10} className="text-muted-foreground shrink-0" />}
                              {c}
                              {blocked && <span className="text-[10px] text-muted-foreground ml-1">— indisponível</span>}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {errors.vehicle_categoria && <p className="text-xs text-red-400">{errors.vehicle_categoria.message}</p>}
                {isLinhaLeve && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Lock size={9} /> Truck, Agrícola e Máquina Pesada bloqueados — contrato Linha Leve
                  </p>
                )}
                {isLinhaLeve && vehicleCategoria && LEVE_BLOCKED.has(vehicleCategoria) && (
                  <p className="text-xs text-red-400 font-medium mt-1">
                    Categoria não disponível para o seu tipo de contrato atual. Entre em contato com a Matriz para upgrade.
                  </p>
                )}
              </div>

              {/* Placa (condicional) ou Marca */}
              {needsPlate ? (
                <div className="space-y-1">
                  <Label className="text-xs">Placa <span className="text-red-400">*</span></Label>
                  <div className="flex gap-2">
                    <PlacaInput
                      value={watch('vehicle_placa') ?? ''}
                      onChange={(v) => setValue('vehicle_placa', v)}
                      onBlur={handlePlacaLookup}
                      hasError={fieldErr('vehicle_placa')}
                    />
                    <Button
                      type="button" variant="outline" size="icon"
                      className="shrink-0 border-white/10 hover:border-white/25"
                      disabled={lookupLoading}
                      onClick={handlePlacaLookup}
                    >
                      {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </Button>
                  </div>
                  {(errors as Record<string, { message?: string }>).vehicle_placa && (
                    <p className="text-xs text-red-400">{(errors as Record<string, { message?: string }>).vehicle_placa?.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input placeholder="Ex: Volkswagen" {...register('vehicle_marca')} />
                </div>
              )}

              {/* Marca (quando needsPlate = moves here) + Motor */}
              {needsPlate && (
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input placeholder="Ex: Volkswagen" {...register('vehicle_marca')} />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Motor</Label>
                <Input placeholder="Ex: 2.0 TSI 220cv" {...register('vehicle_motor')} />
              </div>

              {/* Modelo + Transmissão */}
              <div className="space-y-1">
                <Label className="text-xs">
                  Modelo <span className="text-red-400">*</span>
                </Label>
                <Input
                  key={`mod-${flashKey}`}
                  placeholder="Ex: Vectra, Tiguan, Agrale..."
                  {...register('vehicle_modelo')}
                  className={cn(fieldErr('vehicle_modelo') && 'border-red-500 field-error-blink')}
                />
                {(errors as Record<string, { message?: string }>).vehicle_modelo && (
                  <p className="text-xs text-red-400">
                    {(errors as Record<string, { message?: string }>).vehicle_modelo?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transmissão</Label>
                <Select
                  value={watch('vehicle_transmissao') ?? ''}
                  onValueChange={(v) => setValue('vehicle_transmissao', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TRANSMISSIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano + Horas/Km */}
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Input placeholder="Ex: 2022/2023" {...register('vehicle_ano')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas / Km</Label>
                <Input placeholder="Ex: 45.000 km ou 1.200h" {...register('vehicle_horas_km')} />
              </div>
            </div>
          </div>

          {/* ── Serviço ── */}
          <div className="space-y-1">
            <Label>Tipo de Serviço <span className="text-red-400">*</span></Label>
            <div key={`svc-${flashKey}`}>
              <Select value={serviceType} onValueChange={(v) => {
                setValue('service_type', v)
                if (v !== 'Outro') setValue('service_type_custom', '')
              }}>
                <SelectTrigger className={cn(fieldErr('service_type') && 'border-red-500')}>
                  <SelectValue placeholder="Selecione o serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {errors.service_type && <p className="text-xs text-red-400">{errors.service_type.message}</p>}

            {serviceType === 'Outro' && (
              <div className="pt-1 space-y-1">
                <Input
                  key={`stc-${flashKey}`}
                  placeholder="Título curto do serviço (ex: Ajuste de limiter, Launch control...)"
                  value={serviceTypeCustom}
                  onChange={e => setValue('service_type_custom', e.target.value)}
                  className={cn(
                    (errors as Record<string, { message?: string }>).service_type_custom && 'border-red-500 field-error-blink'
                  )}
                  maxLength={80}
                />
                {(errors as Record<string, { message?: string }>).service_type_custom && (
                  <p className="text-xs text-red-400">
                    {(errors as Record<string, { message?: string }>).service_type_custom?.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags de Serviço</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TAGS.map((tag) => {
                const active = serviceTags.includes(tag)
                return (
                  <button
                    key={tag} type="button"
                    onClick={() => {
                      const cur = watch('service_tags')
                      setValue('service_tags', active ? cur.filter(t => t !== tag) : [...cur, tag])
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wide border transition-colors',
                      active
                        ? 'bg-[hsl(var(--pm-red-500))] border-[hsl(var(--pm-red-500))] text-white'
                        : 'bg-transparent border-[hsl(var(--pm-gray-700))] text-muted-foreground hover:border-[hsl(var(--pm-gray-500))]',
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição do Problema</Label>
            <Textarea {...register('problem_description')} rows={3} placeholder="Descreva o problema ou solicitação do cliente..." />
          </div>

          {/* ── Custo sugerido (do catálogo) + Valor cobrado ── */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            {categoriaSlug && (
              <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                <span className="uppercase tracking-widest">Custo referência catálogo</span>
                {suggestedCost !== null ? (
                  <span className="text-green-400 font-semibold">
                    R$ {suggestedCost.toFixed(2)}
                    {vehicleMarca && vehicleModelo ? ' (correspondência exata/próxima)' : ' (média da categoria)'}
                  </span>
                ) : (
                  <span className="text-gray-600">Nenhum registro encontrado para esta categoria</span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>
                Valor Cobrado do Cliente (R$) <span className="text-red-400">*</span>
              </Label>
              <Input
                key={`amt-${flashKey}`}
                type="number"
                step="0.01"
                min="0"
                placeholder={suggestedCost ? `Sugerido: R$ ${suggestedCost.toFixed(2)}` : 'Ex: 500,00'}
                value={costValue}
                onChange={e => {
                  setCostValue(e.target.value)
                  setValue('amount_charged_to_customer', e.target.value === '' ? (null as never) : Number(e.target.value) as never)
                }}
                className={cn(fieldErr('amount_charged_to_customer') && 'border-red-500 field-error-blink')}
              />
              {errors.amount_charged_to_customer && (
                <p className="text-xs text-red-400">
                  {errors.amount_charged_to_customer.message as string}
                </p>
              )}
            </div>
          </div>

          {/* ── Arquivos ECU ── */}
          <div className="space-y-2">
            <Label>Arquivos ECU</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['originalA', 'originalB'] as const).map((slot, idx) => {
                const f = ecuFiles[slot]
                const slotLabel = `Arquivo Original ${idx + 1}`
                return (
                  <div key={slot}>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">{slotLabel}</p>
                    {f ? (
                      <div className="flex items-center gap-2 p-3 rounded border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-900))]">
                        <FileText size={16} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{f.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setEcuFiles(p => ({ ...p, [slot]: null }))}>
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-20 rounded border-2 border-dashed border-[hsl(var(--pm-gray-700))] cursor-pointer hover:border-[hsl(var(--pm-red-500))] transition-colors">
                        <Upload size={18} className="text-muted-foreground mb-1" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Clique para enviar arquivo ECU
                        </span>
                        <input
                          type="file" className="hidden" accept={ACCEPTED_EXTENSIONS}
                          onChange={(e) => {
                            const picked = e.target.files?.[0]
                            if (!picked) return
                            const err = validateEcuFile(picked)
                            if (err) { toast.error(err); return }
                            setEcuFiles(p => ({ ...p, [slot]: picked }))
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos: .bin .hex .ori .kfg .bck .eprom .zip .rar · Máx 256 MB · Pode adicionar depois no detalhe do arquivo.
            </p>
          </div>

          {uploadProgress > 0 && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 w-full rounded-full bg-[hsl(var(--pm-gray-800))] overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-right">{uploadProgress}%</p>
            </div>
          )}

          {/* ── LGPD ── */}
          <div className={cn(
            'rounded-xl border p-4 space-y-3 transition-colors',
            (errors as Record<string, { message?: string }>).lgpd_accepted
              ? 'border-red-500/60 bg-red-500/[0.04]'
              : 'border-amber-500/20 bg-amber-500/[0.03]',
          )}>
            <p className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
              Consentimento LGPD <span className="text-red-400">*</span>
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cliente foi informado e concorda presencialmente com os termos de uso e de dados da Promax Tuner.
            </p>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                key={`lgpd-${flashKey}`}
                {...register('lgpd_accepted')}
                className="h-4 w-4 rounded accent-green-500 cursor-pointer shrink-0"
              />
              <span className="text-sm text-foreground font-medium group-hover:text-white transition-colors">
                Confirmo o aceite presencial do cliente
              </span>
            </label>
            {(errors as Record<string, { message?: string }>).lgpd_accepted && (
              <p className="text-xs text-red-400">
                {(errors as Record<string, { message?: string }>).lgpd_accepted?.message}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`${prefix}/arquivos`)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-500 text-white border-0"
            >
              {isLoading ? 'Enviando...' : 'Enviar Arquivo'}
            </Button>
          </div>

        </fieldset>
      </form>
    </div>
  )
}
