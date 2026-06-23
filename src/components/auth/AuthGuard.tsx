import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
  loginPath?: string
}

export function AuthGuard({ children, loginPath = '/appinjediesel' }: AuthGuardProps) {
  const { session, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="pm-skeleton h-8 w-48" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  return <>{children}</>
}
