import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFileToR2 } from '@/lib/r2'
import { useAuthStore } from '@/stores/auth'

export function useUploadEcuFile() {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)
  const isMock = import.meta.env.VITE_MOCK === 'true'

  return useMutation({
    mutationFn: async ({
      jobId,
      file,
      fileType,
    }: {
      jobId: string
      file: File
      fileType: 'original' | 'entrega'
    }) => {
      const token = session?.access_token ?? ''
      let r2Key = `mock/${jobId}/${fileType}/${file.name}`

      if (isMock) {
        try {
          const { key } = await uploadFileToR2({
            bucket: fileType === 'original' ? 'originals' : 'delivered',
            file,
            accessToken: token,
            jobId,
          })
          r2Key = key
        } catch (err) {
          console.warn('R2 upload falhou em modo mock, usando chave mock:', err)
        }
      } else {
        const { key } = await uploadFileToR2({
          bucket: fileType === 'original' ? 'originals' : 'delivered',
          file,
          accessToken: token,
          jobId,
        })
        r2Key = key
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ecu_job_files')
        .insert({
          job_id: jobId,
          file_type: fileType,
          r2_key: r2Key,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select()
        .single()
      if (error) throw error

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('ecu_job_events').insert({
          job_id: jobId,
          actor_id: user?.id ?? null,
          event_type: 'file_uploaded',
          payload: {
            file_type: fileType,
            file_name: file.name,
            r2_key: r2Key,
            bucket: fileType === 'original' ? 'originals' : 'delivered',
            size_bytes: file.size,
          },
        })
      } catch {
        // best-effort event logging, do not break the upload flow
      }

      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
      return data
    },
  })
}

export function useDownloadEcuFile() {
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecu-download-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({ fileId }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download falhou' }))
        throw new Error((err as { error?: string }).error ?? 'Download falhou')
      }
      const { downloadUrl } = await res.json() as { downloadUrl: string }
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
  })
}
