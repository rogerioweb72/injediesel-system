// supabase/functions/support-upload-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

const MAX_SIZE = 100 * 1024 * 1024

// SECURITY (VULN-07, atualizado 04/08/2026): era whitelist de extensão+MIME.
// Decisão de produto: chat de suporte precisa aceitar arquivo ECU de
// qualquer extensão (o mesmo motivo do ecuFileTypes.ts). Whitelist virou
// BLOCKLIST — mitigação continua ativa pro que importa (executável/script),
// só deixou de restringir formato de arquivo legítimo desconhecido.
// Sync manual com src/components/support/SupportChatPanel.tsx
// (BLOCKED_EXTENSIONS) — runtime Deno separado, não dá pra importar de lá.
const BLOCKED_EXTENSIONS = ['html', 'htm', 'svg', 'js', 'mjs', 'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'jar', 'app', 'msi', 'com', 'scr', 'vbs']

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAuth(req).catch(() => null)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const { callerClient } = auth

  let body: { ticketId?: string; filename?: string; mime?: string; size?: number }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS })
  }

  const { ticketId, filename, mime, size } = body
  if (!ticketId || !filename || !mime || !size) {
    return new Response(JSON.stringify({ error: 'ticketId, filename, mime e size são obrigatórios' }), { status: 400, headers: CORS })
  }
  if (size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'Arquivo excede 100 MB' }), { status: 400, headers: CORS })
  }

  const ext = (filename.split('.').pop() ?? 'bin').toLowerCase()
  if (BLOCKED_EXTENSIONS.includes(ext)) {
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

  let uploadUrl: string
  try {
    uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_SUPPORT')!,
        Key: r2Key,
        ContentType: mime,
        ContentLength: size,
      }),
      { expiresIn: 600 }
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Erro ao gerar URL de upload' }), { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ uploadUrl, r2Key }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
