// src/hooks/usePermissions.ts
import { useProfile } from '@/hooks/useProfile'
import { useUsers } from '@/hooks/useUsers'
import {
  ROLE_DEFAULT_PERMISSIONS,
  getAccountTier,
  type RbacModule,
  type PermissionEntry,
  type UserRole,
} from '@/types/app'

// ── Resolve effective permissions for a role + optional custom overrides ───
export function getEffectivePermissions(
  role: UserRole,
  customPermissions: PermissionEntry[] | null | undefined,
): PermissionEntry[] {
  if (customPermissions && customPermissions.length > 0) return customPermissions
  return ROLE_DEFAULT_PERMISSIONS[role] ?? []
}

export function checkPermission(
  permissions: PermissionEntry[],
  module: RbacModule,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
): boolean {
  const entry = permissions.find((e) => e.module === module)
  return entry ? entry[action] : false
}

// ── useModulePermission — drop-in replacement, used by PermissionGuard ─────
export function useModulePermission(module: RbacModule) {
  const { profile, isSystemTI, isMatrixAdmin } = useProfile()

  if (isSystemTI() || isMatrixAdmin()) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true }
  }

  if (!profile) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false }
  }

  const perms = getEffectivePermissions(profile.role, profile.permissions ?? null)
  return {
    canView:   checkPermission(perms, module, 'can_view'),
    canCreate: checkPermission(perms, module, 'can_create'),
    canEdit:   checkPermission(perms, module, 'can_edit'),
    canDelete: checkPermission(perms, module, 'can_delete'),
  }
}

// ── useHasPermission — simple boolean check ────────────────────────────────
export function useHasPermission(
  module: RbacModule,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'can_view',
): boolean {
  const { canView, canCreate, canEdit, canDelete } = useModulePermission(module)
  if (action === 'can_view')   return canView
  if (action === 'can_create') return canCreate
  if (action === 'can_edit')   return canEdit
  return canDelete
}

// ── Utility: count active permissions ─────────────────────────────────────
export function countActivePermissions(permissions: PermissionEntry[]): number {
  return permissions.reduce((acc, e) => {
    if (e.can_view)   acc++
    if (e.can_create) acc++
    if (e.can_edit)   acc++
    if (e.can_delete) acc++
    return acc
  }, 0)
}

// ── Utility: get scope label based on role ────────────────────────────────
export function getRoleScope(role: UserRole): 'matrix' | 'franchise' | 'system' {
  const tier = getAccountTier(role)
  if (tier === 'system') return 'system'
  if (tier === 'franchise') return 'franchise'
  return 'matrix'
}

// Re-export for backward compat (these aren't used elsewhere but keep shape)
export { useUsers }
