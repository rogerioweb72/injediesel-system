import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Mail, ShieldOff, ShieldCheck, UserMinus } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { translateError } from '@/lib/errors'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUnitUsers, type UnitUserRecord } from '@/hooks/useFranchiseUnits'
import {
  useSetFranchiseUserActive, useRemoveUnitAccess, useSetUnitRole, FRANCHISE_ROLE_LABEL,
} from '@/hooks/useUnitCollaborators'
import type { UserRole } from '@/types/app'

const ADMIN_ROLES: UserRole[] = ['company_admin', 'operations_admin', 'system_ti']

export function ColaboradoresTab({ unitId, onInvite }: { unitId: string; onInvite: () => void }) {
  const { data: users = [], isLoading } = useUnitUsers(unitId)
  const setActive = useSetFranchiseUserActive(unitId)
  const removeAccess = useRemoveUnitAccess(unitId)
  const setRole = useSetUnitRole(unitId)

  const [blockTarget, setBlockTarget] = useState<UnitUserRecord | null>(null)
  const [removeTarget, setRemoveTarget] = useState<UnitUserRecord | null>(null)

  async function toggleBlock() {
    if (!blockTarget) return
    const active = blockTarget.profiles?.active ?? true
    try {
      await setActive.mutateAsync({ userId: blockTarget.user_id, active: !active, name: blockTarget.profiles?.name })
      toast.success(active ? 'Usuário bloqueado' : 'Usuário reativado')
      setBlockTarget(null)
    } catch (e) { toast.error(translateError(e)) }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    try {
      await removeAccess.mutateAsync({ userId: removeTarget.user_id, name: removeTarget.profiles?.name })
      toast.success('Acesso removido da unidade')
      setRemoveTarget(null)
    } catch (e) { toast.error(translateError(e)) }
  }

  async function changeRole(u: UnitUserRecord, role: string) {
    try {
      await setRole.mutateAsync({ userId: u.user_id, role, name: u.profiles?.name })
      toast.success('Cargo atualizado')
    } catch (e) { toast.error(translateError(e)) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Users size={12} /> Colaboradores da unidade ({users.length})
        </p>
        <RoleGuard roles={ADMIN_ROLES}>
          <button onClick={onInvite}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.08] px-3 py-1.5 rounded-lg transition-all">
            <Mail size={12} /> Convidar acesso
          </button>
        </RoleGuard>
      </div>

      <p className="text-xs text-muted-foreground">
        Cada login pertence a uma unidade. Para troca de titularidade: bloqueie/remova o gestor atual
        e convide o novo. Remover acesso não apaga a conta — só desvincula desta unidade.
      </p>

      {isLoading ? (
        <div className="pm-skeleton h-20 rounded" />
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum colaborador vinculado. Use "Convidar acesso".</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const active = u.profiles?.active ?? true
            return (
              <div key={u.user_id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {u.profiles?.name ?? '—'}
                    {!active && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: '#F87171', background: '#F8717118' }}>Bloqueado</span>}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{u.profiles?.email ?? '—'}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <RoleGuard roles={ADMIN_ROLES} fallback={
                    <span className="text-xs text-zinc-400">{FRANCHISE_ROLE_LABEL[u.role] ?? u.role}</span>
                  }>
                    <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                      <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FRANCHISE_ROLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button onClick={() => setBlockTarget(u)} title={active ? 'Bloquear login' : 'Reativar login'}
                      className="p-1.5 rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-amber-400">
                      {active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                    </button>
                    <button onClick={() => setRemoveTarget(u)} title="Remover acesso da unidade"
                      className="p-1.5 rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-red-400">
                      <UserMinus size={15} />
                    </button>
                  </RoleGuard>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}
        title={(blockTarget?.profiles?.active ?? true) ? 'Bloquear login' : 'Reativar login'}
        description={(blockTarget?.profiles?.active ?? true)
          ? `Bloquear o login de "${blockTarget?.profiles?.name ?? ''}"? Ele não conseguirá acessar o sistema até ser reativado.`
          : `Reativar o login de "${blockTarget?.profiles?.name ?? ''}"?`}
        confirmLabel={(blockTarget?.profiles?.active ?? true) ? 'Bloquear' : 'Reativar'}
        isLoading={setActive.isPending} onConfirm={toggleBlock}
      />

      <ConfirmDialog
        open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remover acesso da unidade"
        description={`Remover o acesso de "${removeTarget?.profiles?.name ?? ''}" a esta unidade? A conta continua existindo, mas ele deixa de acessar esta unidade (troca de titularidade).`}
        confirmLabel="Remover acesso" isLoading={removeAccess.isPending} onConfirm={confirmRemove}
      />
    </div>
  )
}
