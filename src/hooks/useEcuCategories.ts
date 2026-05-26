// src/hooks/useEcuCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EcuCategory {
  id: string
  slug: string
  label: string
  ordem: number
  ativo: boolean
  created_at: string
}

const QK = {
  list: () => ['ecu-categories'] as const,
}

const STATIC_FALLBACK: EcuCategory[] = [
  { id: '1', slug: 'carros-e-suvs', label: 'Carros & SUVs', ordem: 1, ativo: true, created_at: '' },
  { id: '2', slug: 'pickups',       label: 'Pickups',        ordem: 2, ativo: true, created_at: '' },
  { id: '3', slug: 'trucks',        label: 'Trucks',         ordem: 3, ativo: true, created_at: '' },
  { id: '4', slug: 'agricola',      label: 'Agrícola',       ordem: 4, ativo: true, created_at: '' },
  { id: '5', slug: 'maquinas',      label: 'Máquinas',       ordem: 5, ativo: true, created_at: '' },
  { id: '6', slug: 'motos',         label: 'Motos',          ordem: 6, ativo: true, created_at: '' },
]

export function useEcuCategories() {
  return useQuery({
    queryKey: QK.list(),
    queryFn: async (): Promise<EcuCategory[]> => {
      const { data, error } = await supabase
        .from('ecu_categories')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
      if (error) {
        // table may not exist yet — fall back to static list
        console.warn('ecu_categories not available, using static fallback', error.message)
        return STATIC_FALLBACK
      }
      return (data ?? STATIC_FALLBACK) as EcuCategory[]
    },
    staleTime: 300_000,
    placeholderData: STATIC_FALLBACK,
  })
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useCreateEcuCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const slug = slugify(label)
      const { data: existing } = await supabase
        .from('ecu_categories')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1)
        .single()
      const ordem = ((existing as { ordem: number } | null)?.ordem ?? 0) + 1
      const { data, error } = await supabase
        .from('ecu_categories')
        .insert({ slug, label, ordem })
        .select()
        .single()
      if (error) throw error
      return data as EcuCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

export function useUpdateEcuCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<EcuCategory, 'label' | 'ordem' | 'ativo'>> }) => {
      const { error } = await supabase.from('ecu_categories').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list() }),
  })
}

export function useDeleteEcuCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecu_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.list() })
      qc.invalidateQueries({ queryKey: ['ecu-catalog'] })
    },
  })
}
