import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { AppUser } from '@/types/app'

const BASE = import.meta.env.VITE_SUPABASE_URL as string
const KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export type SyncResult =
  | 'ok'           // profile inalterado
  | 'role_changed' // role atualizada no store — UI reage via Zustand
  | 'deactivated'  // active=false → logout forçado
  | 'not_found'    // profile deletado → logout forçado
  | 'no_session'   // sem sessão ativa — nada a fazer

let _syncing = false

/**
 * Busca o profile atualizado do banco, compara com o store Zustand e reage:
 * - active=false ou profile deletado → signOut + reset
 * - role mudou → atualiza store (RoleGuard/router reagem via Zustand)
 * - inalterado → no-op
 *
 * Usa debounce interno para evitar múltiplas chamadas simultâneas
 * (ex: vários requests falhando ao mesmo tempo).
 */
export async function syncProfile(): Promise<SyncResult> {
  if (_syncing) return 'ok'
  _syncing = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 'no_session'

    const res = await fetch(
      `${BASE}/rest/v1/profiles?id=eq.${session.user.id}&select=*&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}` } },
    )

    // Se o próprio fetch do profile falhou (rede, 5xx) não forçamos logout
    if (!res.ok) return 'ok'

    const rows = await res.json()
    const fresh: AppUser | null = Array.isArray(rows) && rows[0] ? rows[0] : null

    if (!fresh) {
      await supabase.auth.signOut()
      useAuthStore.getState().reset()
      return 'not_found'
    }

    if (!fresh.active) {
      await supabase.auth.signOut()
      useAuthStore.getState().reset()
      return 'deactivated'
    }

    const current = useAuthStore.getState().profile
    const roleChanged = current?.role !== fresh.role

    // Sempre atualiza — campos como commission_rate, permissions podem ter mudado
    useAuthStore.getState().setProfile(fresh)

    return roleChanged ? 'role_changed' : 'ok'
  } catch {
    // Erro de rede → não penaliza usuário com logout
    return 'ok'
  } finally {
    _syncing = false
  }
}
