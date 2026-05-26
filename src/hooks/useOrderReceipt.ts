import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUploadReceipt() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      const sb = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${orderId}/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await sb.storage
        .from('order-receipts')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) throw new Error(upErr.message)

      const { data: signed } = await sb.storage
        .from('order-receipts')
        .createSignedUrl(path, 60 * 60 * 24 * 30) // 30 days

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { error: updateErr } = await sb
        .from('orders')
        .update({
          comprovante_path:        path,
          comprovante_url:         signed?.signedUrl ?? null,
          comprovante_uploaded_at: new Date().toISOString(),
          comprovante_expires_at:  expiresAt,
        })
        .eq('id', orderId)
      if (updateErr) throw new Error(updateErr.message)

      return { path, url: signed?.signedUrl }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['franchise-orders'] })
      qc.invalidateQueries({ queryKey: ['franchise-orders-matrix'] })
      qc.invalidateQueries({ queryKey: ['comprovante-pending-count'] })
    },
  })
}
