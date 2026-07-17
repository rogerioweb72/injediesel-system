import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { AppUser } from '@/types/app'

interface AuthState {
  session: Session | null
  user: User | null
  profile: AppUser | null
  loading: boolean
  impersonating: AppUser | null
  impersonationSessionId: string | null
  hashInviteFlow: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: AppUser | null) => void
  setLoading: (loading: boolean) => void
  setHashInviteFlow: (value: boolean) => void
  startImpersonation: (target: AppUser, sessionId: string) => void
  stopImpersonation: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  impersonating: null,
  impersonationSessionId: null,
  hashInviteFlow: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setHashInviteFlow: (value) => set({ hashInviteFlow: value }),
  startImpersonation: (target, sessionId) =>
    set({ impersonating: target, impersonationSessionId: sessionId }),
  stopImpersonation: () =>
    set({ impersonating: null, impersonationSessionId: null }),
  reset: () =>
    set({ session: null, user: null, profile: null, loading: false, impersonating: null, impersonationSessionId: null, hashInviteFlow: false }),
}))
