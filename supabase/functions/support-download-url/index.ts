// supabase/functions/support-download-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAuth(req).catch(() => null)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const { callerClient } = auth

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

  // SECURITY (VULN-03): validar que r2Key pertence a uma mensagem deste ticket.
  // Sem esta checagem, um usuário com acesso ao ticket A poderia baixar
  // arquivos do ticket B passando r2Key arbitrário.
  const { data: attachment } = await callerClient
    .from('support_messages')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('attachment_r2_key', r2Key)
    .single()
  if (!attachment) {
    return new Response(JSON.stringify({ error: 'Arquivo não pertence a este ticket' }), { status: 403, headers: CORS })
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
