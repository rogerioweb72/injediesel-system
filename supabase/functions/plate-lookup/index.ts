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
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { plate } = await req.json()
  if (!plate || typeof plate !== 'string') {
    return new Response(JSON.stringify({ error: 'plate required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const clean = plate.replace(/\W/g, '').toUpperCase().slice(0, 7)
  if (clean.length < 7) {
    return new Response(JSON.stringify({ error: 'Placa inválida' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const apiRes = await fetch(`https://wdapi2.com.br/consulta/${clean}/${token}`)

  if (apiRes.status === 402) {
    return new Response(JSON.stringify({ error: 'Token da API inválido' }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (apiRes.status === 429) {
    return new Response(JSON.stringify({ error: 'Limite de consultas atingido' }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (!apiRes.ok) {
    return new Response(JSON.stringify({ data: null }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const raw = await apiRes.json()
  const extra = raw.extra ?? {}
  const fipe = raw.fipe?.dados?.[0] ?? null

  const pick = (obj: Record<string, unknown>, ...keys: string[]): string | null => {
    for (const k of keys) {
      const val = obj?.[k]
      if (val && String(val).trim()) return String(val).trim()
    }
    return null
  }

  // Ano no formato "fabricacao/modelo" que o form espera (ex: 2022/2023)
  const anoFab = pick(extra, 'ano_fabricacao') ?? pick(raw, 'ano')
  const anoMod = pick(extra, 'ano_modelo') ?? pick(raw, 'anoModelo')
  let ano: string | null = null
  if (anoFab && anoMod) ano = anoFab === anoMod ? anoMod : `${anoFab}/${anoMod}`
  else ano = anoMod ?? anoFab ?? null

  const data = {
    marca:        pick(raw, 'MARCA', 'marca') ?? '',
    modelo:       pick(raw, 'MODELO', 'modelo') ?? '',
    ano:          ano,
    motorSugestao: fipe ? pick(fipe, 'texto_modelo') : null,  // ex "CROSSFOX 1.6 Mi Total Flex 8V 5p"
    cilindradas:  pick(extra, 'cilindradas') ?? null,          // ex "1599" (cru)
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
