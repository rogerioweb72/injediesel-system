import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

export interface ShippingProduct {
  id: string
  quantity: number
  weight: number   // kg
  width: number    // cm
  height: number   // cm
  length: number   // cm
  insurance_value: number  // R$
}

interface RequestBody {
  cep_destino: string
  products: ShippingProduct[]
}

interface ShippingOption {
  id:    number
  name:  string
  price: string
  error?: string | null
}

serve(async (req) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const auth = await requireAuth(req).catch(() => null)
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

  try {
    const rawToken   = Deno.env.get('MELHOR_ENVIO_TOKEN')
    const token      = rawToken?.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`
    const originCep  = Deno.env.get('MELHOR_ENVIO_ORIGIN_CEP') ?? '85818660'

    if (!rawToken) {
      return new Response(JSON.stringify({ error: 'Token não configurado' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    const { cep_destino, products } = body

    const cepDest = cep_destino.replace(/\D/g, '')
    const cepOrig = originCep.replace(/\D/g, '')

    if (cepDest.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP de destino inválido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const payload = {
      from: { postal_code: cepOrig },
      to:   { postal_code: cepDest },
      products: products.map(p => ({
        id:              p.id,
        width:           Math.max(p.width,  11),
        height:          Math.max(p.height, 2),
        length:          Math.max(p.length, 16),
        weight:          Math.max(p.weight, 0.1),
        insurance_value: p.insurance_value,
        quantity:        p.quantity,
      })),
      options: {
        insurance_value: products.reduce((s, p) => s + p.insurance_value * p.quantity, 0),
        receipt:  false,
        own_hand: false,
      },
    }

    const resp = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': token,
        'User-Agent':    'Injediesel System (suporte@web72.com.br)',
      },
      body: JSON.stringify(payload),
    })

    const data = await resp.json()

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Melhor Envio: ${resp.status}`, detail: data }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Filter out services with errors, sort by price
    const options = Array.isArray(data)
      ? (data as ShippingOption[])
          .filter((s) => !s.error && s.price)
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      : []

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
