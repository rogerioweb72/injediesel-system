import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, FileSignature, Loader2, Building2, User } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { translateError } from '@/lib/errors'
import { maskCPF, maskCNPJ, maskCEP, maskPhone, validarCPF, validarCNPJ } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers } from '@/hooks/useUsers'
import { useCreateFranchiseContract } from '@/hooks/useFranchiseUnits'
import { useFranchiseProducts } from '@/hooks/useFranchiseProducts'
import { useUploadUnitDocument } from '@/hooks/useUnitDocuments'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import { useCepLookup } from '@/hooks/useCepLookup'
import { generateContractPdfBlob } from '@/lib/contractPdf'

// RG (formatos variam por estado): dígitos + X/dígito final, 5–14 chars após remover . e -
function validarRG(v?: string) {
  if (!v) return true
  const s = v.replace(/[.\-\s]/g, '')
  return /^[0-9]{4,13}[0-9xX]$/.test(s) || /^[0-9]{5,14}$/.test(s)
}

const schema = z.object({
  // Identidade da unidade
  document_type:      z.enum(['cnpj', 'cpf']),
  cnpj:               z.string().optional(),
  cpf_unidade:        z.string().optional(),
  razao_social:       z.string().optional(),
  name:               z.string().min(2, 'Nome fantasia obrigatório'),
  // Comercial
  contract_type:      z.enum(['full', 'linha_leve']),
  franchise_fee:      z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().positive('Valor obrigatório')),
  payment_plan:       z.enum(['a_vista', '3x', '6x', '12x']),
  sale_payment_method:z.enum(['boleto', 'pix', 'cartao', 'transferencia']),
  sale_seller_id:     z.string().min(1, 'Selecione o vendedor'),
  // Geográfico
  cep:                z.string().optional(),
  city:               z.string().min(2, 'Cidade obrigatória'),
  state:              z.string().min(2, 'UF obrigatória'),
  raio_atendimento_km:z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().positive().nullable()),
  cidades_atendidas_txt: z.string().optional(),
  logradouro:         z.string().optional(),
  numero:             z.string().optional(),
  bairro:             z.string().optional(),
  // Legal
  responsavel_legal_nome:     z.string().min(2, 'Nome do responsável obrigatório'),
  responsavel_legal_cpf:      z.string().refine(validarCPF, 'CPF inválido'),
  responsavel_legal_rg:       z.string().optional().refine(validarRG, 'RG inválido'),
  responsavel_legal_email:    z.string().email('E-mail inválido'),
  responsavel_legal_telefone: z.string().min(10, 'Telefone obrigatório'),
  responsavel_legal_cargo:    z.string().optional(),
  // Contrato
  aceite: z.literal(true, { message: 'É necessário aceitar os termos' }),
}).superRefine((val, ctx) => {
  if (val.document_type === 'cnpj') {
    if (!validarCNPJ(val.cnpj ?? '')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cnpj'], message: 'CNPJ inválido' })
  } else {
    if (!validarCPF(val.cpf_unidade ?? '')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cpf_unidade'], message: 'CPF inválido' })
  }
})

type FormData = z.infer<typeof schema>

const PLAN_LABEL: Record<string, string> = { a_vista: 'À vista', '3x': '3x', '6x': '6x', '12x': '12x' }
const METHOD_LABEL: Record<string, string> = { boleto: 'Boleto', pix: 'PIX', cartao: 'Cartão', transferencia: 'Transferência' }

export default function NovoContratoPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const create = useCreateFranchiseContract()
  const upload = useUploadUnitDocument()
  const { data: settings } = useCompanySettings()
  const cnpjLookup = useCnpjLookup()
  const cepLookup = useCepLookup()

  const { data: users = [] } = useUsers()
  const sellers = users.filter((u) => u.role === 'seller' && u.active)
  const { data: fProducts = [] } = useFranchiseProducts()

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      document_type: 'cnpj', cnpj: '', cpf_unidade: '', razao_social: '',
      contract_type: 'full', payment_plan: 'a_vista', sale_payment_method: 'pix',
      name: '', franchise_fee: undefined, sale_seller_id: '',
      cep: '', city: '', state: '', raio_atendimento_km: null, cidades_atendidas_txt: '',
      logradouro: '', numero: '', bairro: '',
      responsavel_legal_nome: '', responsavel_legal_cpf: '', responsavel_legal_rg: '',
      responsavel_legal_email: '', responsavel_legal_telefone: '', responsavel_legal_cargo: '',
      aceite: false,
    } as unknown as FormData,
  })

  const docType = watch('document_type')
  const contractType = watch('contract_type')

  // Valor base a partir do produto de franquia do tipo selecionado.
  useEffect(() => {
    const prod = fProducts.find((p) => p.contract_type === contractType)
    if (prod && prod.default_fee > 0) setValue('franchise_fee', prod.default_fee as unknown as number, { shouldValidate: false })
  }, [contractType, fProducts, setValue])

  // Autofill por CNPJ (razão social + endereço).
  useEffect(() => {
    const d = cnpjLookup.data
    if (!d) return
    if (d.razao_social) setValue('razao_social', d.razao_social)
    if (d.logradouro) setValue('logradouro', d.logradouro)
    if (d.numero) setValue('numero', d.numero)
    if (d.bairro) setValue('bairro', d.bairro)
    if (d.municipio) setValue('city', d.municipio)
    if (d.uf) setValue('state', d.uf)
    if (d.cep) setValue('cep', maskCEP(d.cep))
  }, [cnpjLookup.data, setValue])

  // Autofill por CEP (endereço).
  useEffect(() => {
    const d = cepLookup.data
    if (!d) return
    if (d.logradouro) setValue('logradouro', d.logradouro)
    if (d.bairro) setValue('bairro', d.bairro)
    if (d.localidade) setValue('city', d.localidade)
    if (d.uf) setValue('state', d.uf)
  }, [cepLookup.data, setValue])

  async function onSubmit(data: FormData) {
    try {
      const cidades = (data.cidades_atendidas_txt ?? '').split(',').map((c) => c.trim()).filter(Boolean)
      const isPJ = data.document_type === 'cnpj'
      const unit = await create.mutateAsync({
        name: data.name,
        document_type: data.document_type,
        cnpj: isPJ ? (data.cnpj || null) : null,
        cpf: !isPJ ? (data.cpf_unidade || null) : null,
        razao_social: isPJ ? (data.razao_social || null) : null,
        contract_type: data.contract_type,
        franchise_fee: data.franchise_fee,
        payment_plan: data.payment_plan,
        sale_payment_method: data.sale_payment_method,
        sale_seller_id: data.sale_seller_id,
        cep: data.cep || null,
        city: data.city,
        state: data.state,
        raio_atendimento_km: data.raio_atendimento_km ?? null,
        cidades_atendidas: cidades.length ? cidades : null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        bairro: data.bairro || null,
        responsavel_legal_nome: data.responsavel_legal_nome,
        responsavel_legal_cpf: data.responsavel_legal_cpf,
        responsavel_legal_rg: data.responsavel_legal_rg || null,
        responsavel_legal_email: data.responsavel_legal_email,
        responsavel_legal_telefone: data.responsavel_legal_telefone,
        responsavel_legal_cargo: data.responsavel_legal_cargo || null,
      })
      // Gera + anexa o PDF do contrato (não bloqueia a criação se falhar).
      try {
        const addr = settings?.address
        const blob = await generateContractPdfBlob({
          matriz_endereco: [addr?.street, addr?.city, addr?.state].filter(Boolean).join(', ') || '—',
          matriz_cidade: addr?.city || '—',
          unidade_nome: data.name,
          razao_social: isPJ ? (data.razao_social || null) : null,
          representante_doc: isPJ ? (data.cnpj ? `CNPJ ${data.cnpj}` : null) : (data.cpf_unidade ? `CPF ${data.cpf_unidade}` : null),
          cidade: data.city, uf: data.state,
          raio: data.raio_atendimento_km ? String(data.raio_atendimento_km) : null,
          municipios: cidades.length ? cidades.join(', ') : null,
          responsavel_nome: data.responsavel_legal_nome,
          responsavel_cpf: data.responsavel_legal_cpf,
          responsavel_rg: data.responsavel_legal_rg || null,
          responsavel_email: data.responsavel_legal_email,
          responsavel_telefone: data.responsavel_legal_telefone,
          valor_adesao: Number(data.franchise_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          forma_pagamento: METHOD_LABEL[data.sale_payment_method],
          plano_pagamento: PLAN_LABEL[data.payment_plan],
          data_contrato: new Date().toLocaleDateString('pt-BR'),
        })
        await upload.mutateAsync({ unitId: unit.id, file: blob, name: `contrato-${data.name}.pdf`, kind: 'contract_generated' })
      } catch (pdfErr) {
        console.error('Falha ao gerar/anexar o PDF do contrato:', pdfErr)
      }
      toast.success('Contrato criado (rascunho). Aguardando aprovação/ativação.')
      navigate(`${prefix}/franqueados`)
    } catch (e) {
      toast.error(translateError(e))
    }
  }

  const err = (m?: string) => m && <p className="text-xs text-red-400 mt-1">{m}</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-amber-400" />
        <h1 className="text-xl font-bold text-white">Novo Contrato de Franquia</h1>
      </div>
      <PageHeader title="" subtitle="Venda de franquia — o vendedor da matriz fecha o contrato; a ativação ocorre na aprovação/assinatura." />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Comercial ── */}
          <div className="pm-card space-y-4">
            <p className="text-sm font-medium text-white">Comercial</p>

            {/* Tipo de pessoa */}
            <div className="space-y-1">
              <Label>Tipo de pessoa *</Label>
              <Controller control={control} name="document_type" render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'cnpj', label: 'Pessoa Jurídica (CNPJ)', icon: Building2 },
                    { v: 'cpf', label: 'Pessoa Física (CPF)', icon: User },
                  ] as const).map(({ v, label, icon: Icon }) => (
                    <button key={v} type="button" onClick={() => field.onChange(v)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-all ${
                        field.value === v ? 'border-amber-500/60 bg-amber-500/[0.1] text-white' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}>
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              )} />
            </div>

            {/* CNPJ (PJ) com autofill */}
            {docType === 'cnpj' ? (
              <>
                <div className="space-y-1">
                  <Label>CNPJ *</Label>
                  <Controller control={control} name="cnpj" render={({ field }) => (
                    <div className="relative">
                      <Input value={field.value ?? ''} maxLength={18}
                        onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                        onBlur={() => field.value && cnpjLookup.lookup(field.value)}
                        placeholder="00.000.000/0000-00" />
                      {cnpjLookup.status === 'loading' && <Loader2 className="absolute right-3 top-2.5 animate-spin text-amber-400" size={16} />}
                    </div>
                  )} />
                  {cnpjLookup.status === 'error' && <p className="text-[11px] text-amber-400 mt-1">CNPJ não encontrado na base — preencha manualmente.</p>}
                  {cnpjLookup.status === 'success' && <p className="text-[11px] text-emerald-400 mt-1">Dados preenchidos pelo CNPJ.</p>}
                  {err(errors.cnpj?.message)}
                </div>
                <div className="space-y-1">
                  <Label>Razão social</Label>
                  <Input {...register('razao_social')} placeholder="Preenchido pelo CNPJ" />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>CPF da unidade (representante autônomo) *</Label>
                <Controller control={control} name="cpf_unidade" render={({ field }) => (
                  <Input value={field.value ?? ''} onChange={(e) => field.onChange(maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                )} />
                {err(errors.cpf_unidade?.message)}
              </div>
            )}

            <div className="space-y-1">
              <Label>Nome fantasia da unidade *</Label>
              <Input {...register('name')} placeholder="Ex: ACL Performance" />
              {err(errors.name?.message)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de contrato *</Label>
                <Controller control={control} name="contract_type" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="linha_leve">Linha Leve</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1">
                <Label>Valor do contrato (R$) *</Label>
                <Input type="number" step="0.01" min={0} {...register('franchise_fee')} placeholder="50000.00" />
                {err(errors.franchise_fee?.message)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Plano de pagamento *</Label>
                <Controller control={control} name="payment_plan" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1">
                <Label>Forma de pagamento *</Label>
                <Controller control={control} name="sale_payment_method" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(METHOD_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Vendedor responsável (comissão) *</Label>
              <Controller control={control} name="sale_seller_id" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o vendedor..." /></SelectTrigger>
                  <SelectContent>
                    {sellers.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum vendedor da matriz ativo</div>}
                    {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {err(errors.sale_seller_id?.message)}
            </div>
          </div>

          {/* ── Geográfico ── */}
          <div className="pm-card space-y-4">
            <p className="text-sm font-medium text-white">Geográfico / Operacional</p>
            {/* CEP primeiro, com autofill */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>CEP</Label>
                <Controller control={control} name="cep" render={({ field }) => (
                  <div className="relative">
                    <Input value={field.value ?? ''} maxLength={9}
                      onChange={(e) => { const m = maskCEP(e.target.value); field.onChange(m); if (m.replace(/\D/g, '').length === 8) cepLookup.lookup(m) }}
                      placeholder="00000-000" />
                    {cepLookup.status === 'loading' && <Loader2 className="absolute right-2 top-2.5 animate-spin text-amber-400" size={15} />}
                  </div>
                )} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Logradouro</Label>
                <Input {...register('logradouro')} placeholder="Preenchido pelo CEP" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Cidade *</Label>
                <Input {...register('city')} placeholder="Cascavel" />
                {err(errors.city?.message)}
              </div>
              <div className="space-y-1">
                <Label>UF *</Label>
                <Input {...register('state')} placeholder="PR" maxLength={2} />
                {err(errors.state?.message)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Bairro</Label>
                <Input {...register('bairro')} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input {...register('numero')} placeholder="123" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Raio de atendimento (km)</Label>
              <Input type="number" step="0.1" min={0} {...register('raio_atendimento_km')} placeholder="Ex: 50" />
            </div>
            <div className="space-y-1">
              <Label>Municípios atendidos (separados por vírgula)</Label>
              <Input {...register('cidades_atendidas_txt')} placeholder="Cascavel, Toledo, Medianeira" />
              <p className="text-[11px] text-muted-foreground">Use o raio OU a lista de municípios.</p>
            </div>
          </div>

          {/* ── Responsável Legal ── */}
          <div className="pm-card space-y-4">
            <p className="text-sm font-medium text-white">Responsável Legal</p>
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input {...register('responsavel_legal_nome')} />
              {err(errors.responsavel_legal_nome?.message)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>CPF *</Label>
                <Controller control={control} name="responsavel_legal_cpf" render={({ field }) => (
                  <Input value={field.value} onChange={(e) => field.onChange(maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                )} />
                {err(errors.responsavel_legal_cpf?.message)}
              </div>
              <div className="space-y-1">
                <Label>RG</Label>
                <Input {...register('responsavel_legal_rg')} placeholder="00.000.000-0" />
                {err(errors.responsavel_legal_rg?.message)}
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail * (para assinatura do contrato)</Label>
              <Input type="email" {...register('responsavel_legal_email')} placeholder="responsavel@email.com" />
              {err(errors.responsavel_legal_email?.message)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone *</Label>
                <Controller control={control} name="responsavel_legal_telefone" render={({ field }) => (
                  <Input value={field.value} onChange={(e) => field.onChange(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                )} />
                {err(errors.responsavel_legal_telefone?.message)}
              </div>
              <div className="space-y-1">
                <Label>Cargo / vínculo</Label>
                <Input {...register('responsavel_legal_cargo')} placeholder="Sócio-Diretor..." />
              </div>
            </div>
          </div>

          {/* ── Contrato ── */}
          <div className="pm-card space-y-4">
            <p className="text-sm font-medium text-white">Contrato</p>
            <p className="text-xs text-muted-foreground">
              O contrato é criado como <strong>rascunho</strong>. A geração do PDF, envio para
              assinatura e ativação da unidade ocorrem nas próximas etapas (aprovação da matriz).
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('aceite')} className="mt-0.5" />
              <span className="text-sm text-zinc-200">
                Confirmo que os dados do contrato foram conferidos com o franqueado e estão corretos.
              </span>
            </label>
            {err(errors.aceite?.message as string | undefined)}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(`${prefix}/franqueados`)}>
            <ArrowLeft size={16} className="mr-2" />Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending} style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}>
            {create.isPending ? 'Salvando...' : 'Criar Contrato (rascunho)'}
          </Button>
        </div>
      </form>
    </div>
  )
}
