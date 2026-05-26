import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

export interface CriticalEvent {
  action: string
  total: number
  actor_id: string | null
  last_seen: string
}

export interface TelemetryData {
  timestamp: string
  security: {
    login_failures_24h: number
    rls_violations_24h: number
    malware_blocked_24h: number
    critical_events: CriticalEvent[]
    warning?: string
    error?: string
  }
  vt_quota: {
    calls_24h: number
    daily_limit: number
    pct_daily_quota: number
    calls_last_minute: number
    rate_limit_per_minute: number
    scan_errors_24h: number
    infected_total: number
    pending_total: number
    upgrade_recommended: boolean
    error?: string
  }
  infra: {
    db_connections: Array<{ state: string; count: number }>
    active_sessions: number
    franchise_units: number
    active_users: number
    storage: Array<{ bucket: string; files: number; used_bytes: number; infected?: number; pending?: number }>
    edge_errors_24h: number
    error?: string
  }
  cloudflare: {
    egress_bytes_24h: number
    storage_bytes_total: number
    operations_24h: number
    error?: string
  }
}

export function useAdminTelemetry() {
  const session = useAuthStore((s) => s.session)

  return useQuery<TelemetryData>({
    queryKey: ['admin-telemetry'],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-telemetry`,
        { headers: { Authorization: `Bearer ${session!.access_token}` } },
      )
      if (!res.ok) throw new Error(`Telemetry ${res.status}`)
      return res.json()
    },
    enabled: !!session,
    refetchInterval: 60_000,
    staleTime: 55_000,
  })
}
