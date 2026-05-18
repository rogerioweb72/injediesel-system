import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LojaEcuItem {
  id: string
  categoria: string
  categoria_slug: string
  marca: string
  secao_original: string | null
  modelo_descricao: string | null
  ano: string | null
  ganho: string | null
  cv_original: number | null
  cv_tuned: number | null
  kgfm_original: number | null
  kgfm_tuned: number | null
  preco_cliente_final: number | null
  foto_url: string | null
  featured: boolean
}

export interface LojaProductItem {
  id: string
  sku: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  stock: number
  preco_cliente_final: number | null
  featured: boolean
}

export function useLojaEcuCatalog(categoriaSlug?: string, marca?: string, q?: string) {
  return useQuery({
    queryKey: ['loja-ecu', categoriaSlug, marca, q],
    queryFn: async (): Promise<LojaEcuItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('ecu_catalog_public')
        .select('*')
        .order('categoria_slug', { ascending: true })
        .order('marca', { ascending: true })
        .order('secao_original', { ascending: true })

      if (categoriaSlug && categoriaSlug !== 'all') {
        query = query.eq('categoria_slug', categoriaSlug)
      }
      if (marca) {
        query = query.eq('marca', marca)
      }
      if (q?.trim()) {
        query = query.or(
          `marca.ilike.%${q}%,modelo_descricao.ilike.%${q}%,secao_original.ilike.%${q}%,ganho.ilike.%${q}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as LojaEcuItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaFeaturedEcu() {
  return useQuery({
    queryKey: ['loja-ecu-featured'],
    queryFn: async (): Promise<LojaEcuItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_catalog_public')
        .select('*')
        .eq('featured', true)
        .order('marca', { ascending: true })
      if (error) throw error
      return (data ?? []) as LojaEcuItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaEcuBrands(categoriaSlug?: string) {
  return useQuery({
    queryKey: ['loja-ecu-brands', categoriaSlug],
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('ecu_catalog_public')
        .select('marca')
        .order('marca', { ascending: true })

      if (categoriaSlug && categoriaSlug !== 'all') {
        query = query.eq('categoria_slug', categoriaSlug)
      }

      const { data, error } = await query
      if (error) throw error
      const unique = [...new Set((data ?? []).map((r: { marca: string }) => r.marca))] as string[]
      return unique
    },
    staleTime: 300_000,
  })
}

export function useLojaProducts(category?: string, q?: string) {
  return useQuery({
    queryKey: ['loja-products', category, q],
    queryFn: async (): Promise<LojaProductItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('products')
        .select('id, sku, name, category, description, image_url, stock, featured, product_prices!inner(tier, price)')
        .eq('active', true)
        .eq('product_prices.tier', 'cliente_final')

      if (category) query = query.eq('category', category)
      if (q?.trim()) query = query.ilike('name', `%${q}%`)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((p: {
        id: string; sku: string; name: string; category: string
        description: string | null; image_url: string | null; stock: number; featured: boolean
        product_prices: { tier: string; price: number }[]
      }) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description,
        image_url: p.image_url,
        stock: p.stock,
        featured: p.featured,
        preco_cliente_final: p.product_prices?.[0]?.price ?? null,
      })) as LojaProductItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaFeaturedProducts() {
  return useQuery({
    queryKey: ['loja-products-featured'],
    queryFn: async (): Promise<LojaProductItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, sku, name, category, description, image_url, stock, featured, product_prices!inner(tier, price)')
        .eq('active', true)
        .eq('featured', true)
        .eq('product_prices.tier', 'cliente_final')
      if (error) throw error

      return (data ?? []).map((p: {
        id: string; sku: string; name: string; category: string
        description: string | null; image_url: string | null; stock: number; featured: boolean
        product_prices: { tier: string; price: number }[]
      }) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description,
        image_url: p.image_url,
        stock: p.stock,
        featured: p.featured,
        preco_cliente_final: p.product_prices?.[0]?.price ?? null,
      })) as LojaProductItem[]
    },
    staleTime: 60_000,
  })
}

export function useLojaProductCategories() {
  return useQuery({
    queryKey: ['loja-product-categories'],
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('products')
        .select('category')
        .eq('active', true)
      if (error) throw error
      return [...new Set((data ?? []).map((r: { category: string }) => r.category))] as string[]
    },
    staleTime: 300_000,
  })
}
