import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface AuditPayload {
  entity: string
  entityId?: string
  action: string
  metadata?: Record<string, unknown>
}

export function useAuditLog() {
  const user = useAuthStore((s) => s.user)

  async function log({ entity, entityId, action, metadata = {} }: AuditPayload) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_logs').insert({
      actor_id: user.id,
      entity,
      entity_id: entityId ?? null,
      action,
      metadata,
    })
  }

  return { log }
}
