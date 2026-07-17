import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCart } from '@/stores/cart'
import { setSentryUser, clearSentryUser } from '@/lib/sentry'
import { translateAuthError } from '@/lib/errors'
import type { AppUser } from '@/types/app'

export function useAuth() {
  const { session, user, profile, loading, setSession, setProfile, setLoading, reset } =
    useAuthStore()

  const cancelledRef = useRef(false)

  const fetchProfile = useCallback(
    async (userId: string, accessToken: string) => {
      setLoading(true)
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        const res = await fetch(url, {
          headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
        })
        const rows = await res.json()
        if (cancelledRef.current) return
        if (Array.isArray(rows) && rows[0]) {
          const p = rows[0] as unknown as AppUser
          setProfile(p)
          setSentryUser(p.id, p.role)
        }
      } catch {
        // ignore — safety timeout will unblock loading
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    },
    [setLoading, setProfile]
  )

  useEffect(() => {
    cancelledRef.current = false

    // Safety net: if loading stays true after 6s (e.g. StrictMode race or network blip), unblock.
    const safetyTimer = setTimeout(() => {
      if (!cancelledRef.current && useAuthStore.getState().loading) setLoading(false)
    }, 6000)

    // onAuthStateChange fires INITIAL_SESSION immediately — no need for a separate getSession() call.
    // Using both simultaneously causes a double fetchProfile race that flickers loading=true/false
    // and makes AuthGuard redirect to /login mid-navigation.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelledRef.current) return
        // Subscrito no root (não lazy) — chega antes de qualquer página lazy montar,
        // evitando a corrida em que o hash type=recovery já foi processado/limpo
        // pelo supabase-js antes da página de login conseguir ler window.location.hash.
        if (event === 'PASSWORD_RECOVERY') useAuthStore.getState().setHashRecoveryFlow(true)
        setSession(session)
        if (session) {
          // Skip if profile is already loaded (mock mode pre-populates, or token refresh events)
          const already = useAuthStore.getState().profile
          if (already) {
            if (useAuthStore.getState().loading) setLoading(false)
          } else {
            await fetchProfile(session.user.id, session.access_token)
          }
        } else {
          reset()
          useCart.getState().clear()
          clearSentryUser()
        }
      }
    )

    return () => {
      cancelledRef.current = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [fetchProfile, setSession, reset, setLoading])

  async function login(email: string, password: string) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    const res = await fetch(url, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(translateAuthError(data.error_description || data.msg || ''))
    // supabase-js onAuthStateChange picks up the session stored by signInWithPassword via realtime;
    // bypass by manually setting session so the store updates immediately
    await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return { session, user, profile, loading, login, logout }
}
