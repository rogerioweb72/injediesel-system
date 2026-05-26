import { useAuthStore } from '@/stores/auth'

const BASE = import.meta.env.VITE_SUPABASE_URL as string
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export type SecurityAction =
  | 'rls_violation'
  | 'forbidden_role'
  | 'cross_tenant_attempt'

export function logSecurityEvent(action: SecurityAction, payload: Record<string, unknown> = {}): void {
  const { session, profile } = useAuthStore.getState()
  if (!session) return

  // fire-and-forget — não bloqueia o fluxo principal
  fetch(`${BASE}/rest/v1/audit_events`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      actor_id: session.user.id,
      action,
      payload: {
        ...payload,
        role: profile?.role,
        url: window.location.pathname,
        ts: new Date().toISOString(),
      },
    }),
  }).catch(() => {
    // silencia erros de rede — auditoria não deve quebrar a UX
  })
}
