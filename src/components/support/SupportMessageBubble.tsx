// src/components/support/SupportMessageBubble.tsx
import { Download, Lock, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SupportMessage } from '@/hooks/useSupportTickets'

interface Props {
  message: SupportMessage
  isOwn: boolean
  onDownload: (r2Key: string, ticketId: string, filename: string) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function SupportMessageBubble({ message, isOwn, onDownload }: Props) {
  const authorName = message.profiles?.name ?? 'Desconhecido'

  const wrapperClass = isOwn && !message.is_internal ? 'ml-auto' : ''

  const bubbleClass = message.is_internal
    ? 'border border-amber-500/30 bg-amber-500/10'
    : isOwn
      ? 'bg-[hsl(var(--pm-red-500)/0.1)]'
      : 'bg-card'

  return (
    <div className={`max-w-[80%] space-y-1 ${wrapperClass}`}>
      <div className={`rounded-lg px-3 py-2 ${bubbleClass}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{authorName}</span>
          {message.is_internal && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-400">
              <Lock size={10} />
              Nota interna
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
        </div>

        <p className="whitespace-pre-wrap text-sm">{message.body}</p>

        {message.attachment_r2_key && message.attachment_filename && (
          <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-2">
            <Paperclip size={12} className="shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {message.attachment_filename}
            </span>
            {message.attachment_size_bytes && (
              <span className="text-xs text-muted-foreground">
                {formatBytes(message.attachment_size_bytes)}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              aria-label="download"
              onClick={() =>
                onDownload(
                  message.attachment_r2_key!,
                  message.ticket_id,
                  message.attachment_filename!
                )
              }
            >
              <Download size={12} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
