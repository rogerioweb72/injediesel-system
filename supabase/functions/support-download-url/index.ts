// supabase/functions/support-download-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  let body: { r2Key?: string; ticketId?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS })
  }

  const { r2Key, ticketId } = body
  if (!r2Key || !ticketId) {
    return new Response(JSON.stringify({ error: 'r2Key e ticketId são obrigatórios' }), { status: 400, headers: CORS })
  }

  // Verificar acesso ao ticket via RLS
  const { data: ticket, error: ticketErr } = await callerClient.from('support_tickets').select('id').eq('id', ticketId).single()
  if (ticketErr || !ticket) {
    return new Response(JSON.stringify({ error: 'Ticket não encontrado' }), { status: 404, headers: CORS })
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    },
  })

  let downloadUrl: string
  try {
    downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_SUPPORT')!,
        Key: r2Key,
      }),
      { expiresIn: 300 }
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Erro ao gerar URL de download' }), { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ downloadUrl }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
