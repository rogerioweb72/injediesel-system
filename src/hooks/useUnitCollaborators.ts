import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

// Cargos de franquia editáveis pela matriz (espelha FRANCHISE_ROLES).
export const FRANCHISE_ROLE_LABEL: Record<string, string> = {
  franchise_manager: 'Administrador de Franquia',
  unit_manager:      'Gerente',
  unit_operator:     'Operador',
  ecu_technician:    'Técnico de ECU',
  unit_seller:       'Vendedor',
  receptionist:      'Atendente',
  finance_staff:     'Financeiro',
}

function useInvalidate(unitId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['unit-users', unitId] })
    qc.invalidateQueries({ queryKey: ['franchise-unit', unitId] })
    qc.invalidateQueries({ queryKey: ['franchise-units'] })
  }
}

// Bloquear / reativar o login do usuário de franquia.
export function useSetFranchiseUserActive(unitId: string) {
  const invalidate = useInvalidate(unitId)
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean; name?: string }) => {
      const { error } = await sb().rpc('set_franchise_user_active', { p_user_id: userId, p_active: active })
      if (error) throw error
      return { userId, active }
    },
    onSuccess: ({ userId, active }, vars) => {
      invalidate()
      log({ entity: 'profile', entityId: userId, action: active ? 'unblocked' : 'blocked', metadata: { name: vars.name } })
    },
  })
}

// Remover o acesso do usuário à unidade (troca de titularidade). Conta sobrevive.
export function useRemoveUnitAccess(unitId: string) {
  const invalidate = useInvalidate(unitId)
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ userId }: { userId: string; name?: string }) => {
      const { error } = await sb().rpc('remove_unit_access', { p_user_id: userId, p_unit_id: unitId })
      if (error) throw error
      return { userId }
    },
    onSuccess: ({ userId }, vars) => {
      invalidate()
      log({ entity: 'user_unit_role', entityId: userId, action: 'access_removed', metadata: { name: vars.name, unit_id: unitId } })
    },
  })
}

// Editar o cargo do usuário na unidade.
export function useSetUnitRole(unitId: string) {
  const invalidate = useInvalidate(unitId)
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string; name?: string }) => {
      const { error } = await sb().rpc('set_unit_role', { p_user_id: userId, p_unit_id: unitId, p_role: role })
      if (error) throw error
      return { userId, role }
    },
    onSuccess: ({ userId, role }, vars) => {
      invalidate()
      log({ entity: 'user_unit_role', entityId: userId, action: 'role_changed', metadata: { name: vars.name, role } })
    },
  })
}
