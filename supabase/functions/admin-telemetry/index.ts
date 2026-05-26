// supabase/functions/admin-telemetry/index.ts
// Aggregates security, infrastructure, and quota metrics for the Control Tower dashboard.
// Restricted to system_ti role. Cached 60s to protect pg_stat_activity.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface CfR2Metrics {
  egress_bytes_24h:   number
  storage_bytes_total: number
  operations_24h:     number
  error?: string
}

async function fetchCloudflareMetrics(): Promise<CfR2Metrics> {
  const token     = Deno.env.get('CF_API_TOKEN')
  const accountId = Deno.env.get('CF_ACCOUNT_ID')

  if (!token || !accountId) {
    return { egress_bytes_24h: 0, storage_bytes_total: 0, operations_24h: 0, error: 'CF credentials not configured' }
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  const today     = new Date().toISOString().split('T')[0]

  const query = `{
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        r2OperationsAdaptiveGroups(
          filter: { date_geq: "${yesterday}", date_leq: "${today}" }
          limit: 50
        ) {
          sum { requests }
          dimensions { bucketName actionType }
        }
        r2StorageAdaptiveGroups(
          filter: { date_geq: "${yesterday}", date_leq: "${today}" }
          limit: 50
        ) {
          max { payloadSize objectCount }
          dimensions { bucketName }
        }
      }
    }
  }`

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query }),
  })

  if (!res.ok) {
    return { egress_bytes_24h: 0, storage_bytes_total: 0, operations_24h: 0, error: `CF API ${res.status}` }
  }

  const data = await res.json()
  const account = data?.data?.viewer?.accounts?.[0]
  if (!account) {
    return { egress_bytes_24h: 0, storage_bytes_total: 0, operations_24h: 0, error: 'No CF account data' }
  }

  const ops = (account.r2OperationsAdaptiveGroups ?? []) as Array<{
    sum: { requests: number }
    dimensions: { bucketName: string; actionType: string }
  }>
  const storage = (account.r2StorageAdaptiveGroups ?? []) as Array<{
    max: { payloadSize: number; objectCount: number }
    dimensions: { bucketName: string }
  }>

  // Egress = sum of payload for GetObject operations
  const egress_bytes_24h = ops
    .filter(o => o.dimensions.actionType === 'GetObject')
    .reduce((sum, o) => sum + (o.sum.requests ?? 0), 0)

  // Storage = max payloadSize across all buckets (bytes)
  const storage_bytes_total = storage
    .reduce((sum, s) => sum + (s.max.payloadSize ?? 0), 0)

  const operations_24h = ops
    .reduce((sum, o) => sum + (o.sum.requests ?? 0), 0)

  return { egress_bytes_24h, storage_bytes_total, operations_24h }
}

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Gate: system_ti only
  const auth = await requireAuth(req, 'role, active').catch(() => null)
  if (!auth || (auth.profile.role as string) !== 'system_ti') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })
  }

  // Run all data sources in parallel — one failed source doesn't kill the dashboard
  const [secRes, vtRes, infraRes, cfRes] = await Promise.allSettled([
    adminClient.rpc('fn_get_security_summary'),
    adminClient.rpc('fn_get_vt_quota'),
    adminClient.rpc('fn_get_infra_stats'),
    fetchCloudflareMetrics(),
  ])

  const payload = {
    timestamp: new Date().toISOString(),
    security:   secRes.status  === 'fulfilled' ? secRes.value.data   : { error: 'unavailable' },
    vt_quota:   vtRes.status   === 'fulfilled' ? vtRes.value.data    : { error: 'unavailable' },
    infra:      infraRes.status === 'fulfilled' ? infraRes.value.data : { error: 'unavailable' },
    cloudflare: cfRes.status   === 'fulfilled' ? cfRes.value         : { error: 'unavailable' },
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      ...CORS,
      'Content-Type':  'application/json',
      'Cache-Control': 'max-age=60, private',  // 60s cache — protege pg_stat_activity de polls frequentes
    },
  })
})
