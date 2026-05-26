// supabase/functions/scan-ecu-file/index.ts
// Triggered by Supabase Database Webhook on INSERT into ecu_job_files.
// Setup: Dashboard → Database → Webhooks → New Webhook
//   Table: ecu_job_files | Event: INSERT
//   URL: {SUPABASE_URL}/functions/v1/scan-ecu-file
//   Secret: set WEBHOOK_SECRET env var and configure "HTTP Request Secret" in webhook settings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3'
import { PUBLIC_CORS } from '../_shared/cors.ts'

const VT_KEY = Deno.env.get('VIRUSTOTAL_API_KEY') ?? ''
const VT_BASE = 'https://www.virustotal.com/api/v3'
const BUCKET  = Deno.env.get('R2_BUCKET_ECU')!

// ── Policy constants ───────────────────────────────────────────────────────────
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB — ECU files are never this large in practice

const ALLOWED_EXTENSIONS = new Set(['.bin', '.ori', '.kfg', '.bck', '.eprom', '.zip', '.rar'])

// Max files a single job may upload per 24 hours before rate-limiting kicks in
const RATE_LIMIT_PER_JOB_24H = 20

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

// ── Helpers ────────────────────────────────────────────────────────────────────

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function downloadFromR2(r2Key: string): Promise<Uint8Array> {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: r2Key }))
  if (!Body) throw new Error('Empty R2 body')
  const chunks: Uint8Array[] = []
  for await (const chunk of Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length }
  return merged
}

async function deleteFromR2(r2Key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }))
}

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

// Block known executable/script magic bytes regardless of extension.
// ECU firmware binaries have no standard magic — the whitelist is the primary check.
function hasDangerousHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) return true       // MZ → PE (.exe/.dll/.scr)
  if (bytes.length < 4) return false
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) return true // ELF
  const w = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0
  if (w === 0xFEEDFACE || w === 0xCEFAEDFE || w === 0xFEEDFACF || w === 0xCFFAEDFE) return true // Mach-O
  if (bytes[0] === 0x23 && bytes[1] === 0x21) return true        // #! shebang
  return false
}

async function vtCheckByHash(hash: string): Promise<'clean' | 'infected' | 'unknown'> {
  const res = await fetch(`${VT_BASE}/files/${hash}`, {
    headers: { 'x-apikey': VT_KEY },
  })
  if (res.status === 404) return 'unknown'
  if (res.status === 429) throw new Error('VT_RATE_LIMITED')
  if (!res.ok) throw new Error(`VT hash check failed: ${res.status}`)
  const data = await res.json()
  const stats = data?.data?.attributes?.last_analysis_stats
  if (!stats) return 'unknown'
  return stats.malicious > 0 ? 'infected' : 'clean'
}

async function vtSubmitFile(fileBytes: Uint8Array, fileName: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([fileBytes]), fileName)
  const res = await fetch(`${VT_BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': VT_KEY },
    body: form,
  })
  if (res.status === 429) throw new Error('VT_RATE_LIMITED')
  if (!res.ok) throw new Error(`VT submit failed: ${res.status}`)
  const data = await res.json()
  return data.data.id as string
}

async function logAudit(action: string, payload: Record<string, unknown>) {
  await adminClient.from('audit_events').insert({ actor_id: null, action, payload }).catch(() => null)
}

async function blockFile(
  fileId: string,
  r2Key: string,
  reason: string,
  extra: Record<string, unknown> = {},
) {
  await deleteFromR2(r2Key).catch(() => null)
  await adminClient.from('ecu_job_files').update({
    scan_status:     'blocked',
    scan_checked_at: new Date().toISOString(),
  }).eq('id', fileId)
  await logAudit('scan_error', { file_id: fileId, r2_key: r2Key, reason, ...extra })
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: PUBLIC_CORS })

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret) {
    const sig = req.headers.get('x-supabase-signature') ?? req.headers.get('authorization') ?? ''
    if (!sig.includes(webhookSecret)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
  }

  let payload: {
    record?: {
      id: string
      job_id: string
      r2_key: string
      file_name: string
      size_bytes: number
    }
  }
  try { payload = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
  }

  const record = payload.record
  if (!record?.id || !record.r2_key) {
    return new Response(JSON.stringify({ error: 'Missing record fields' }), { status: 400 })
  }

  // ── 1. Extension whitelist ─────────────────────────────────────────────────
  const ext = getExtension(record.file_name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    await blockFile(record.id, record.r2_key, 'blocked_extension', { ext, file_name: record.file_name })
    return new Response(JSON.stringify({ status: 'blocked', reason: 'extension_not_allowed' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Size limit (before download) ───────────────────────────────────────
  if ((record.size_bytes ?? 0) > MAX_BYTES) {
    await blockFile(record.id, record.r2_key, 'blocked_size', { size_bytes: record.size_bytes })
    return new Response(JSON.stringify({ status: 'blocked', reason: 'file_too_large' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Upload rate limit per job per 24h ──────────────────────────────────
  const since24h = new Date(Date.now() - 86_400_000).toISOString()
  const { count: jobFileCount } = await adminClient
    .from('ecu_job_files')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', record.job_id)
    .gt('created_at', since24h)

  if ((jobFileCount ?? 0) > RATE_LIMIT_PER_JOB_24H) {
    await blockFile(record.id, record.r2_key, 'rate_limited', { job_id: record.job_id, count: jobFileCount })
    return new Response(JSON.stringify({ status: 'blocked', reason: 'rate_limit_exceeded' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── 4. Download from R2 ──────────────────────────────────────────────────
    const fileBytes = await downloadFromR2(record.r2_key)

    // ── 5. Magic bytes check ─────────────────────────────────────────────────
    if (hasDangerousHeader(fileBytes)) {
      await blockFile(record.id, record.r2_key, 'blocked_magic_bytes', { file_name: record.file_name })
      return new Response(JSON.stringify({ status: 'blocked', reason: 'dangerous_file_header' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── 6. SHA-256 ───────────────────────────────────────────────────────────
    const hash = await sha256Hex(fileBytes)

    // ── 7. Hash deduplication: reuse known verdict, skip VT quota ────────────
    const { data: knownFile } = await adminClient
      .from('ecu_job_files')
      .select('id, scan_status')
      .eq('sha256_hex', hash)
      .in('scan_status', ['clean', 'infected'])
      .neq('id', record.id)
      .limit(1)
      .maybeSingle()

    if (knownFile) {
      if (knownFile.scan_status === 'infected') {
        await deleteFromR2(record.r2_key)
        await adminClient.from('ecu_job_files').update({
          scan_status:     'infected',
          sha256_hex:      hash,
          scan_checked_at: new Date().toISOString(),
        }).eq('id', record.id)
        await logAudit('malware_detected', {
          file_id:  record.id,
          job_id:   record.job_id,
          r2_key:   record.r2_key,
          file_name: record.file_name,
          hash,
          source:   'hash_dedup',
        })
        return new Response(JSON.stringify({ status: 'infected', source: 'hash_dedup' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // Known clean — fast path, no VT call
      await adminClient.from('ecu_job_files').update({
        scan_status:     'clean',
        sha256_hex:      hash,
        scan_checked_at: new Date().toISOString(),
      }).eq('id', record.id)
      return new Response(JSON.stringify({ status: 'clean', source: 'hash_dedup' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── 8. VirusTotal scan ───────────────────────────────────────────────────
    let status: 'clean' | 'infected' | 'pending' = 'pending'
    let analysisId: string | null = null

    const vtResult = await vtCheckByHash(hash)

    if (vtResult === 'clean') {
      status = 'clean'
    } else if (vtResult === 'infected') {
      status = 'infected'
    } else {
      analysisId = await vtSubmitFile(fileBytes, record.file_name)
      status = 'pending'
    }

    if (status === 'infected') {
      await deleteFromR2(record.r2_key)
      await logAudit('malware_detected', {
        file_id:   record.id,
        job_id:    record.job_id,
        r2_key:    record.r2_key,
        file_name: record.file_name,
        hash,
      })
    }

    await adminClient.from('ecu_job_files').update({
      scan_status:      status,
      sha256_hex:       hash,
      scan_analysis_id: analysisId,
      scan_checked_at:  new Date().toISOString(),
    }).eq('id', record.id)

    return new Response(JSON.stringify({ status, analysisId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const isRateLimit = String(err).includes('VT_RATE_LIMITED')
    if (!isRateLimit) {
      await logAudit('scan_error', { file_id: record?.id, error: String(err) })
    }
    return new Response(
      JSON.stringify({ error: String(err), retryable: true }),
      { status: isRateLimit ? 429 : 500 },
    )
  }
})
