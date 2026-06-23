import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/app'
import { canAccess, getAccountTier, MATRIX_ROLES, SYSTEM_ROLES } from '@/types/app'

export function useProfile() {
  const profile = useAuthStore((s) => s.profile)
  const impersonating = useAuthStore((s) => s.impersonating)

  // The "effective" profile for UI rendering (impersonated or real)
  const effectiveProfile = impersonating ?? profile

  function hasRole(...roles: UserRole[]): boolean {
    if (!profile) return false
    // system_ti always passes
    if (profile.role === 'system_ti') return true
    return canAccess(profile.role, roles)
  }

  function isSystemTI(): boolean {
    return profile?.role === 'system_ti'
  }

  function isMatrixAdmin(): boolean {
    return hasRole('company_admin') || isSystemTI()
  }

  function isMatrixUser(): boolean {
    return hasRole(...MATRIX_ROLES) || isSystemTI()
  }

  function isFranchiseUser(): boolean {
    return hasRole('franchise_manager', 'unit_manager', 'unit_operator', 'ecu_technician', 'unit_seller', 'receptionist', 'finance_staff') && !isSystemTI()
  }

  function tier() {
    if (!profile) return null
    return getAccountTier(profile.role)
  }

  return {
    profile,
    effectiveProfile,
    hasRole,
    isSystemTI,
    isMatrixAdmin,
    isMatrixUser,
    isFranchiseUser,
    tier,
    // When impersonating, expose both identities
    realProfile: profile,
    isImpersonating: !!impersonating,
  }
}

export { SYSTEM_ROLES, MATRIX_ROLES }
