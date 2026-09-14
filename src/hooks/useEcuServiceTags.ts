// src/hooks/useEcuServiceTags.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ecu_service_tags ainda não está nos tipos gerados do Supabase (migration 129) —
// mesmo padrão usado em outros hooks recentes deste repo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface EcuServiceTag {
  id: string
  slug: string
  label: string
  ordem: number
  ativo: boolean
  created_at: string
}

const QK = {
  list: () => ['ecu-service-tags'] as const,
  listAll: () => ['ecu-service-tags', 'all'] as const,
}

// Fallback estático (as 9 tags originais hardcoded) — usado só se a tabela
// ainda não existir (migration 129 não aplicada) ou a query falhar.
const STATIC_FALLBACK: EcuServiceTag[] = [
  { id: '1', slug: 'potencia',       label: 'Potência',        ordem: 1, ativo: true, created_at: '' },
  { id: '2', slug: 'egr',            label: 'EGR',              ordem: 2, ativo: true, created_at: '' },
  { id: '3', slug: 'dpf',            label: 'DPF',              ordem: 3, ativo: true, created_at: '' },
  { id: '4', slug: 'adblue',         label: 'AdBlue',           ordem: 4, ativo: true, created_at: '' },
  { id: '5', slug: 'pops-and-bangs', label: 'Pops and Bangs',   ordem: 5, ativo: true, created_at: '' },
  { id: '6', slug: 'pops-and-flames',label: 'Pops and Flames',  ordem: 6, ativo: true, created_at: '' },
  { id: '7', slug: 'hard-cut',       label: 'Hard Cut',         ordem: 7, ativo: true, created_at: '' },
  { id: '8', slug: 'full-smoke',     label: 'Full Smoke',       ordem: 8, ativo: true, created_at: '' },
  { id: '9', slug: 'lup-tuner',      label: 'Lup Tuner',        ordem: 9, ativo: true, created_at: '' },
]

// Tags ativas — usado no formulário de criação de arquivo ECU.
export function useEcuServiceTags() {
  return useQuery({
    queryKey: QK.list(),
    queryFn: async (): Promise<EcuServiceTag[]> => {
      const { data, error } = await sb()
        .from('ecu_service_tags')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
      if (error) {
        console.warn('ecu_service_tags not available, using static fallback', error.message)
        return STATIC_FALLBACK
      }
      return (data ?? STATIC_FALLBACK)
    },
    staleTime: 300_000,
    placeholderData: STATIC_FALLBACK,
  })
}

// Todas as tags (ativas + ocultas) — usado no painel de gestão.
export function useEcuServiceTagsAll() {
  return useQuery({
    queryKey: QK.listAll(),
    queryFn: async (): Promise<EcuServiceTag[]> => {
      const { data, error } = await sb()
        .from('ecu_service_tags')
        .select('*')
        .order('ordem', { ascending: true })
      if (error) {
        console.warn('ecu_service_tags not available, using static fallback', error.message)
        return STATIC_FALLBACK
      }
      return (data ?? STATIC_FALLBACK)
    },
    staleTime: 60_000,
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

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QK.list() })
  qc.invalidateQueries({ queryKey: QK.listAll() })
}

export function useCreateEcuServiceTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const slug = slugify(label)
      const { data: existing } = await sb()
        .from('ecu_service_tags')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle()
      const ordem = ((existing)?.ordem ?? 0) + 1
      const { data, error } = await sb()
        .from('ecu_service_tags')
        .insert({ slug, label, ordem })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateEcuServiceTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<EcuServiceTag, 'label' | 'ordem' | 'ativo'>> }) => {
      const { error } = await sb().from('ecu_service_tags').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}
