import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useSignOut() {
  const signOut = useCallback(() => supabase.auth.signOut(), [])
  return { signOut }
}
