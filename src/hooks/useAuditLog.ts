import { useQuery } from '@tanstack/react-query'
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
    // audit_logs só aceita INSERT via service_role (trigger/Edge Function)
    // frontend loga silenciosamente para não quebrar o fluxo
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('audit_logs').insert({
        actor_id: user.id,
        entity,
        entity_id: entityId ?? null,
        action,
        metadata,
      })
    } catch {
      // silencioso — audit é best-effort do frontend
    }
  }

  return { log }
}

// ─── Types & constants for the audit page ─────────────────────────────────────

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  actor_name: string | null
  entity: string
  entity_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export const ENTITY_LABELS: Record<string, string> = {
  ecu_job:          'Arquivo ECU',
  financial_entry:  'Lançamento Financeiro',
  monthly_closing:  'Fechamento Mensal',
  profile:          'Usuário',
  pos_sale:         'Venda PDV',
  order:            'Pedido',
  franchise_unit:   'Unidade Franqueada',
  product:          'Produto',
  customer:         'Cliente',
  vehicle:          'Veículo',
  support_ticket:   'Ticket de Suporte',
  company_settings: 'Configurações',
  commission_entry: 'Comissão',
}

export const ACTION_LABELS: Record<string, string> = {
  created:            'Criou',
  updated:            'Editou',
  deleted:            'Excluiu',
  status_changed:     'Alterou status',
  matrix_price_set:   'Definiu preço matriz',
  assigned:           'Atribuiu técnico',
  file_downloaded:    'Baixou arquivo',
  sent_to_finance:    'Enviou para financeiro',
  payment_registered: 'Registrou pagamento',
}

export interface AuditLogsFilter {
  entity?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export function useAuditLogs({
  entity,
  actorId,
  dateFrom,
  dateTo,
  page = 0,
  pageSize = 50,
}: AuditLogsFilter = {}) {
  return useQuery({
    queryKey: ['audit-logs', entity, actorId, dateFrom, dateTo, page],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('audit_logs')
        .select('id, actor_id, entity, entity_id, action, metadata, created_at, profiles(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (entity)   q = q.eq('entity', entity)
      if (actorId)  q = q.eq('actor_id', actorId)
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59')

      const { data, error, count } = await q
      if (error) throw error

      type RawRow = AuditLogEntry & { profiles?: { name: string } | null }
      const rows: AuditLogEntry[] = (data as RawRow[] ?? []).map((r) => ({
        id:         r.id,
        actor_id:   r.actor_id,
        actor_name: r.profiles?.name ?? null,
        entity:     r.entity,
        entity_id:  r.entity_id,
        action:     r.action,
        metadata:   r.metadata ?? {},
        created_at: r.created_at,
      }))

      return { rows, total: count ?? 0 }
    },
  })
}
