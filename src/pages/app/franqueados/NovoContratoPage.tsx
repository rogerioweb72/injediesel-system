import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, FileSignature } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { translateError } from '@/lib/errors'
import { maskCPF, maskPhone, validarCPF } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers } from '@/hooks/useUsers'
import { useCreateFranchiseContract } from '@/hooks/useFranchiseUnits'
import { useFranchiseProducts } from '@/hooks/useFranchiseProducts'

const schema = z.object({
  // Comercial
  name:               z.string().min(2, 'Nome fantasia obrigatório'),
  contract_type:      z.enum(['full', 'linha_leve']),
  franchise_fee:      z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().positive('Valor obrigatório')),
  payment_plan:       z.enum(['a_vista', '3x', '6x', '12x']),
  sale_payment_method:z.enum(['boleto', 'pix', 'cartao', 'transferencia']),
  sale_seller_id:     z.string().min(1, 'Selecione o vendedor'),
  // Geográfico
  city:               z.string().min(2, 'Cidade obrigatória'),
  state:              z.string().min(2, 'UF obrigatória'),
  raio_atendimento_km:z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().positive().nullable()),
  cidades_atendidas_txt: z.string().optional(),
  logradouro:         z.string().optional(),
  numero:             z.string().optional(),
  bairro:             z.string().optional(),
  cep:                z.string().optional(),
  // Legal
  responsavel_legal_nome:     z.string().min(2, 'Nome do responsável obrigatório'),
  responsavel_legal_cpf:      z.string().refine(validarCPF, 'CPF inválido'),
  responsavel_legal_rg:       z.string().optional(),
  responsavel_legal_email:    z.string().email('E-mail inválido'),
  responsavel_legal_telefone: z.string().min(10, 'Telefone obrigatório'),
  responsavel_legal_cargo:    z.string().optional(),
  // Contrato
  aceite: z.literal(true, { message: 'É necessário aceitar os termos' }),
})

type FormData = z.infer<typeof schema>

const PLAN_LABEL: Record<string, string> = { a_vista: 'À vista', '3x': '3x', '6x': '6x', '12x': '12x' }
const METHOD_LABEL: Record<string, string> = { boleto: 'Boleto', pix: 'PIX', cartao: 'Cartão', transferencia: 'Transferência' }

export default function NovoContratoPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const create = useCreateFranchiseContract()

  // Vendedores da matriz (papel seller, ativos) — recebem a comissão da venda.
  const { data: users = [] } = useUsers()
  const sellers = users.filter((u) => u.role === 'seller' && u.active)

  const { data: fProducts = [] } = useFranchiseProducts()

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      contract_type: 'full', payment_plan: 'a_vista', sale_payment_method: 'pix',
      name: '', franchise_fee: undefined, sale_seller_id: '',
      city: '', state: '', raio_atendimento_km: null, cidades_atendidas_txt: '',
      logradouro: '', numero: '', bairro: '', cep: '',
      responsavel_legal_nome: '', responsavel_legal_cpf: '', responsavel_legal_rg: '',
      responsavel_legal_email: '', responsavel_legal_telefone: '', responsavel_legal_cargo: '',
      aceite: false,
    } as unknown as FormData,
  })

  // Preenche o valor base a partir do produto de franquia do tipo selecionado.
  const contractType = watch('contract_type')
  useEffect(() => {
    const prod = fProducts.find((p) => p.contract_type === contractType)
    if (prod && prod.default_fee > 0) {
      setValue('franchise_fee', prod.default_fee as unknown as number, { shouldValidate: false })
    }
  }, [contractType, fProducts, setValue])

  async function onSubmit(data: FormData) {
    try {
      const cidades = (data.cidades_atendidas_txt ?? '')
        .split(',').map((c) => c.trim()).filter(Boolean)
      await create.mutateAsync({
        name: data.name,
        contract_type: data.contract_type,
        franchise_fee: data.franchise_fee,
        payment_plan: data.payment_plan,
        sale_payment_method: data.sale_payment_method,
        sale_seller_id: data.sale_seller_id,
        city: data.city,
        state: data.state,
        raio_atendimento_km: data.raio_atendimento_km ?? null,
        cidades_atendidas: cidades.length ? cidades : null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        bairro: data.bairro || null,
        cep: data.cep || null,
        responsavel_legal_nome: data.responsavel_legal_nome,
        responsavel_legal_cpf: data.responsavel_legal_cpf,
        responsavel_legal_rg: data.responsavel_legal_rg || null,
        responsavel_legal_email: data.responsavel_legal_email,
        responsavel_legal_telefone: data.responsavel_legal_telefone,
        responsavel_legal_cargo: data.responsavel_legal_cargo || null,
      })
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
            <div className="space-y-1">
              <Label>Raio de atendimento (km)</Label>
              <Input type="number" step="0.1" min={0} {...register('raio_atendimento_km')} placeholder="Ex: 50" />
            </div>
            <div className="space-y-1">
              <Label>Municípios atendidos (separados por vírgula)</Label>
              <Input {...register('cidades_atendidas_txt')} placeholder="Cascavel, Toledo, Medianeira" />
              <p className="text-[11px] text-muted-foreground">Use o raio OU a lista de municípios.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Logradouro</Label>
                <Input {...register('logradouro')} placeholder="Rua, Av..." />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input {...register('numero')} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input {...register('bairro')} />
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input {...register('cep')} placeholder="00000-000" />
              </div>
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
