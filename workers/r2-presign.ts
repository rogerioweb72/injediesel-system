export interface Env {
  ECU_ORIGINALS:  R2Bucket
  ECU_DELIVERED:  R2Bucket
  MKT_MATERIALS:  R2Bucket
  FIRMWARE:       R2Bucket
  SUPABASE_URL:   string
  SUPABASE_ANON_KEY: string
  // wrangler secret put ALLOWED_ORIGIN --env production
  ALLOWED_ORIGIN?: string
}

// -----------------------------------------------------------------
// CORS — lock to configured origin in production; '*' only in dev
// -----------------------------------------------------------------
function corsHeaders(env: Env): Record<string, string> {
  const origin = env.ALLOWED_ORIGIN ?? '*'
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

// -----------------------------------------------------------------
// Auth: verify Supabase JWT and return user id
// -----------------------------------------------------------------
async function verifyToken(
  authHeader: string | null,
  env: Env
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    })
    if (!res.ok) return null
    const user = await res.json<{ id?: string }>()
    return user?.id ?? null
  } catch {
    return null
  }
}

// -----------------------------------------------------------------
// Role check: query profiles table for matrix admin roles
// -----------------------------------------------------------------
const MATRIX_ADMIN_ROLES = ['company_admin', 'operations_admin']

async function isMatrixAdmin(userId: string, env: Env): Promise<boolean> {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) return false
    const rows = await res.json<Array<{ role: string }>>()
    return rows.length > 0 && MATRIX_ADMIN_ROLES.includes(rows[0].role)
  } catch {
    return false
  }
}

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
}

function getEcuBucket(env: Env, name: string): R2Bucket | null {
  if (name === 'originals') return env.ECU_ORIGINALS
  if (name === 'delivered')  return env.ECU_DELIVERED
  return null
}

// -----------------------------------------------------------------
// ECU Upload — requires authenticated user (any role)
// Key is scoped to the user's own folder, preventing cross-user access
// -----------------------------------------------------------------
async function handleEcuUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const bucketName = formData.get('bucket') as string
  const jobId      = formData.get('jobId')  as string | null
  const file       = formData.get('file')   as File | null

  if (!bucketName || !file) return json({ error: 'Campos obrigatórios: bucket, file' }, 400, env)

  const bucket = getEcuBucket(env, bucketName)
  if (!bucket) return json({ error: 'Bucket inválido' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const prefix   = jobId ? `jobs/${jobId}/${bucketName}` : `uploads/${userId}`
  const key      = `${prefix}/${Date.now()}-${safeName}`

  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId },
  })

  return json({ key }, 200, env)
}

// -----------------------------------------------------------------
// ECU Download — requires authenticated user; key must start with
// user's own scope OR jobs/ (shared between matrix and franchisee)
// -----------------------------------------------------------------
async function handleEcuDownload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const body   = await request.json<{ r2Key: string; bucket: string }>()
  const bucket = getEcuBucket(env, body.bucket ?? 'originals')
  if (!bucket) return json({ error: 'Bucket inválido' }, 400, env)

  // Ownership check: key must belong to the user's scope or a jobs/ path
  const key = body.r2Key ?? ''
  const ownedByUser = key.startsWith(`uploads/${userId}/`) || key.startsWith('jobs/')
  if (!ownedByUser) return json({ error: 'Forbidden' }, 403, env)

  const object = await bucket.get(key)
  if (!object) return json({ error: 'Arquivo não encontrado' }, 404, env)

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
      ...corsHeaders(env),
    },
  })
}

// -----------------------------------------------------------------
// MKT Upload — matrix admin only (company_admin | operations_admin)
// -----------------------------------------------------------------
async function handleMktUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden: somente administradores da matriz podem fazer upload' }, 403, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const category = formData.get('category') as string
  const file     = formData.get('file')     as File | null

  const validCategories = ['logo', 'impressos', 'social_media', 'identidade_visual']
  if (!category || !validCategories.includes(category)) {
    return json({ error: 'Categoria inválida' }, 400, env)
  }
  if (!file) return json({ error: 'Arquivo obrigatório' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const key      = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  await env.MKT_MATERIALS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId, category },
  })

  return json({ key, size: file.size, type: file.type }, 200, env)
}

// -----------------------------------------------------------------
// MKT Download — any authenticated user (franchisee or matrix)
// -----------------------------------------------------------------
async function handleMktDownload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const body = await request.json<{ r2Key: string; fileName?: string }>()
  if (!body.r2Key) return json({ error: 'r2Key obrigatório' }, 400, env)

  const object = await env.MKT_MATERIALS.get(body.r2Key)
  if (!object) return json({ error: 'Arquivo não encontrado' }, 404, env)

  const fileName = body.fileName ?? body.r2Key.split('/').pop() ?? 'download'

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFileName(fileName)}"`,
      ...corsHeaders(env),
    },
  })
}

// -----------------------------------------------------------------
// MKT Delete — matrix admin only
// -----------------------------------------------------------------
async function handleMktDelete(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden' }, 403, env)

  const body = await request.json<{ r2Key: string }>()
  if (!body.r2Key) return json({ error: 'r2Key obrigatório' }, 400, env)

  await env.MKT_MATERIALS.delete(body.r2Key)
  return json({ ok: true }, 200, env)
}

// -----------------------------------------------------------------
// Firmware: verifica se o usuário aceitou os termos do update
// -----------------------------------------------------------------
async function checkFirmwareAcceptance(
  userId: string,
  updateId: string,
  env: Env
): Promise<boolean> {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/firmware_update_acceptances?update_id=eq.${updateId}&user_id=eq.${userId}&select=id&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) return false
    const rows = await res.json<Array<{ id: string }>>()
    return rows.length > 0
  } catch {
    return false
  }
}

// -----------------------------------------------------------------
// Firmware Image Upload — matrix admin only, bucket FIRMWARE/imgs/
// -----------------------------------------------------------------
async function handleFirmwareImgUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden' }, 403, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'Arquivo obrigatório' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const key      = `firmware/imgs/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  await env.FIRMWARE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId },
  })

  return json({ key }, 200, env)
}

// -----------------------------------------------------------------
// Firmware File Upload — matrix admin only, bucket FIRMWARE/files/
// -----------------------------------------------------------------
async function handleFirmwareFileUpload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const admin = await isMatrixAdmin(userId, env)
  if (!admin) return json({ error: 'Forbidden' }, 403, env)

  let formData: FormData
  try { formData = await request.formData() }
  catch { return json({ error: 'Corpo deve ser multipart/form-data' }, 400, env) }

  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'Arquivo obrigatório' }, 400, env)

  const safeName = sanitizeFileName(file.name)
  const key      = `firmware/files/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  await env.FIRMWARE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: userId },
  })

  return json({ key, size: file.size, fileName: safeName }, 200, env)
}

// -----------------------------------------------------------------
// Firmware Download — autenticado; exige aceite registrado na tabela
// -----------------------------------------------------------------
async function handleFirmwareDownload(request: Request, env: Env): Promise<Response> {
  const userId = await verifyToken(request.headers.get('Authorization'), env)
  if (!userId) return json({ error: 'Unauthorized' }, 401, env)

  const body = await request.json<{ r2Key: string; updateId: string; fileName?: string }>()
  if (!body.r2Key || !body.updateId) {
    return json({ error: 'r2Key e updateId são obrigatórios' }, 400, env)
  }

  const hasAccepted = await checkFirmwareAcceptance(userId, body.updateId, env)
  if (!hasAccepted) {
    return json({ error: 'Aceite dos termos necessário antes do download' }, 403, env)
  }

  const object = await env.FIRMWARE.get(body.r2Key)
  if (!object) return json({ error: 'Arquivo não encontrado' }, 404, env)

  const fileName = body.fileName ?? body.r2Key.split('/').pop() ?? 'firmware'

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFileName(fileName)}"`,
      ...corsHeaders(env),
    },
  })
}

// -----------------------------------------------------------------
// Router
// -----------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env)
    }

    const { pathname } = new URL(request.url)

    switch (pathname) {
      case '/r2-presign-upload':        return handleEcuUpload(request, env)
      case '/r2-presign-download':      return handleEcuDownload(request, env)
      case '/r2-mkt-upload':            return handleMktUpload(request, env)
      case '/r2-mkt-download':          return handleMktDownload(request, env)
      case '/r2-mkt-delete':            return handleMktDelete(request, env)
      case '/r2-firmware-img-upload':   return handleFirmwareImgUpload(request, env)
      case '/r2-firmware-file-upload':  return handleFirmwareFileUpload(request, env)
      case '/r2-firmware-download':     return handleFirmwareDownload(request, env)
      default:                          return json({ error: 'Not found' }, 404, env)
    }
  },
}
