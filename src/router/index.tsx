import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'

const Landing   = lazy(() => import('@/pages/Landing'))
const Login     = lazy(() => import('@/pages/Login'))
const NotFound  = lazy(() => import('@/pages/NotFound'))
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="pm-skeleton h-8 w-32" />
    </div>
  )
}

function ProtectedLayout() {
  return (
    <AuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGuard>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<LoadingFallback />}><Landing /></Suspense>,
  },
  {
    path: '/login',
    element: <Suspense fallback={<LoadingFallback />}><Login /></Suspense>,
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/matriz/dashboard',
        element: <Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>,
      },
    ],
  },
  {
    path: '*',
    element: <Suspense fallback={<LoadingFallback />}><NotFound /></Suspense>,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
