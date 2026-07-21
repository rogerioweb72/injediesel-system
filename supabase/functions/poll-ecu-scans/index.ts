// supabase/functions/poll-ecu-scans/index.ts
// Secrets de bucket: R2_BUCKET_ECU_ORIGINALS + R2_BUCKET_ECU_DELIVERED,
// mesmo esquema do scan-ecu-file/index.ts (R2_BUCKET_ECU como fallback).
//
// Called by Supabase Cron (pg_cron extension) every 2 minutes:
//   SELECT cron.schedule('poll-ecu-scans', '*/2 * * * *',
//     $$SELECT net.http_post(
//       url := '{SUPABASE_URL}/functions/v1/poll-ecu-scans',
//       headers := '{"Authorization": "Bearer {SUPABASE_ANON_KEY}", "x-cron-secret": "{CRON_SECRET}"}',
//       body := '{}'
//     ) $$);
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3'
import { PUBLIC_CORS } from '../_shared/cors.ts'

const VT_KEY  = Deno.env.get('VIRUSTOTAL_API_KEY') ?? ''
const VT_BASE = 'https://www.virustotal.com/api/v3'

// Mesma separação de bucket físico do scan-ecu-file/index.ts — mantém
// consistente pra deletar arquivo infectado do bucket certo.
const LEGACY_BUCKET    = Deno.env.get('R2_BUCKET_ECU') ?? ''
const BUCKET_ORIGINALS = Deno.env.get('R2_BUCKET_ECU_ORIGINALS') || LEGACY_BUCKET
const BUCKET_DELIVERED = Deno.env.get('R2_BUCKET_ECU_DELIVERED') || LEGACY_BUCKET

function resolveBucket(fileType: string | undefined): string {
  return fileType === 'entrega' ? BUCKET_DELIVERED : BUCKET_ORIGINALS
}

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
})

interface PendingFile {
  id:               string
  job_id:           string
  r2_key:           string
  file_name:        string
  file_type:        string
  scan_analysis_id: string
  created_at:       string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: PUBLIC_CORS })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  let clean = 0, infected = 0, stillPending = 0

  const { data: pending } = await adminClient
    .from('ecu_job_files')
    .select('id, job_id, r2_key, file_name, file_type, scan_analysis_id, created_at')
    .eq('scan_status', 'pending')
    .not('scan_analysis_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(20)  // VT free tier: 4 req/min → process in small batches

  // Antes: `if (!pending?.length) return ...` aqui — saía ANTES de chegar no
  // bloco de auto-block abaixo. Sem VIRUSTOTAL_API_KEY, essa query nunca tem
  // resultado (nenhum arquivo ganha scan_analysis_id), então a function
  // sempre voltava aqui e o auto-block virava código morto. Auto-block
  // agora roda sempre, independente de ter algo pra pollar.
  for (const file of (pending ?? []) as PendingFile[]) {
    try {
      const res = await fetch(`${VT_BASE}/analyses/${file.scan_analysis_id}`, {
        headers: { 'x-apikey': VT_KEY },
      })

      // 429: rate limited — break entire batch, retry next cron cycle
      if (res.status === 429) break
      if (!res.ok) { stillPending++; continue }

      const data = await res.json()
      const vtStatus = data?.data?.attributes?.status
      const stats    = data?.data?.attributes?.stats

      if (vtStatus !== 'completed') { stillPending++; continue }

      const isMalicious = stats?.malicious > 0
      const newStatus   = isMalicious ? 'infected' : 'clean'

      if (isMalicious) {
        await s3.send(new DeleteObjectCommand({ Bucket: resolveBucket(file.file_type), Key: file.r2_key }))
        await adminClient.from('audit_events').insert({
          actor_id: null,
          action:   'malware_detected',
          payload: {
            file_id:      file.id,
            job_id:       file.job_id,
            r2_key:       file.r2_key,
            file_name:    file.file_name,
            analysis_id:  file.scan_analysis_id,
            vt_stats:     stats,
          },
        })
        infected++
      } else {
        clean++
      }

      await adminClient.from('ecu_job_files').update({
        scan_status:     newStatus,
        scan_checked_at: new Date().toISOString(),
      }).eq('id', file.id)

      // VT free tier: 4 req/min. Small delay between requests.
      await new Promise(r => setTimeout(r, 250))
    } catch {
      stillPending++
    }
  }

  // Block files stuck pending >1h with no analysis_id (webhook never fired or was rejected).
  // 'blocked' prevents download and surfaces in the Control Tower scan_error count.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await adminClient
    .from('ecu_job_files')
    .update({ scan_status: 'blocked', scan_checked_at: new Date().toISOString() })
    .eq('scan_status', 'pending')
    .is('scan_analysis_id', null)
    .lt('created_at', oneHourAgo)

  return new Response(JSON.stringify({ clean, infected, stillPending }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
