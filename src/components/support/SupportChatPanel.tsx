// src/components/support/SupportChatPanel.tsx
import { useRef, useState, useEffect } from 'react'
import { Send, Paperclip, X, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SupportMessageBubble } from './SupportMessageBubble'
import { useSupportChat } from '@/hooks/useSupportChat'
import { useAuthStore } from '@/stores/auth'
import { getAccountTier } from '@/types/app'
import type { SupportMessage } from '@/hooks/useSupportTickets'
import type { TicketStatus } from '@/types/app'

const ACTIVE_STATUSES: TicketStatus[] = ['aberto', 'em_atendimento', 'aguardando_cliente']

interface Props {
  ticketId: string
  status: TicketStatus
  closedAt?: string | null
  messages: SupportMessage[]
}

export function SupportChatPanel({ ticketId, status, closedAt, messages }: Props) {
  const isActive = ACTIVE_STATUSES.includes(status)
  const profile = useAuthStore((s) => s.profile)
  const isMatrix = profile ? getAccountTier(profile.role) === 'matrix' : false
  const userId = useAuthStore((s) => s.user?.id)

  const { sendMessage, downloadAttachment } = useSupportChat(ticketId, isActive)

  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const visibleMessages = isMatrix
    ? messages
    : messages.filter((m) => !m.is_internal)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages.length])

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed && !file) return
    setSending(true)
    try {
      await sendMessage({ ticketId, body: trimmed, isInternal, file: file ?? undefined })
      setBody('')
      setFile(null)
      setIsInternal(false)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {visibleMessages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma mensagem ainda.
          </p>
        )}
        {visibleMessages.map((msg) => (
          <SupportMessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.author_id === userId}
            onDownload={downloadAttachment}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {isActive ? (
        <div className="border-t border-border p-3 space-y-2">
          {file && (
            <div className="flex items-center gap-2 rounded bg-card px-3 py-1.5 text-xs">
              <Paperclip size={12} className="text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <button onClick={() => setFile(null)}>
                <X size={12} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? 'Nota interna (só visível para a equipe)...' : 'Mensagem... (Ctrl+Enter para enviar)'}
            className="min-h-[80px] resize-none text-sm"
            disabled={sending}
          />

          <div className="flex items-center gap-3">
            {isMatrix && (
              <div className="flex items-center gap-2">
                <Switch
                  id="internal-toggle"
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                  disabled={sending}
                />
                <Label htmlFor="internal-toggle" className="flex items-center gap-1 text-xs cursor-pointer">
                  <Lock size={11} />
                  Nota interna
                </Label>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.bin,.hex,.ori,.ori2,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
              >
                <Paperclip size={14} />
              </Button>

              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || (!body.trim() && !file)}
                className="h-8"
              >
                <Send size={14} className="mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Chamado encerrado
            {closedAt
              ? ` em ${new Date(closedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : ''}
             — histórico somente leitura
          </p>
        </div>
      )}
    </div>
  )
}
