import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/app'
import { canAccess, MATRIX_ROLES } from '@/types/app'

export function useProfile() {
  const profile = useAuthStore((s) => s.profile)

  function hasRole(...roles: UserRole[]): boolean {
    if (!profile) return false
    return canAccess(profile.role, roles)
  }

  function isMatrixUser(): boolean {
    return hasRole(...MATRIX_ROLES)
  }

  return { profile, hasRole, isMatrixUser }
}
