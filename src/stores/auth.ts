import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { AppUser } from '@/types/app'

interface AuthState {
  session: Session | null
  user: User | null
  profile: AppUser | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: AppUser | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ session: null, user: null, profile: null, loading: false }),
}))
