import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'
import type { TicketPriority, TicketStatus, TicketCategory, UserRole } from '@/types/app'

export interface SupportMessage {
  id: string
  ticket_id: string
  author_id: string | null
  body: string
  is_internal: boolean
  attachment_r2_key: string | null
  attachment_filename: string | null
  attachment_mime: string | null
  attachment_size_bytes: number | null
  created_at: string
  profiles?: { name: string } | null
}

export interface SupportTicket {
  id: string
  protocol: string
  title: string
  customer_id: string | null
  unit_id: string | null
  ecu_job_id: string | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assigned_to: string | null
  sla_due_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: { name: string } | null
  requester?: {
    name: string
    role: UserRole
    unit_id: string | null
    franchise_units?: { name: string } | null
  } | null
  support_messages?: SupportMessage[]
}

interface ListFilter {
  q?: string
  status?: TicketStatus | ''
  unitId?: string
  page?: number
  pageSize?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function useSupportTickets({ q, status, unitId, page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['support-tickets', q, status, unitId, page, pageSize],
    queryFn: async () => {
      let query = sb()
        .from('support_tickets')
        .select('*, customers(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (q) query = query.ilike('protocol', `%${q}%`)
      if (status) query = query.eq('status', status)
      if (unitId) query = query.eq('unit_id', unitId)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as SupportTicket[], total: (count as number) ?? 0 }
    },
  })
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: ['support-ticket', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('support_tickets')
        .select(`
  *,
  customers(name),
  requester:profiles!support_tickets_created_by_fkey(name, role, unit_id, franchise_units(name)),
  support_messages(*, profiles(name))
`)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as SupportTicket
    },
  })
}

interface CreateTicketPayload {
  title: string
  customer_id?: string | null
  unit_id?: string | null
  ecu_job_id?: string | null
  category: TicketCategory
  priority: TicketPriority
  body: string
}

export function useCreateSupportTicket() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ body, ...fields }: CreateTicketPayload) => {
      const { data: ticket, error } = await sb()
        .from('support_tickets')
        .insert({ ...fields, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error

      const { error: msgErr } = await sb()
        .from('support_messages')
        .insert({ ticket_id: ticket.id, author_id: user?.id ?? null, body })
      if (msgErr) throw msgErr

      return ticket as SupportTicket
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
      log({ entity: 'support_ticket', entityId: ticket.id, action: 'created', metadata: { protocol: ticket.protocol } })
    },
  })
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { error } = await sb()
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { id, status }
    },
    onSuccess: ({ id, status }) => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
      qc.invalidateQueries({ queryKey: ['support-ticket', id] })
      log({ entity: 'support_ticket', entityId: id, action: 'updated', metadata: { status } })
    },
  })
}

export function useAddMessage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const { error } = await sb()
        .from('support_messages')
        .insert({ ticket_id: ticketId, author_id: user?.id ?? null, body })
      if (error) throw error
    },
    onSuccess: (_data, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
    },
  })
}

export function useReopenTicket() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb()
        .from('support_tickets')
        .update({ status: 'aberto', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
      qc.invalidateQueries({ queryKey: ['support-ticket', id] })
      log({ entity: 'support_ticket', entityId: id, action: 'updated', metadata: { status: 'aberto', action: 'reaberto' } })
    },
  })
}

export function useAssignTicket() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string | null }) => {
      const { error } = await sb()
        .from('support_tickets')
        .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { id, agentId }
    },
    onSuccess: ({ id, agentId }) => {
      qc.invalidateQueries({ queryKey: ['support-ticket', id] })
      log({ entity: 'support_ticket', entityId: id, action: 'updated', metadata: { assigned_to: agentId } })
    },
  })
}

export function useMarkTicketSeen(ticketId: string) {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      if (!ticketId || !user?.id) return
      const { error } = await sb()
        .from('support_ticket_views')
        .upsert({ ticket_id: ticketId, user_id: user.id, last_seen_at: new Date().toISOString() })
      if (error) throw error
    },
  })
}

export function useMatrixAgents(enabled = true) {
  return useQuery({
    queryKey: ['support-agents'],
    enabled,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('profiles')
        .select('id, name')
        .in('role', ['support_agent', 'operations_admin', 'company_admin'])
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
    staleTime: 300_000,
  })
}

export function useUnreadSupportCount() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isMatrix = profile?.role && !['franchise_manager', 'unit_operator'].includes(profile.role)

  return useQuery({
    queryKey: ['support-unread', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('support_ticket_views')
        .select('ticket_id, last_seen_at')
        .eq('user_id', user!.id)

      if (error) throw error

      const views = (data ?? []) as { ticket_id: string; last_seen_at: string }[]
      if (views.length === 0) return 0

      let total = 0
      for (const view of views) {
        let q = sb()
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .eq('ticket_id', view.ticket_id)
          .gt('created_at', view.last_seen_at)

        if (!isMatrix) q = q.eq('is_internal', false)

        const { count } = await q
        if (count && count > 0) total++
      }

      return total
    },
  })
}
