import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ShippingOption {
  id: number
  name: string
  price: string
  delivery_time: number
  company: { name: string; picture: string }
}

export interface ShippingCartItem {
  productId: string
  quantity: number
  price: number
}

interface ProductDimension {
  id: string
  weight_kg: number | null
  height_cm: number | null
  width_cm:  number | null
  length_cm: number | null
}

const DEFAULT_WEIGHT = 0.5
const DEFAULT_HEIGHT = 15
const DEFAULT_WIDTH  = 15
const DEFAULT_LENGTH = 20

export function useShipping(cepDestino: string, items: ShippingCartItem[]) {
  const cep = cepDestino.replace(/\D/g, '')
  const enabled = cep.length === 8 && items.length > 0

  return useQuery<ShippingOption[]>({
    queryKey: ['shipping', cep, items.map(i => `${i.productId}:${i.quantity}`).join(',')],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const ids = [...new Set(items.map(i => i.productId))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dims } = await (supabase as any)
        .from('products')
        .select('id, weight_kg, height_cm, width_cm, length_cm')
        .in('id', ids)

      const dimMap: Record<string, ProductDimension> = {}
      ;(dims ?? []).forEach((d: ProductDimension) => { dimMap[d.id] = d })

      const products = items.map(item => {
        const d = dimMap[item.productId]
        return {
          id:              item.productId,
          quantity:        item.quantity,
          weight:          d?.weight_kg  ?? DEFAULT_WEIGHT,
          height:          d?.height_cm  ?? DEFAULT_HEIGHT,
          width:           d?.width_cm   ?? DEFAULT_WIDTH,
          length:          d?.length_cm  ?? DEFAULT_LENGTH,
          insurance_value: item.price,
        }
      })

      const { data: { session } } = await supabase.auth.getSession()
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      const authToken = session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${anonKey}`

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-shipping`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'apikey': anonKey,
          },
          body: JSON.stringify({ cep_destino: cep, products }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao calcular frete')
      return (json.options ?? []) as ShippingOption[]
    },
  })
}
