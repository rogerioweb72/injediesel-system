import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFileToR2, deleteEcuFileFromR2 } from '@/lib/r2'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

// Atualização automática do status de scan (antivírus) sem F5 manual.
// Cobre matriz e franquia — ambos abrem a mesma tela de detalhe do job.
export function useEcuJobFilesRealtime(jobId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!jobId) return

    const channel = supabase
      .channel(`ecu-job-files-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ecu_job_files',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [jobId, qc])
}

export function useUploadEcuFile() {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      jobId,
      file,
      fileType,
    }: {
      jobId: string
      file: File
      fileType: 'original' | 'entrega' | 'correcao'
    }) => {
      const token = session?.access_token ?? ''
      const { key: r2Key } = await uploadFileToR2({
        bucket: fileType === 'original' ? 'originals' : 'delivered',
        file,
        accessToken: token,
        jobId,
      })

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

      // Scan de antivírus dispara via Database Webhook (Dashboard → Database
      // → Webhooks, INSERT em ecu_job_files) — não mais daqui. O fetch
      // fire-and-forget que existia aqui mandava Authorization: Bearer com o
      // JWT do usuário, mas scan-ecu-file exige o WEBHOOK_SECRET nesse
      // header — todo upload tomava 403 silencioso (erro sempre engolido,
      // .catch(() => null)) e o arquivo nunca era escaneado.
      return data
    },
  })
}

// ─── Apagar / substituir / inutilizar arquivo ECU (migration 120) ───────────

// FRANQUEADO apaga o próprio 'original' ANTES do aceite (status='recebido').
export function useDeleteEcuFileFranchise() {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  return useMutation({
    mutationFn: async ({ fileId, jobId }: { fileId: string; jobId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('franchise_delete_ecu_file', { p_file_id: fileId })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row?.r2_key) {
        try {
          await deleteEcuFileFromR2({ bucket: row.bucket ?? 'originals', r2Key: row.r2_key, accessToken: session?.access_token ?? '' })
        } catch { /* linha já removida; objeto R2 vira órfão — limpeza em lote depois */ }
      }
      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
    },
  })
}

// FRANQUEADO substitui o 'original' em 1 clique: sobe o novo + apaga o errado.
export function useReplaceEcuFileFranchise() {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ jobId, oldFileId, file }: { jobId: string; oldFileId: string; file: File }) => {
      const token = session?.access_token ?? ''
      // 1. sobe o novo original (nunca fica zero arquivo se algo falhar depois)
      const { key: r2Key } = await uploadFileToR2({ bucket: 'originals', file, accessToken: token, jobId })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any).from('ecu_job_files').insert({
        job_id: jobId, file_type: 'original', r2_key: r2Key,
        file_name: file.name, mime_type: file.type, size_bytes: file.size,
      })
      if (insErr) throw insErr
      // 2. apaga o antigo (RPC valida unidade/status e devolve a key p/ o R2)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('franchise_delete_ecu_file', { p_file_id: oldFileId })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row?.r2_key) {
        try { await deleteEcuFileFromR2({ bucket: row.bucket ?? 'originals', r2Key: row.r2_key, accessToken: token }) } catch { /* órfão */ }
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('ecu_job_events').insert({
          job_id: jobId, actor_id: user?.id ?? null, event_type: 'file_replaced_by_franchise',
          payload: { new_file_name: file.name, new_r2_key: r2Key },
        })
      } catch { /* best-effort */ }
      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
    },
  })
}

// FRANQUEADO avisa a matriz que o arquivo está errado (pós-aceite).
export function useReportWrongEcuFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fileId, jobId, reason }: { fileId: string; jobId: string; reason: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('franchise_report_wrong_file', { p_file_id: fileId, p_reason: reason })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
    },
  })
}

// MATRIZ inutiliza (cinza + nota "arquivo errado"), sem apagar.
export function useInvalidateEcuFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fileId, jobId, reason }: { fileId: string; jobId: string; reason: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('matrix_invalidate_ecu_file', { p_file_id: fileId, p_reason: reason })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
    },
  })
}

// MATRIZ exclui de vez (apaga linha + objeto R2).
export function useDeleteEcuFileMatrix() {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  return useMutation({
    mutationFn: async ({ fileId, jobId }: { fileId: string; jobId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('matrix_delete_ecu_file', { p_file_id: fileId })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row?.r2_key) {
        try {
          await deleteEcuFileFromR2({ bucket: row.bucket ?? 'originals', r2Key: row.r2_key, accessToken: session?.access_token ?? '' })
        } catch { /* órfão */ }
      }
      qc.invalidateQueries({ queryKey: ['ecu-job', jobId] })
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
      // iOS Safari blocks programmatic a.click() — use window.open for mobile
      const isMobileSafari = /iP(hone|od|ad)/.test(navigator.userAgent)
      if (isMobileSafari) {
        window.open(downloadUrl, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = fileName
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao baixar arquivo')
    },
  })
}
