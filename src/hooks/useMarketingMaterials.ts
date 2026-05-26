import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  uploadMktMaterialToR2,
  downloadMktMaterialFromR2,
  deleteMktMaterialFromR2,
} from '@/lib/r2'

export type MktCategory = 'logo' | 'impressos' | 'social_media' | 'identidade_visual'

export const MKT_CATEGORIES: { value: MktCategory; label: string; description: string }[] = [
  { value: 'logo',              label: 'Logo',             description: 'Arquivos de logotipo em formatos vetoriais e raster' },
  { value: 'impressos',         label: 'Impressos',        description: 'Folders, banners, cartões de visita e materiais gráficos' },
  { value: 'social_media',      label: 'Social Media',     description: 'Posts, stories e peças para redes sociais' },
  { value: 'identidade_visual', label: 'Identidade Visual', description: 'Manual de marca, paleta, tipografia e guia de aplicação' },
]

export interface MarketingMaterial {
  id: string
  title: string
  category: MktCategory
  description: string | null
  storage_path: string
  file_name: string
  file_type: string
  file_size_bytes: number | null
  uploaded_by: string | null
  active: boolean
  created_at: string
  updated_at: string
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente')
  return session.access_token
}

export function useMarketingMaterials(category?: MktCategory) {
  return useQuery({
    queryKey: ['marketing-materials', category ?? 'all'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('marketing_materials')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (category) q = q.eq('category', category)
      const { data, error } = await q
      if (error) throw error
      return data as MarketingMaterial[]
    },
  })
}

export function useMarketingMaterialsAdmin(category?: MktCategory) {
  return useQuery({
    queryKey: ['marketing-materials-admin', category ?? 'all'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('marketing_materials')
        .select('*')
        .order('created_at', { ascending: false })
      if (category) q = q.eq('category', category)
      const { data, error } = await q
      if (error) throw error
      return data as MarketingMaterial[]
    },
  })
}

export function useUploadMarketingMaterial() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      title,
      category,
      description,
    }: {
      file: File
      title: string
      category: MktCategory
      description?: string
    }) => {
      const accessToken = await getAccessToken()

      // Upload para R2 via Worker (com role check server-side)
      const { key } = await uploadMktMaterialToR2({ file, category, accessToken })

      const { data: { user } } = await supabase.auth.getUser()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('marketing_materials')
        .insert({
          title,
          category,
          description: description || null,
          storage_path: key,
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as MarketingMaterial
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-materials'] })
      qc.invalidateQueries({ queryKey: ['marketing-materials-admin'] })
    },
  })
}

export function useDeleteMarketingMaterial() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (material: MarketingMaterial) => {
      const accessToken = await getAccessToken()

      // Remove do R2 via Worker (com role check server-side)
      await deleteMktMaterialFromR2({ r2Key: material.storage_path, accessToken })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('marketing_materials')
        .delete()
        .eq('id', material.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-materials'] })
      qc.invalidateQueries({ queryKey: ['marketing-materials-admin'] })
    },
  })
}

export async function downloadMktMaterial(material: MarketingMaterial): Promise<void> {
  const accessToken = await getAccessToken()
  await downloadMktMaterialFromR2({
    r2Key: material.storage_path,
    fileName: material.file_name,
    accessToken,
  })
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
