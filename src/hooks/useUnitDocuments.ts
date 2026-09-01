import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export interface UnitDocument {
  id: string
  unit_id: string
  kind: 'contract_generated' | 'contract_uploaded' | 'other'
  name: string
  storage_path: string
  created_at: string
}

export function useUnitDocuments(unitId: string) {
  return useQuery({
    queryKey: ['unit-documents', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('unit_documents')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as UnitDocument[]
    },
  })
}

// Faz upload de um arquivo (Blob/File) no bucket unit-documents (pasta = unit_id)
// e registra em unit_documents.
export function useUploadUnitDocument() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ unitId, file, name, kind }: { unitId: string; file: Blob; name: string; kind: UnitDocument['kind'] }) => {
      const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${unitId}/${Date.now()}-${safe}`
      const { error: upErr } = await sb().storage
        .from('unit-documents')
        .upload(path, file, { upsert: false, contentType: (file as File).type || 'application/pdf' })
      if (upErr) throw upErr
      const { data, error } = await sb()
        .from('unit_documents')
        .insert({ unit_id: unitId, kind, name, storage_path: path, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as UnitDocument
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['unit-documents', d.unit_id] }),
  })
}

export function useDeleteUnitDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: UnitDocument) => {
      await sb().storage.from('unit-documents').remove([doc.storage_path])
      const { error } = await sb().from('unit_documents').delete().eq('id', doc.id)
      if (error) throw error
      return doc
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['unit-documents', d.unit_id] }),
  })
}

// URL assinada (curta) para visualizar um documento.
export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await sb().storage.from('unit-documents').createSignedUrl(storagePath, 300)
  if (error) return null
  return data?.signedUrl ?? null
}
