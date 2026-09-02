import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// Grava erros/falhas em public.error_logs (painel de monitoramento do webmaster).
// Fire-and-forget: NUNCA lança nem derruba o app. Complementa o Sentry.

interface LogCtx {
  source?: 'frontend' | 'edge' | 'db'
  level?: 'error' | 'warn' | 'fatal'
  extra?: Record<string, unknown>
}

let lastKey = ''
let lastAt = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function logError(err: unknown, ctx: LogCtx = {}): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any
    const message = String(e?.message ?? err ?? 'Erro desconhecido').slice(0, 2000)

    // Dedup: mesmo erro em menos de 5s não repete (evita flood).
    const now = Date.now()
    if (message === lastKey && now - lastAt < 5000) return
    lastKey = message
    lastAt = now

    const stack = e?.stack ? String(e.stack).slice(0, 8000) : null
    // Erro do Supabase/PostgREST (tem code/details) = camada de banco.
    const source = ctx.source ?? ((e?.code || e?.details) ? 'db' : 'frontend')
    const { profile, user } = useAuthStore.getState()

    sb().from('error_logs').insert({
      source,
      level: ctx.level ?? 'error',
      message,
      stack,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      user_id: user?.id ?? null,
      user_role: (profile as { role?: string } | null)?.role ?? null,
      unit_id: (profile as { unit_id?: string } | null)?.unit_id ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      context: ctx.extra ?? null,
    }).then(() => {}, () => {}) // engole qualquer erro do próprio log
  } catch {
    /* o logger nunca pode derrubar o app */
  }
}

// Handlers globais — chamar uma vez no bootstrap (main.tsx).
export function installGlobalErrorLogging(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (ev) => {
    logError(ev.error ?? ev.message, { source: 'frontend', extra: { type: 'window.onerror' } })
  })
  window.addEventListener('unhandledrejection', (ev) => {
    logError(ev.reason, { source: 'frontend', extra: { type: 'unhandledrejection' } })
  })
}
