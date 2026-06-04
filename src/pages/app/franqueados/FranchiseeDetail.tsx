import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { ArrowLeft, Edit, Trash2, AlertTriangle, Clock, ArrowUpCircle, RefreshCw, ShieldOff, ShieldCheck, Mail, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ContractProgressBar, contractDaysRemaining } from '@/components/shared/ContractProgressBar'
import { FranchiseeWizard } from './wizard/FranchiseeWizard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFranchiseUnit, useDeleteFranchiseUnit, useUpdateFranchiseUnit } from '@/hooks/useFranchiseUnits'
import { useInviteFranchisee } from '@/hooks/useInviteFranchisee'
import CobrancasEcuTab from '@/pages/app/franqueados/CobrancasEcuTab'
import { RelatorioFranchiseeDrawer } from '@/pages/app/franqueados/RelatorioFranchiseeDrawer'
import { useRelatorioPerm } from '@/hooks/useRelatorios'
import type { ContractType } from '@/types/app'

const CONTRACT_LABELS: Record<string, string> = { full: 'Full', linha_leve: 'Linha Leve' }

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value ?? '—'}</div>
    </div>
  )
}

export default function FranchiseeDetail() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { id }   = useParams<{ id: string }>()

  const [editOpen,     setEditOpen]     = useState(false)
  const [deleteOpen,   setDeleteOpen]   = useState(false)
  const [upgradeOpen,  setUpgradeOpen]  = useState(false)
  const [renewOpen,    setRenewOpen]    = useState(false)
  const [blockOpen,    setBlockOpen]    = useState(false)
  const [inviteOpen,   setInviteOpen]   = useState(false)
  const [inviteEmail,  setInviteEmail]  = useState('')
  const [inviteName,   setInviteName]   = useState('')
  const [inviteRole,   setInviteRole]   = useState<'franchise_manager' | 'unit_operator'>('franchise_manager')

  // Upgrade state
  const [upgradeType, setUpgradeType] = useState<ContractType>('full')

  // Renovar state
  const [renewEnd, setRenewEnd] = useState('')
  const [renewErr, setRenewErr] = useState('')

  // Bloquear state
  const [blockReason, setBlockReason] = useState('')

  const relatorioPerm  = useRelatorioPerm()
  const [relatorioOpen, setRelatorioOpen] = useState(false)

  const { data: unit, isLoading } = useFranchiseUnit(id ?? '')
  const deleteUnit  = useDeleteFranchiseUnit()
  const updateUnit  = useUpdateFranchiseUnit()
  const invite      = useInviteFranchisee()

  if (isLoading || !unit) return <div className="pm-skeleton h-64 w-full rounded" />

  async function handleDelete() {
    await deleteUnit.mutateAsync(unit!.id)
    setDeleteOpen(false)
    navigate(`${prefix}/franqueados`)
  }

  async function handleUpgrade() {
    await updateUnit.mutateAsync({ id: unit!.id, contract_type: upgradeType })
    toast.success('Tipo de contrato atualizado')
    setUpgradeOpen(false)
  }

  function validateRenew() {
    if (!renewEnd) { setRenewErr('Informe a nova data de término'); return false }
    const start = unit!.contract_start_date ?? new Date().toISOString().split('T')[0]
    const minEnd = new Date(start)
    minEnd.setFullYear(minEnd.getFullYear() + 1)
    if (new Date(renewEnd) < minEnd) {
      setRenewErr(`Vigência mínima de 12 meses a partir de ${start}`)
      return false
    }
    return true
  }

  async function handleRenew() {
    if (!validateRenew()) return
    await updateUnit.mutateAsync({ id: unit!.id, contract_end_date: renewEnd })
    toast.success('Contrato renovado')
    setRenewOpen(false)
    setRenewEnd('')
    setRenewErr('')
  }

  async function handleBlock() {
    const now = new Date().toISOString()
    await updateUnit.mutateAsync({
      id: unit!.id,
      contract_blocked: true,
      contract_blocked_reason: blockReason || null,
      contract_blocked_at: now,
    })
    toast.warning('Unidade bloqueada')
    setBlockOpen(false)
    setBlockReason('')
  }

  async function handleUnblock() {
    await updateUnit.mutateAsync({
      id: unit!.id,
      contract_blocked: false,
      contract_blocked_reason: null,
      contract_blocked_at: null,
    })
    toast.success('Unidade desbloqueada')
  }

  const hasContract = !!unit.contract_start_date && !!unit.contract_end_date
  const daysLeft    = hasContract ? contractDaysRemaining(unit.contract_end_date!) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={unit.name}
        subtitle={unit.city && unit.state ? `${unit.city} — ${unit.state}` : undefined}
      />

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {relatorioPerm.hasAny && unit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRelatorioOpen(true)}
            className="gap-1.5"
          >
            <BarChart3 size={14} />
            Relatórios
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => navigate(`${prefix}/franqueados`)}>
          <ArrowLeft size={16} className="mr-2" />Voltar
        </Button>
        <PermissionGuard module="franqueados" action="edit">
          <Button variant="outline" size="sm" onClick={() => { setUpgradeType(unit.contract_type); setUpgradeOpen(true) }}>
            <ArrowUpCircle size={14} className="mr-1.5" />Upgrade
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRenewEnd(unit.contract_end_date?.split('T')[0] ?? ''); setRenewOpen(true) }}>
            <RefreshCw size={14} className="mr-1.5" />Renovar
          </Button>
          {unit.contract_blocked ? (
            <Button
              size="sm"
              onClick={handleUnblock}
              disabled={updateUnit.isPending}
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <ShieldCheck size={14} className="mr-1.5" />Desbloquear
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setBlockOpen(true)}>
              <ShieldOff size={14} className="mr-1.5" />Bloquear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit size={16} className="mr-2" />Editar
          </Button>
        </PermissionGuard>
        <RoleGuard roles={['company_admin']}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setInviteEmail(unit.email ?? ''); setInviteOpen(true) }}
            style={{ borderColor: 'rgba(96,165,250,0.3)', color: '#60A5FA' }}
          >
            <Mail size={14} className="mr-1.5" />Convidar Acesso
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} />
          </Button>
        </RoleGuard>
      </div>

      <Tabs defaultValue="dados" className="w-full mt-6">
        <TabsList style={{ background: 'hsl(var(--pm-gray-900))' }}>
          <TabsTrigger value="dados" className="text-xs px-4">Dados da Unidade</TabsTrigger>
          <TabsTrigger value="cobrancas" className="text-xs px-4">Cobranças ECU</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          {/* ── Alerta de bloqueio ── */}
          {unit.contract_blocked && (
            <div style={{ background: '#F59E0B', border: '2px solid #000', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={16} color="#000" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 800, fontSize: '14px', color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Unidade Bloqueada pela Matriz
                </p>
                {unit.contract_blocked_reason && (
                  <p style={{ fontFamily: '"DM Sans",sans-serif', fontSize: '12px', color: '#1a1a1a', marginTop: '2px' }}>
                    Motivo: {unit.contract_blocked_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Alertas de vencimento ── */}
          {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(248,113,113,0.08)', borderTop: '1px solid rgba(248,113,113,0.15)' }}>
              <AlertTriangle size={15} style={{ color: '#F87171', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#F87171' }}>Contrato vencendo em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}</p>
                <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.7)', marginTop: 2 }}>Acione o processo de renovação imediatamente.</p>
              </div>
            </div>
          )}
          {daysLeft !== null && daysLeft > 30 && daysLeft <= 90 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
              <Clock size={15} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#FBBF24' }}>Contrato vence em {daysLeft} dias</p>
                <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.7)', marginTop: 2 }}>Inicie o processo de renovação para garantir a continuidade operacional.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

            {/* Identificação */}
            <div className="pm-card space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Identificação</p>
              <InfoRow label="Nome Fantasia"     value={unit.name} />
              <InfoRow label="Razão Social"      value={unit.razao_social} />
              <InfoRow label="CNPJ"              value={unit.cnpj} />
              <InfoRow label="Inscrição Estadual" value={unit.inscricao_estadual} />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                {(() => {
                  const statusMap: Record<string, { color: string; label: string }> = {
                    em_implantacao: { color: '#60A5FA', label: 'Em Implantação' },
                    ativa: { color: '#34D399', label: 'Ativa' },
                    suspensa: { color: '#FBBF24', label: 'Suspensa' },
                    encerrada: { color: '#64748B', label: 'Encerrada' },
                  }
                  const cur = statusMap[unit.status ?? 'em_implantacao'] ?? statusMap['em_implantacao']
                  return <span style={{ fontSize: 13, fontWeight: 600, color: cur.color }}>{cur.label}</span>
                })()}
              </div>
            </div>

            {/* Contato */}
            <div className="pm-card space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Contato e Localização</p>
              <InfoRow label="Telefone"      value={unit.phone} />
              <InfoRow label="E-mail"        value={unit.email} />
              <InfoRow label="Endereço"      value={unit.address} />
              <InfoRow label="Cidade / UF"   value={unit.city && unit.state ? `${unit.city} — ${unit.state}` : (unit.city ?? unit.state)} />
              <InfoRow label="Cidade Fiscal" value={unit.cidade_fiscal} />
            </div>

            {/* Território */}
            <div className="pm-card space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Delimitação Territorial</p>
              <InfoRow label="Raio de Atendimento" value={unit.raio_atendimento_km != null ? `${unit.raio_atendimento_km} km` : null} />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cidades Atendidas</p>
                {unit.cidades_atendidas?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unit.cidades_atendidas.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03]">{c}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">—</p>}
              </div>
            </div>

            {/* Contrato */}
            <div className="pm-card space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Contrato</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: unit.contract_type === 'full' ? 'rgba(177,40,37,0.1)' : 'rgba(96,165,250,0.1)', color: unit.contract_type === 'full' ? '#B12825' : '#60A5FA', fontSize: 11, fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: unit.contract_type === 'full' ? '#B12825' : '#60A5FA', flexShrink: 0 }} />
                  {CONTRACT_LABELS[unit.contract_type]}
                </span>
              </div>
              <InfoRow label="Início"   value={unit.contract_start_date ? new Date(unit.contract_start_date).toLocaleDateString('pt-BR') : null} />
              <InfoRow label="Término"  value={unit.contract_end_date   ? new Date(unit.contract_end_date).toLocaleDateString('pt-BR')   : null} />
            </div>
          </div>

          {/* Vigência */}
          {hasContract && (
            <div className="pm-card space-y-3 mt-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Vigência do Contrato</p>
              <ContractProgressBar startDate={unit.contract_start_date!} endDate={unit.contract_end_date!} />
            </div>
          )}

          {!hasContract && (
            <div className="pm-card mt-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Vigência do Contrato</p>
              <p className="text-sm text-muted-foreground">Datas não definidas. Edite a unidade para configurar.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cobrancas" className="mt-4">
          <CobrancasEcuTab unitId={id ?? ''} unitName={unit?.name ?? ''} />
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Upgrade / Downgrade */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Tipo de Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Tipo de Contrato</Label>
            <Select value={upgradeType} onValueChange={(v) => setUpgradeType(v as ContractType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full — acesso completo</SelectItem>
                <SelectItem value="linha_leve">Linha Leve — catálogo restrito</SelectItem>
              </SelectContent>
            </Select>
            {upgradeType !== unit.contract_type && (
              <p className="text-xs text-amber-400">
                {upgradeType === 'full'
                  ? 'Upgrade: unidade passará a ter acesso a todas as categorias.'
                  : 'Downgrade: categorias Truck, Agrícola e Máquina Pesada serão bloqueadas.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpgradeOpen(false)}>Cancelar</Button>
            <Button
              disabled={upgradeType === unit.contract_type || updateUnit.isPending}
              onClick={handleUpgrade}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              {updateUnit.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovar contrato */}
      <Dialog open={renewOpen} onOpenChange={(o) => { setRenewOpen(o); if (!o) { setRenewErr('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renovar Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nova data de término *</Label>
              <Input type="date" value={renewEnd} onChange={e => { setRenewEnd(e.target.value); setRenewErr('') }} />
              {renewErr && <p className="text-xs text-red-400">{renewErr}</p>}
            </div>
            <p className="text-xs text-muted-foreground">Vigência mínima obrigatória: 12 meses</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenewOpen(false)}>Cancelar</Button>
            <Button
              disabled={updateUnit.isPending}
              onClick={handleRenew}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              {updateUnit.isPending ? 'Salvando...' : 'Renovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bloquear */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Bloquear Unidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              A unidade <strong className="text-foreground">{unit.name}</strong> será bloqueada e não poderá enviar arquivos ECU.
            </p>
            <div className="space-y-1">
              <Label>Motivo do bloqueio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                rows={3}
                placeholder="Inadimplência, violação contratual, solicitação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={updateUnit.isPending}
              onClick={handleBlock}
            >
              {updateUnit.isPending ? 'Bloqueando...' : 'Bloquear Unidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FranchiseeWizard open={editOpen} onOpenChange={setEditOpen} unit={unit} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Unidade"
        description={`Tem certeza que deseja excluir permanentemente "${unit.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        isLoading={deleteUnit.isPending}
        confirmLabel="Excluir Permanentemente"
        requireTyped="excluir"
      />

      {/* Dialog de convite */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteEmail(''); setInviteName(''); } setInviteOpen(v) }}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Convidar Acesso à Unidade</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              O usuário receberá um email com link para definir sua senha e acessar o sistema.
            </p>
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="franqueado@email.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil de Acesso</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="franchise_manager">Gerente de Franquia — acesso completo da unidade</SelectItem>
                  <SelectItem value="unit_operator">Operador — acesso operacional restrito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={invite.isPending}>
              Cancelar
            </Button>
            <Button
              disabled={!inviteEmail || !inviteName || invite.isPending}
              onClick={async () => {
                try {
                  const result = await invite.mutateAsync({ email: inviteEmail, name: inviteName, unit_id: unit.id, role: inviteRole })
                  if (result.already_registered) {
                    toast.success(`Acesso vinculado para ${inviteEmail} (usuário já cadastrado)`)
                  } else {
                    toast.success(`Convite enviado para ${inviteEmail}`)
                  }
                  setInviteOpen(false)
                  setInviteEmail('')
                } catch (err: unknown) {
                  toast.error(translateError(err))
                }
              }}
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)' }}
            >
              {invite.isPending ? 'Enviando...' : <><Mail size={14} className="mr-1.5" />Enviar Convite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {unit && (
        <RelatorioFranchiseeDrawer
          open={relatorioOpen}
          onClose={() => setRelatorioOpen(false)}
          unit={{ id: unit.id, name: unit.name, city: unit.city ?? '—', state: unit.state ?? '—' }}
        />
      )}
    </div>
  )
}
