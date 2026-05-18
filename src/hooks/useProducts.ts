import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { PriceTier } from '@/types/app'

export interface ProductPrice {
  id: string
  product_id: string
  tier: PriceTier
  price: number
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  active: boolean
  featured: boolean
  stock: number
  created_at: string
  product_prices?: ProductPrice[]
}

export interface ProductWithPrices extends Product {
  product_prices: ProductPrice[]
}

interface ListFilter {
  q?: string
  category?: string
  page?: number
  pageSize?: number
}

export function useProducts({ q = '', category = '', page = 0, pageSize = 20 }: ListFilter = {}) {
  return useQuery({
    queryKey: ['products', q, category, page, pageSize],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('products')
        .select('*, product_prices(*)', { count: 'exact' })
        .order('name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (q) query = query.ilike('name', `%${q}%`)
      if (category) query = query.eq('category', category)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as ProductWithPrices[], total: (count as number) ?? 0 }
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('*, product_prices(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as ProductWithPrices
    },
  })
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('category')
        .order('category')
      if (error) throw error
      const unique = [...new Set((data as { category: string }[]).map((r) => r.category))]
      return unique
    },
  })
}

interface UpsertProductPayload {
  id?: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  active: boolean
  featured: boolean
  stock: number
  prices: { tier: PriceTier; price: number }[]
}

export function useUpsertProduct() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ prices, ...product }: UpsertProductPayload) => {
      const isNew = !product.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      let productId: string
      if (isNew) {
        const { data, error } = await sb.from('products').insert({
          sku: product.sku,
          name: product.name,
          category: product.category,
          description: product.description,
          image_url: product.image_url,
          active: product.active,
          featured: product.featured,
          stock: product.stock,
        }).select('id').single()
        if (error) throw error
        productId = data.id
      } else {
        const { error } = await sb.from('products').update({
          sku: product.sku,
          name: product.name,
          category: product.category,
          description: product.description,
          image_url: product.image_url,
          active: product.active,
          featured: product.featured,
          stock: product.stock,
        }).eq('id', product.id)
        if (error) throw error
        productId = product.id!
      }

      for (const { tier, price } of prices) {
        await sb.from('product_prices').upsert(
          { product_id: productId, tier, price },
          { onConflict: 'product_id,tier' },
        )
      }

      return productId
    },
    onSuccess: (id, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      log({ entity: 'product', entityId: id, action: vars.id ? 'updated' : 'created' })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('products').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      log({ entity: 'product', entityId: id, action: 'deleted' })
    },
  })
}
