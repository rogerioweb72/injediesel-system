import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useWizard } from './WizardContext'
import { useCreateFranchiseUnit, useUpdateFranchiseUnit, uploadLogo, type FranchiseUnit } from '@/hooks/useFranchiseUnits'
import { useInviteFranchisee } from '@/hooks/useInviteFranchisee'

const STATUS_LABEL: Record<string, string> = {
  em_implantacao: 'Em Implantação',
  ativa: 'Ativa',
  suspensa: 'Suspensa',
  encerrada: 'Encerrada',
}

const CONTRACT_LABEL: Record<string, string> = {
  full: 'Full',
  linha_leve: 'Linha Leve',
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  isEdit: boolean
  unit?: FranchiseUnit
  logoFile: File | null
  onSuccess: () => void
}

export function ConfirmSummaryDialog({ open, onOpenChange, isEdit, unit, logoFile, onSuccess }: Props) {
  const { form } = useWizard()
  const { getValues } = form
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const create = useCreateFranchiseUnit()
  const update = useUpdateFranchiseUnit()
  const invite = useInviteFranchisee()
  const [submitting, setSubmitting] = useState(false)

  const values = getValues()

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const cidades = values.cidades_atendidas_txt
        ? values.cidades_atendidas_txt.split(',').map(s => s.trim()).filter(Boolean)
        : null

      const toIntOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null
        const n = Number(v)
        return Number.isNaN(n) ? null : n
      }
      const toNumOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null
        const n = Number(v)
        return Number.isNaN(n) ? null : n
      }

      const payload = {
        name: values.name,
        status: values.status,
        logo_url: unit?.logo_url ?? null,
        razao_social: values.razao_social || null,
        cnpj: values.cnpj || null,
        inscricao_estadual: values.inscricao_estadual || null,
        cidade_fiscal: values.cidade_fiscal || null,
        website: values.website || null,
        phone: values.phone || null,
        email: values.email || null,
        cep: values.cep || null,
        logradouro: values.logradouro || null,
        numero: values.numero || null,
        complemento: values.complemento || null,
        bairro: values.bairro || null,
        city: values.city || null,
        state: values.state || null,
        address: [values.logradouro, values.numero, values.bairro].filter(Boolean).join(', ') || null,
        raio_atendimento_km: toNumOrNull(values.raio_atendimento_km),
        cidades_atendidas: cidades,
        perimetro_exclusivo: values.perimetro_exclusivo,
        responsavel_legal_nome: values.responsavel_legal_nome || null,
        responsavel_legal_cpf: values.responsavel_legal_cpf || null,
        responsavel_legal_email: values.responsavel_legal_email || null,
        responsavel_legal_telefone: values.responsavel_legal_telefone || null,
        responsavel_legal_cargo: values.responsavel_legal_cargo || null,
        responsavel_op_mesmo_legal: values.responsavel_op_mesmo_legal,
        responsavel_op_nome: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_nome || null),
        responsavel_op_email: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_email || null),
        responsavel_op_telefone: values.responsavel_op_mesmo_legal ? null : (values.responsavel_op_telefone || null),
        contract_type: values.contract_type,
        contract_start_date: values.contract_start_date || null,
        contract_end_date: values.contract_end_date || null,
        limite_colaboradores: toIntOrNull(values.limite_colaboradores),
        observacoes_internas: values.observacoes_internas || null,
        active: values.status === 'ativa',
        commission_rate: unit?.commission_rate ?? 0,
        manager_id: unit?.manager_id ?? null,
        contract_blocked: unit?.contract_blocked ?? false,
        contract_blocked_reason: unit?.contract_blocked_reason ?? null,
        contract_blocked_at: unit?.contract_blocked_at ?? null,
      }

      if (isEdit && unit) {
        await update.mutateAsync({ id: unit.id, ...payload })
        if (logoFile) {
          const logo_url = await uploadLogo(unit.id, logoFile)
          await update.mutateAsync({ id: unit.id, logo_url })
        }
        toast.success('Unidade atualizada')
        onSuccess()
      } else {
        const created = await create.mutateAsync(payload)
        if (logoFile) {
          const logo_url = await uploadLogo(created.id, logoFile)
          await update.mutateAsync({ id: created.id, logo_url })
        }

        let inviteOk = false
        try {
          await invite.mutateAsync({
            email: values.responsavel_legal_email,
            name: values.responsavel_legal_nome,
            unit_id: created.id,
            role: 'franchise_manager',
          })
          inviteOk = true
        } catch (inviteErr) {
          console.error('Falha ao enviar convite automático:', inviteErr)
        }

        if (inviteOk) {
          toast.success(`Unidade criada e convite enviado para ${values.responsavel_legal_email}`)
        } else {
          toast.warning('Unidade criada, mas o convite falhou — reenvie pelo botão no topo da página')
        }
        onSuccess()
        navigate(`${prefix}/franqueados/${created.id}`)
      }
    } catch (err) {
      toast.error('Erro ao salvar unidade. Tente novamente.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Confirmar Alterações' : 'Confirmar Criação'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground text-xs">
            {isEdit ? 'Você está atualizando a unidade:' : 'Você está criando a unidade:'}
          </p>

          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
            <p className="font-semibold">{values.name}</p>
            {values.city && values.state && (
              <p className="text-xs text-muted-foreground">{values.city} — {values.state}</p>
            )}
            <div className="pt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contrato</span>
                <span>{CONTRACT_LABEL[values.contract_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vigência</span>
                <span>{fmt(values.contract_start_date)} → {fmt(values.contract_end_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsável</span>
                <span className="truncate max-w-[140px]">{values.responsavel_legal_nome || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status inicial</span>
                <span>{STATUS_LABEL[values.status]}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            style={{ background: 'var(--pm-accent-gradient)' }}
          >
            {submitting ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" />Salvando...</>
            ) : (
              isEdit ? 'Confirmar Alterações' : 'Confirmar e Criar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
