import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquipmentType {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  active: boolean
  created_at: string
}

export type BlockType = 'aviso' | 'texto' | 'passos' | 'imagem' | 'video'

export interface Block {
  type: BlockType
  content?: string   // aviso, texto
  items?: string[]   // passos
  r2_key?: string    // imagem
  caption?: string   // imagem
  url?: string       // video
}

export interface FirmwareUpdate {
  id: string
  equipment_id: string
  version: string
  title: string
  blocks: Block[]
  published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FirmwareFile {
  id: string
  update_id: string
  r2_key: string
  file_name: string
  file_size: number | null
  sort_order: number
  created_at: string
}

export interface FirmwareAcceptance {
  id: string
  update_id: string
  unit_id: string | null
  user_id: string
  accepted_at: string
  ip_address: string | null
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente')
  return session.access_token
}

// ─── Equipment Types ──────────────────────────────────────────────────────────

export function useEquipmentTypes() {
  return useQuery({
    queryKey: ['equipment-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('equipment_types')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as EquipmentType[]
    },
  })
}

export function useUpsertEquipmentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<Pick<EquipmentType, 'id'>> & Pick<EquipmentType, 'name' | 'slug'> & { description?: string | null }
    ) => {
      const { data, error } = await (supabase as any)
        .from('equipment_types')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as EquipmentType
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-types'] }),
  })
}

// ─── Firmware Updates ─────────────────────────────────────────────────────────

export function useFirmwareUpdates(equipmentId?: string) {
  return useQuery({
    queryKey: ['firmware-updates', equipmentId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any)
        .from('firmware_updates')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
      if (equipmentId) q = q.eq('equipment_id', equipmentId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FirmwareUpdate[]
    },
  })
}

export function useFirmwareUpdatesAdmin(equipmentId?: string) {
  return useQuery({
    queryKey: ['firmware-updates-admin', equipmentId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any)
        .from('firmware_updates')
        .select('*')
        .order('created_at', { ascending: false })
      if (equipmentId) q = q.eq('equipment_id', equipmentId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FirmwareUpdate[]
    },
  })
}

export function useFirmwareUpdate(updateId?: string) {
  return useQuery({
    queryKey: ['firmware-update', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_updates')
        .select('*')
        .eq('id', updateId)
        .single()
      if (error) throw error
      return data as FirmwareUpdate
    },
  })
}

export function useSaveFirmwareUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      equipment_id: string
      version: string
      title: string
      blocks: Block[]
      published?: boolean
    }) => {
      if (payload.id) {
        const { id, ...rest } = payload
        const update: Record<string, unknown> = { ...rest }
        if (rest.published) update.published_at = new Date().toISOString()
        const { data, error } = await (supabase as any)
          .from('firmware_updates')
          .update(update)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data as FirmwareUpdate
      } else {
        const insert: Record<string, unknown> = { ...payload }
        if (payload.published) insert.published_at = new Date().toISOString()
        const { data, error } = await (supabase as any)
          .from('firmware_updates')
          .insert(insert)
          .select()
          .single()
        if (error) throw error
        return data as FirmwareUpdate
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['firmware-updates'] })
      qc.invalidateQueries({ queryKey: ['firmware-updates-admin'] })
      if (vars.id) qc.invalidateQueries({ queryKey: ['firmware-update', vars.id] })
    },
  })
}

// ─── Firmware Files ───────────────────────────────────────────────────────────

export function useFirmwareFiles(updateId?: string) {
  return useQuery({
    queryKey: ['firmware-files', updateId],
    enabled: !!updateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_files')
        .select('*')
        .eq('update_id', updateId)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as FirmwareFile[]
    },
  })
}

export function useAddFirmwareFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      update_id: string
      r2_key: string
      file_name: string
      file_size?: number | null
      sort_order?: number
    }) => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_files')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as FirmwareFile
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['firmware-files', vars.update_id] })
    },
  })
}

export function useDeleteFirmwareFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: FirmwareFile) => {
      const { error } = await (supabase as any)
        .from('firmware_update_files')
        .delete()
        .eq('id', file.id)
      if (error) throw error
      return file
    },
    onSuccess: (_data, file) => {
      qc.invalidateQueries({ queryKey: ['firmware-files', file.update_id] })
    },
  })
}

// ─── Acceptances ──────────────────────────────────────────────────────────────

export function useMyAcceptances() {
  return useQuery({
    queryKey: ['firmware-my-acceptances'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_acceptances')
        .select('*')
      if (error) throw error
      return (data ?? []) as FirmwareAcceptance[]
    },
  })
}

export function useAcceptFirmwareUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      update_id: string
      unit_id: string | null
      user_id: string
    }) => {
      const { data, error } = await (supabase as any)
        .from('firmware_update_acceptances')
        .upsert(payload, { onConflict: 'update_id,user_id', ignoreDuplicates: true })
        .select()
        .maybeSingle()
      if (error && error.code !== '23505') throw error
      return data as FirmwareAcceptance | null
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firmware-my-acceptances'] })
    },
  })
}

// ─── Download helper ──────────────────────────────────────────────────────────

export async function downloadFirmwareFile(file: FirmwareFile, updateId: string): Promise<void> {
  const token = await getAccessToken()
  const { downloadFirmwareFileFromR2 } = await import('@/lib/r2')
  await downloadFirmwareFileFromR2({
    r2Key: file.r2_key,
    updateId,
    fileName: file.file_name,
    accessToken: token,
  })
}
