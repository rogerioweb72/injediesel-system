// supabase/functions/ecu-download-url/index.ts
// Issues a short-lived R2 presigned URL ONLY after verifying:
//   1. User is authenticated + active
//   2. User has RLS-level access to the job that owns this file
//   3. scan_status = 'clean' (backend enforcement — UI gate is not enough)
//   4. sha256_hex is set (scan fully completed, not just started)
// Download is logged to audit_events for traceability.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

const DOWNLOAD_EXPIRY_SECONDS = 300 // 5 min — enough to initiate, too short to share

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Auth + active check ────────────────────────────────────────────────────
  const auth = await requireAuth(req).catch(() => null)
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }
  const { callerClient, user } = auth

  // ── Parse request ──────────────────────────────────────────────────────────
  let body: { fileId?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS })
  }
  const { fileId } = body
  if (!fileId) {
    return new Response(JSON.stringify({ error: 'fileId é obrigatório' }), { status: 400, headers: CORS })
  }

  // ── Tenant + scan_status gate (callerClient enforces RLS) ─────────────────
  // If user doesn't own the job, RLS returns no row → 404 (IDOR-safe).
  // scan_status and sha256_hex are checked here, not in the UI.
  const { data: file, error: fileErr } = await callerClient
    .from('ecu_job_files')
    .select('id, r2_key, file_name, file_type, scan_status, sha256_hex')
    .eq('id', fileId)
    .single()

  if (fileErr || !file) {
    return new Response(JSON.stringify({ error: 'Arquivo não encontrado' }), { status: 404, headers: CORS })
  }

  if (file.scan_status === 'infected' || file.scan_status === 'blocked') {
    return new Response(
      JSON.stringify({ error: 'Arquivo bloqueado — download não permitido' }),
      { status: 403, headers: CORS },
    )
  }

  if (file.scan_status === 'pending' || !file.sha256_hex) {
    return new Response(
      JSON.stringify({ error: 'Análise de segurança ainda em andamento. Aguarde.' }),
      { status: 409, headers: CORS },
    )
  }

  // scan_status must be 'clean' at this point
  if (file.scan_status !== 'clean') {
    return new Response(
      JSON.stringify({ error: 'Arquivo não aprovado para download' }),
      { status: 403, headers: CORS },
    )
  }

  // ── Generate short-lived presigned URL ─────────────────────────────────────
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    },
  })

  let downloadUrl: string
  try {
    downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: Deno.env.get('R2_BUCKET_ECU')!, Key: file.r2_key }),
      { expiresIn: DOWNLOAD_EXPIRY_SECONDS },
    )
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar URL de download' }),
      { status: 500, headers: CORS },
    )
  }

  // ── Audit log (fire-and-forget, does not block response) ──────────────────
  adminClient.from('audit_events').insert({
    actor_id: user.id,
    action:   'ecu_file_downloaded',
    payload: {
      file_id:    file.id,
      r2_key:     file.r2_key,
      file_name:  file.file_name,
      sha256_hex: file.sha256_hex,
    },
  }).then(undefined, (err) => console.error('audit log failed:', err))

  return new Response(
    JSON.stringify({ downloadUrl, expiresIn: DOWNLOAD_EXPIRY_SECONDS }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
