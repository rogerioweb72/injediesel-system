import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { toast } from 'sonner'
import { syncProfile } from '@/lib/profileSync'
import { logSecurityEvent } from '@/lib/auditLog'
import { initSentry } from '@/lib/sentry'
import '@/index.css'
import { AppRouter } from '@/router'

initSentry()

// PostgREST / Supabase error codes que indicam falha de auth ou RLS
const AUTH_ERROR_CODES = new Set(['PGRST301', 'PGRST302', '42501'])

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  if (typeof e.code === 'string' && AUTH_ERROR_CODES.has(e.code)) return true
  if (typeof e.status === 'number' && (e.status === 401 || e.status === 403)) return true
  const msg = String(e.message ?? '')
  return msg.includes('JWT expired') || msg.includes('invalid claim')
}

/**
 * Interceptor global de erros de auth.
 * Em vez de fazer logout cego, re-busca o profile para entender o motivo:
 * - deactivated / not_found → logout + toast explicativo
 * - role_changed            → store atualizado; RoleGuard reage via Zustand
 * - ok / no_session         → JWT expirado real; logout silencioso
 */
async function handleAuthError() {
  const result = await syncProfile()

  if (result === 'deactivated') {
    toast.error('Sua conta foi desativada. Contate o administrador.')
  } else if (result === 'not_found') {
    toast.error('Usuário não encontrado. Faça login novamente.')
  } else if (result === 'role_changed') {
    toast.warning('Suas permissões foram alteradas. A interface foi atualizada.')
    // Não faz logout — Zustand propagou novo role; RoleGuard redireciona se necessário
  } else {
    // JWT expirado ou sessão inválida — logout silencioso (AuthGuard redireciona)
    // syncProfile já fez reset() se no_session
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      if (isAuthError(error)) {
        if ((error as unknown as Record<string, unknown>).code === '42501') {
          logSecurityEvent('rls_violation', { error: String((error as unknown as Record<string, unknown>).message) })
        }
        handleAuthError()
      } else {
        Sentry.captureException(error, { extra: { queryKey: query.queryKey } })
      }
    },
  }),
  mutationCache: new MutationCache({
    onError(error, _vars, _ctx, mutation) {
      if (isAuthError(error)) {
        if ((error as unknown as Record<string, unknown>).code === '42501') {
          logSecurityEvent('rls_violation', { error: String((error as unknown as Record<string, unknown>).message) })
        }
        handleAuthError()
      } else {
        Sentry.captureException(error, { extra: { mutationKey: mutation.options.mutationKey } })
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => !isAuthError(error) && failureCount < 1,
    },
  },
})

async function mount() {
  if (import.meta.env.VITE_MOCK === 'true') {
    const { setupMocks } = await import('@/mocks')
    setupMocks()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <div style={{ background: '#0B0C10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8', maxWidth: 400 }}>
              <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Erro inesperado</p>
              <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>{String(error)}</p>
              <button onClick={resetError} style={{ background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      >
        <QueryClientProvider client={queryClient}>
          <AppRouter />
        </QueryClientProvider>
      </Sentry.ErrorBoundary>
    </StrictMode>
  )
}

mount()
