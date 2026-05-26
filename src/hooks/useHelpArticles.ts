import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type HelpArticleCategory =
  | 'ecu' | 'tabela_remap' | 'clientes' | 'loja'
  | 'financeiro' | 'suporte' | 'perfil' | 'geral'

export type HelpArticleStatus = 'draft' | 'published'

export interface HelpArticle {
  id: string
  title: string
  excerpt: string | null
  body: string | null
  cover_url: string | null
  youtube_url: string | null
  category: HelpArticleCategory
  for_units: boolean
  for_matrix: boolean
  status: HelpArticleStatus
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type HelpArticleInput = Omit<HelpArticle, 'id' | 'created_at' | 'updated_at' | 'created_by'>

const TABLE = 'help_articles'
const KEY = 'help_articles'

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useHelpArticles(filters?: {
  status?: HelpArticleStatus
  for_units?: boolean
  for_matrix?: boolean
  category?: HelpArticleCategory
}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (filters?.status)     q = q.eq('status', filters.status)
      if (filters?.for_units  !== undefined) q = q.eq('for_units', filters.for_units)
      if (filters?.for_matrix !== undefined) q = q.eq('for_matrix', filters.for_matrix)
      if (filters?.category)   q = q.eq('category', filters.category)

      const { data, error } = await q
      if (error) throw error
      return data as HelpArticle[]
    },
  })
}

export function useHelpArticle(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as HelpArticle
    },
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateHelpArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: HelpArticleInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as HelpArticle
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateHelpArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: HelpArticleInput & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as HelpArticle
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteHelpArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  return match ? match[1] : null
}

export const CATEGORY_LABELS: Record<HelpArticleCategory, string> = {
  ecu:          'ECU & Remapeamento',
  tabela_remap: 'Tabela de Remap',
  clientes:     'Clientes',
  loja:         'Loja & Pedidos',
  financeiro:   'Financeiro',
  suporte:      'Suporte',
  perfil:       'Conta & Perfil',
  geral:        'Geral',
}

export const CATEGORY_COLORS: Record<HelpArticleCategory, { color: string; bg: string }> = {
  ecu:          { color: 'hsl(var(--pm-red-500))',  bg: 'hsl(var(--pm-red-500)/0.12)' },
  tabela_remap: { color: '#FB923C',                  bg: 'rgba(251,146,60,0.12)' },
  clientes:     { color: '#60A5FA',                  bg: 'rgba(96,165,250,0.12)' },
  loja:         { color: '#34D399',                  bg: 'rgba(52,211,153,0.12)' },
  financeiro:   { color: '#A78BFA',                  bg: 'rgba(167,139,250,0.12)' },
  suporte:      { color: '#FBBF24',                  bg: 'rgba(251,191,36,0.12)' },
  perfil:       { color: '#F472B6',                  bg: 'rgba(244,114,182,0.12)' },
  geral:        { color: '#94A3B8',                  bg: 'rgba(148,163,184,0.12)' },
}
