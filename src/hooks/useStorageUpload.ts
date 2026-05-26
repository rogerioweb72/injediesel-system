import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface UploadOptions {
  upsert?: boolean
  contentType?: string
  maxSizeMB?: number
}

interface UploadResult {
  publicUrl: string | null
  error: string | null
}

export function useStorageUpload() {
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = useCallback(async (
    bucket: string,
    path: string,
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> => {
    const { upsert = true, contentType, maxSizeMB } = options

    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      const msg = `Arquivo muito grande. Máximo ${maxSizeMB} MB.`
      setUploadError(msg)
      return { publicUrl: null, error: msg }
    }

    setUploading(true)
    setUploadError(null)

    try {
      const uploadOpts: Record<string, unknown> = { upsert }
      if (contentType) uploadOpts.contentType = contentType

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase as any).storage
        .from(bucket)
        .upload(path, file, uploadOpts)

      if (upErr) throw upErr

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = (supabase as any).storage.from(bucket).getPublicUrl(path)
      return { publicUrl: data.publicUrl as string, error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg = err?.message ?? 'Erro ao fazer upload'
      setUploadError(msg)
      return { publicUrl: null, error: msg }
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, uploadError, clearUploadError: () => setUploadError(null) }
}
