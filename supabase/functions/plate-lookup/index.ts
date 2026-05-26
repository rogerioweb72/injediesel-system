import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAuth(req).catch(() => null)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  const token = Deno.env.get('APIPLACAS_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ error: 'APIPLACAS_TOKEN not configured' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { plate } = await req.json()
  if (!plate || typeof plate !== 'string') {
    return new Response(JSON.stringify({ error: 'plate required' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const clean = plate.replace(/\W/g, '').toUpperCase().slice(0, 10)
  if (clean.length < 7) {
    return new Response(JSON.stringify({ error: 'Placa inválida' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Adjust URL/auth if apiplacas.com.br changes their API format
  const apiRes = await fetch(`https://apiplacas.com.br/api/v1/placas/${clean}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!apiRes.ok) {
    return new Response(JSON.stringify({ data: null }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const raw = await apiRes.json()

  // Normalize — apiplacas returns mixed-case keys, some fields may be absent
  const get = (...keys: string[]): string | null => {
    for (const k of keys) {
      const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()]
      if (val && String(val).trim()) return String(val).trim()
    }
    return null
  }

  const anoRaw = get('Ano', 'ano', 'AnoModelo', 'anoModelo')
  const ano = anoRaw ? parseInt(anoRaw.split('/')[0], 10) : null

  const data = {
    marca:       get('Marca', 'marca') ?? '',
    modelo:      get('Modelo', 'modelo') ?? '',
    anoModelo:   isNaN(ano!) ? null : ano,
    combustivel: get('Combustivel', 'combustivel', 'Combustível') ?? null,
    motor:       get('Motor', 'motor', 'Motorizacao', 'motorizacao', 'Motorização') ?? null,
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
