import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/app'
import { canAccess } from '@/types/app'

export function useProfile() {
  const profile = useAuthStore((s) => s.profile)

  function hasRole(...roles: UserRole[]): boolean {
    if (!profile) return false
    return canAccess(profile.role, roles)
  }

  function isMatrixUser(): boolean {
    return hasRole('company_admin', 'operations_admin', 'finance_admin', 'support_agent', 'seller')
  }

  return { profile, hasRole, isMatrixUser }
}
