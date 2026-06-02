import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useUnitUsers } from '@/hooks/useFranchiseUnits'
import { useInviteFranchisee } from '@/hooks/useInviteFranchisee'
import { toast } from 'sonner'
import { translateError } from '@/lib/errors'
import { UserPlus } from 'lucide-react'
import { ROLE_LABELS } from '@/types/app'

type Tab = 'colaboradores'
const TABS: { id: Tab; label: string }[] = [
  { id: 'colaboradores', label: 'Colaboradores' },
]

function ColaboradoresTab({ unitId }: { unitId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'unit_operator' | 'franchise_manager'>('unit_operator')
  const invite = useInviteFranchisee()

  const { data: users = [], isLoading, refetch } = useUnitUsers(unitId)

  function handleClose() {
    setInviteOpen(false)
    setInviteName('')
    setInviteEmail('')
    setInviteRole('unit_operator')
  }

  async function handleInvite() {
    try {
      const result = await invite.mutateAsync({ email: inviteEmail, name: inviteName, unit_id: unitId, role: inviteRole })
      if (result.already_registered) {
        toast.success(`Acesso vinculado para ${inviteEmail}`)
      } else {
        toast.success(`Convite enviado para ${inviteEmail}`)
      }
      handleClose()
      refetch()
    } catch (err: unknown) {
      toast.error(translateError(err))
    }
  }

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="pm-skeleton h-14 rounded" />)}</div>
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setInviteOpen(true)} style={{ background: 'var(--pm-accent-gradient)' }}>
          <UserPlus size={15} className="mr-1.5" />Adicionar Colaborador
        </Button>
      </div>

      <div className="pm-card p-0 divide-y divide-[hsl(var(--pm-gray-700))]">
        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum colaborador cadastrado. Clique em "Adicionar Colaborador" para convidar.
          </div>
        )}
        {users.map((u) => {
          const p = u.profiles
          const initials = p?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '??'
          return (
            <div key={u.user_id} className="flex items-center gap-4 p-4">
              <div
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: p?.active ? 'hsl(var(--pm-red-500))' : 'hsl(var(--pm-gray-700))' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{p?.name ?? '—'}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-muted-foreground">{p?.email}</p>
                  <span className="text-xs text-muted-foreground/60">·</span>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</p>
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
                background: p?.active ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.08)',
                color: p?.active ? '#34D399' : '#475569',
                fontSize: 11, fontWeight: 600,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: p?.active ? '#34D399' : '#475569', flexShrink: 0 }} />
                {p?.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          )
        })}
      </div>

      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) handleClose(); else setInviteOpen(true) }}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Adicionar Colaborador</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              O colaborador receberá um email com link de acesso ao sistema.
            </p>
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="João da Silva" />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colaborador@email.com" />
            </div>
            <div className="space-y-1">
              <Label>Perfil de Acesso</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit_operator">Operador — acesso operacional restrito</SelectItem>
                  <SelectItem value="franchise_manager">Gerente — acesso completo da unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={invite.isPending}>Cancelar</Button>
            <Button
              disabled={!inviteEmail || !inviteName || invite.isPending}
              onClick={handleInvite}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              {invite.isPending ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function FranqueadoConfigPage() {
  const [tab, setTab] = useState<Tab>('colaboradores')
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Gerencie colaboradores da sua unidade" />

      <div className="flex gap-1 border-b border-[hsl(var(--pm-gray-700))] mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-foreground border-b-2 border-[hsl(var(--pm-red-500))] -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!unitId ? (
        <p className="text-sm text-muted-foreground">Carregando dados da unidade...</p>
      ) : (
        tab === 'colaboradores' && <ColaboradoresTab unitId={unitId} />
      )}
    </div>
  )
}
