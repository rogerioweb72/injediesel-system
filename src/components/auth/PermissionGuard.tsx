// src/components/auth/PermissionGuard.tsx
// Guards content based on RBAC module permissions (not just role)
import type { RbacModule } from '@/types/app'
import { useModulePermission } from '@/hooks/usePermissions'

type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

interface PermissionGuardProps {
  module: RbacModule
  action?: PermissionAction
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({
  module,
  action = 'view',
  children,
  fallback = null,
}: PermissionGuardProps) {
  const perms = useModulePermission(module)

  const allowed =
    action === 'view'   ? perms.canView   :
    action === 'create' ? perms.canCreate :
    action === 'edit'   ? perms.canEdit   :
    action === 'delete' ? perms.canDelete : false

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
