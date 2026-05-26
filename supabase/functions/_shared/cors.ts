// Allowed origins: set ALLOWED_ORIGIN secret in Supabase Dashboard.
// Multiple origins: comma-separated, e.g. "https://app.promaxtuner.com.br,https://promaxtuner.com.br"
const RAW = Deno.env.get('ALLOWED_ORIGIN') ?? ''
const ALLOWED = new Set<string>(
  RAW.split(',').map((o) => o.trim()).filter(Boolean)
)

// Always allow local dev origins
ALLOWED.add('http://localhost:3000')
ALLOWED.add('http://127.0.0.1:3000')

/**
 * Returns strict CORS headers for authenticated endpoints.
 * Only allows requests from known origins; rejects everything else
 * by returning no ACAO header (browser will block).
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = ALLOWED.has(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

/** CORS headers for genuinely public endpoints (no auth required). */
export const PUBLIC_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
