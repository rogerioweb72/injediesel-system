// supabase/functions/support-upload-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_EXTENSIONS = ['bin', 'hex', 'ori', 'ori2', 'csv', 'txt']
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/plain', 'application/octet-stream']
const MAX_SIZE = 10 * 1024 * 1024

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  let body: { ticketId?: string; filename?: string; mime?: string; size?: number }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS })
  }

  const { ticketId, filename, mime, size } = body
  if (!ticketId || !filename || !mime || !size) {
    return new Response(JSON.stringify({ error: 'ticketId, filename, mime e size são obrigatórios' }), { status: 400, headers: CORS })
  }
  if (size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'Arquivo excede 10 MB' }), { status: 400, headers: CORS })
  }

  const ext = (filename.split('.').pop() ?? 'bin').toLowerCase()
  const mimeOk = ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p))
  const extOk  = ALLOWED_EXTENSIONS.includes(ext)
  if (!mimeOk && !extOk) {
    return new Response(JSON.stringify({ error: 'Tipo de arquivo não permitido' }), { status: 400, headers: CORS })
  }

  // Verificar que usuário tem acesso ao ticket (RLS enforced)
  const { data: ticket } = await callerClient.from('support_tickets').select('id').eq('id', ticketId).single()
  if (!ticket) {
    return new Response(JSON.stringify({ error: 'Ticket não encontrado' }), { status: 404, headers: CORS })
  }

  const r2Key = `support/${ticketId}/${crypto.randomUUID()}.${ext}`

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    },
  })

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_SUPPORT')!,
      Key: r2Key,
      ContentType: mime,
      ContentLength: size,
    }),
    { expiresIn: 600 }
  )

  return new Response(JSON.stringify({ uploadUrl, r2Key }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
