// src/hooks/useSupportChat.ts
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { SupportMessage } from './useSupportTickets'

interface SendMessageParams {
  ticketId: string
  body: string
  isInternal: boolean
  file?: File
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function useSupportChat(ticketId: string, isActive: boolean) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!isActive || !ticketId) return

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          qc.setQueryData(['support-ticket', ticketId], (old: any) => {
            if (!old) return old
            const msgs: SupportMessage[] = old.support_messages ?? []
            if (msgs.some((m) => m.id === (payload.new as SupportMessage).id)) return old
            return { ...old, support_messages: [...msgs, payload.new as SupportMessage] }
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticketId, isActive, qc])

  const sendMessage = useCallback(
    async ({ ticketId: tid, body, isInternal, file }: SendMessageParams) => {
      let attachmentR2Key: string | null = null
      let attachmentFilename: string | null = null
      let attachmentMime: string | null = null
      let attachmentSizeBytes: number | null = null

      if (file) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-upload-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              ticketId: tid,
              filename: file.name,
              mime: file.type || 'application/octet-stream',
              size: file.size,
            }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Falha ao gerar URL de upload')
        }
        const { uploadUrl, r2Key } = await res.json()
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        })
        attachmentR2Key = r2Key
        attachmentFilename = file.name
        attachmentMime = file.type
        attachmentSizeBytes = file.size
      }

      const { error } = await sb().from('support_messages').insert({
        ticket_id: tid,
        author_id: user?.id ?? null,
        body,
        is_internal: isInternal,
        attachment_r2_key: attachmentR2Key,
        attachment_filename: attachmentFilename,
        attachment_mime: attachmentMime,
        attachment_size_bytes: attachmentSizeBytes,
      })
      if (error) throw error
    },
    [user]
  )

  const downloadAttachment = useCallback(
    async (r2Key: string, ticketId: string, filename: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-download-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ r2Key, ticketId }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao gerar URL de download')
      }
      const { downloadUrl } = await res.json()
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    []
  )

  return { sendMessage, downloadAttachment }
}
