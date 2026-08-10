// src/components/auth/ModuleGuard.tsx
// Guarda de ROTA por permissão de módulo (RBAC). Bloqueia acesso direto via URL
// quando o usuário não tem can_view no módulo. system_ti e admin da matriz
// passam sempre (bypass em useModulePermission).
import { Navigate } from 'react-router-dom'
import type { RbacModule } from '@/types/app'
import { useModulePermission } from '@/hooks/usePermissions'

interface ModuleGuardProps {
  module: RbacModule
  children: React.ReactNode
}

export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { canView } = useModulePermission(module)
  if (!canView) return <Navigate to="/acesso-negado" replace />
  return <>{children}</>
}
