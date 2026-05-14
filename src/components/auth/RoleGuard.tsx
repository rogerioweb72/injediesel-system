import type { UserRole } from '@/types/app'
import { useProfile } from '@/hooks/useProfile'

interface RoleGuardProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useProfile()

  if (!hasRole(...roles)) return <>{fallback}</>

  return <>{children}</>
}
