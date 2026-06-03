import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/types/app'
import type { UserRole } from '@/types/app'

// ── Mode A: UI guard — esconde conteúdo sem redirecionar.
// Compatível com uso existente: <RoleGuard roles={['company_admin']}>
interface UiGuardProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
  allowedRoles?: never
  redirectTo?: never
}

// ── Mode B: Route guard — redireciona se sem permissão.
// Usado nos layouts do router: <RoleGuard allowedRoles={MATRIX_ROLES} redirectTo="/login">
interface RouteGuardProps {
  allowedRoles: UserRole[]
  redirectTo?: string
  children: React.ReactNode
  roles?: never
  fallback?: never
}

type RoleGuardProps = UiGuardProps | RouteGuardProps

export function RoleGuard(props: RoleGuardProps) {
  const profile = useAuthStore((s) => s.profile)
  const loading  = useAuthStore((s) => s.loading)

  // ── Mode B: Route guard
  if ('allowedRoles' in props && props.allowedRoles !== undefined) {
    const { allowedRoles, children, redirectTo = '/acesso-negado' } = props

    // Profile ainda carregando — AuthGuard acima já mostra skeleton, aqui suspende silenciosamente
    if (loading || !profile) return null

    // Conta desativada → logout forçado pelo interceptor global; guard só previne render
    if (!profile.active) return <Navigate to={redirectTo} replace />

    if (!canAccess(profile.role, allowedRoles)) return <Navigate to={redirectTo} replace />

    return <>{children}</>
  }

  // ── Mode A: UI guard (backward compatible — sem Navigate)
  const { roles, children, fallback = null } = props

  if (!profile) return <>{fallback}</>
  if (!profile.active) return <>{fallback}</>
  if (!canAccess(profile.role, roles)) return <>{fallback}</>

  return <>{children}</>
}
