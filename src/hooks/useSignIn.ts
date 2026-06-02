import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { AppUser } from '@/types/app'
import { translateAuthError } from '@/lib/errors'

const BASE = import.meta.env.VITE_SUPABASE_URL as string
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export interface SignInResult {
  profile: AppUser | null
  accessToken: string
  refreshToken: string
  userId: string
}

// Shared raw-fetch auth flow (bypasses supabase-js which hangs on DB queries).
// Does: auth token → profile fetch → store sync → supabase.auth.setSession.
// Navigation is intentionally left to the calling component.
export async function rawSignIn(email: string, password: string): Promise<SignInResult> {
  const authRes = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const authJson = await authRes.json()
  if (!authRes.ok) {
    throw new Error(translateAuthError(authJson.error_description || authJson.msg || ''))
  }

  const profRes = await fetch(
    `${BASE}/rest/v1/profiles?id=eq.${authJson.user.id}&select=*&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${authJson.access_token}` } },
  )
  const profRows = await profRes.json()
  const loadedProfile: AppUser | null = Array.isArray(profRows) && profRows[0] ? profRows[0] : null

  const store = useAuthStore.getState()
  if (loadedProfile) store.setProfile(loadedProfile)
  store.setSession(authJson)
  await supabase.auth.setSession({ access_token: authJson.access_token, refresh_token: authJson.refresh_token })

  return {
    profile: loadedProfile,
    accessToken: authJson.access_token as string,
    refreshToken: authJson.refresh_token as string,
    userId: authJson.user.id as string,
  }
}

export function useSignIn() {
  return { signIn: rawSignIn }
}
