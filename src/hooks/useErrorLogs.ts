import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface ErrorLog {
  id: string
  created_at: string
  source: 'frontend' | 'edge' | 'db'
  level: 'error' | 'warn' | 'fatal'
  message: string
  stack: string | null
  route: string | null
  user_id: string | null
  user_role: string | null
  unit_id: string | null
  user_agent: string | null
  context: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
}

interface Filter {
  level?: string
  source?: string
  resolved?: 'all' | 'open' | 'resolved'
  q?: string
  page?: number
  pageSize?: number
}

export function useErrorLogs({ level, source, resolved = 'open', q = '', page = 0, pageSize = 50 }: Filter = {}) {
  return useQuery({
    queryKey: ['error-logs', level, source, resolved, q, page, pageSize],
    queryFn: async () => {
      let query = sb().from('error_logs').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (level) query = query.eq('level', level)
      if (source) query = query.eq('source', source)
      if (resolved === 'open') query = query.eq('resolved', false)
      else if (resolved === 'resolved') query = query.eq('resolved', true)
      if (q) {
        const safe = q.replace(/[,()]/g, ' ').trim()
        query = query.or(`message.ilike.%${safe}%,route.ilike.%${safe}%,user_role.ilike.%${safe}%`)
      }
      const { data, error, count } = await query
      if (error) throw error
      return { data: (data ?? []) as ErrorLog[], total: (count as number) ?? 0 }
    },
    refetchInterval: 30_000,
  })
}

// Contadores rápidos para o topo do painel.
export function useErrorLogStats() {
  return useQuery({
    queryKey: ['error-logs-stats'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [openRes, fatalRes, day] = await Promise.all([
        sb().from('error_logs').select('id', { count: 'exact', head: true }).eq('resolved', false),
        sb().from('error_logs').select('id', { count: 'exact', head: true }).eq('level', 'fatal').eq('resolved', false),
        sb().from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since),
      ])
      return {
        open: openRes.count ?? 0,
        fatal: fatalRes.count ?? 0,
        last24h: day.count ?? 0,
      }
    },
    refetchInterval: 30_000,
  })
}

export function useResolveError() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await sb().from('error_logs').update({
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? (user?.id ?? null) : null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['error-logs'] })
      qc.invalidateQueries({ queryKey: ['error-logs-stats'] })
    },
  })
}
