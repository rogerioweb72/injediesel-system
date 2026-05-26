// src/hooks/useImpersonation.ts
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useProfile } from '@/hooks/useProfile'
import type { AppUser } from '@/types/app'

// ── Start impersonation ────────────────────────────────────────────────────
export function useStartImpersonation() {
  const { isSystemTI } = useProfile()
  const { startImpersonation } = useAuthStore()

  return useMutation({
    mutationFn: async ({ targetId, reason }: { targetId: string; reason?: string }) => {
      if (!isSystemTI()) throw new Error('Apenas usuários system_ti podem usar impersonation.')

      // Fetch target profile
      const { data: target, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, role, active, permission_profile_id, unit_id')
        .eq('id', targetId)
        .single()
      if (profileErr) throw profileErr

      // Record impersonation session
      const actor_id = (await supabase.auth.getUser()).data.user?.id
      if (!actor_id) throw new Error('Usuário não autenticado.')
      const { data: session, error: sessionErr } = await supabase
        .from('impersonation_sessions')
        .insert({ actor_id, target_id: targetId, reason: reason ?? null })
        .select('id')
        .single()
      if (sessionErr) throw sessionErr

      return { target: target as unknown as AppUser, sessionId: session.id }
    },
    onSuccess: ({ target, sessionId }) => {
      startImpersonation(target, sessionId)
    },
  })
}

// ── Stop impersonation ─────────────────────────────────────────────────────
export function useStopImpersonation() {
  const { impersonationSessionId, stopImpersonation } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!impersonationSessionId) return
      const { error } = await supabase
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', impersonationSessionId)
      if (error) throw error
    },
    onSuccess: () => stopImpersonation(),
  })
}

// ── List impersonation history ─────────────────────────────────────────────
export function useImpersonationHistory() {
  return useQuery({
    queryKey: ['impersonation-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .select(`
          id, reason, started_at, ended_at,
          target:profiles!impersonation_sessions_target_id_fkey(id, name, role)
        `)
        .order('started_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })
}

// ── List all users available for impersonation ────────────────────────────
export function useImpersonationTargets() {
  return useQuery({
    queryKey: ['impersonation-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, active, unit_id')
        .neq('role', 'system_ti' as never)
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as Array<Pick<AppUser, 'id' | 'name' | 'role' | 'active'> & { unit_id: string | null }>
    },
  })
}
