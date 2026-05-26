import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SupportChatPanel } from '@/components/support/SupportChatPanel'
import { SupportSLABadge } from '@/components/support/SupportSLABadge'
import { SupportRequesterCard } from '@/components/support/SupportRequesterCard'
import {
  useSupportTicket,
  useUpdateTicketStatus,
  useReopenTicket,
  useMarkTicketSeen,
  useAssignTicket,
  useMatrixAgents,
} from '@/hooks/useSupportTickets'
import { useAuthStore } from '@/stores/auth'
import {
  getAccountTier,
  CATEGORY_LABELS,
  type TicketStatus,
} from '@/types/app'

const STATUS_LABELS: Record<TicketStatus, string> = {
  aberto:             'Aberto',
  em_atendimento:     'Em Atendimento',
  aguardando_cliente: 'Aguardando Cliente',
  resolvido:          'Resolvido',
  fechado:            'Fechado',
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  aberto:             'text-blue-400',
  em_atendimento:     'text-amber-400',
  aguardando_cliente: 'text-purple-400',
  resolvido:          'text-green-400',
  fechado:            'text-muted-foreground',
}

const PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
}
const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'text-muted-foreground', media: 'text-foreground',
  alta: 'text-amber-400', critica: 'text-red-400',
}

const MATRIX_STATUSES: TicketStatus[] = [
  'aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado',
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SupportTicketDetail() {
  const navigate  = useNavigate()
  const prefix    = useRoutePrefix()
  const { id }    = useParams<{ id: string }>()
  const profile   = useAuthStore((s) => s.profile)
  const isMatrix  = profile ? getAccountTier(profile.role) === 'matrix' : false
  const [reopenOpen, setReopenOpen] = useState(false)

  const { data: ticket, isLoading } = useSupportTicket(id ?? '')
  const updateStatus = useUpdateTicketStatus()
  const reopen       = useReopenTicket()
  const markSeen     = useMarkTicketSeen(id ?? '')
  const assignTicket = useAssignTicket()

  const { data: agents = [] } = useMatrixAgents(isMatrix)

  const agentName = agents.find((a) => a.id === ticket?.assigned_to)?.name

  useEffect(() => {
    if (id) markSeen.mutate()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !ticket) return <div className="pm-skeleton h-96 w-full rounded" />

  const messages = [...(ticket.support_messages ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const isResolved = ticket.status === 'resolvido' || ticket.status === 'fechado'
  const canReopen  = isResolved && !isMatrix

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title={ticket.title || ticket.protocol}
        subtitle={ticket.protocol}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${prefix}/suporte`)}>
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>

            {canReopen && (
              <>
                <Button variant="outline" size="sm" disabled={reopen.isPending} onClick={() => setReopenOpen(true)}>
                  <RefreshCw size={14} className="mr-1" /> Reabrir
                </Button>
                <ConfirmDialog
                  open={reopenOpen}
                  onOpenChange={setReopenOpen}
                  title="Reabrir chamado?"
                  description="O chamado voltará para status 'Aberto' e poderá ser atendido novamente."
                  onConfirm={() => { reopen.mutateAsync(ticket.id); setReopenOpen(false) }}
                  isLoading={reopen.isPending}
                />
              </>
            )}

            {isMatrix && (
              <Select
                value={ticket.status}
                onValueChange={(v) =>
                  updateStatus.mutateAsync({ id: ticket.id, status: v as TicketStatus })
                }
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATRIX_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden gap-0 border-t border-border">
        <div className="flex-1 overflow-hidden">
          <SupportChatPanel
            ticketId={ticket.id}
            status={ticket.status}
            closedAt={isResolved ? ticket.updated_at : null}
            messages={messages}
          />
        </div>

        <div className="w-72 shrink-0 overflow-y-auto border-l border-border p-4 space-y-5">
          <div className="space-y-1">
            <span className={`text-sm font-medium ${STATUS_COLORS[ticket.status]}`}>
              {STATUS_LABELS[ticket.status]}
            </span>
            <div className="mt-1">
              <SupportSLABadge slaAt={ticket.sla_due_at} />
            </div>
          </div>

          <hr className="border-border" />

          <SupportRequesterCard requester={ticket.requester} />

          <hr className="border-border" />

          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Detalhes
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoria</span>
              <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prioridade</span>
              <span className={PRIORITY_COLORS[ticket.priority]}>
                {PRIORITY_LABELS[ticket.priority]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em</span>
              <span className="text-xs">{formatDateTime(ticket.created_at)}</span>
            </div>
            {ticket.assigned_to && isMatrix && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atribuído</span>
                <span className="text-xs">{agentName ?? '—'}</span>
              </div>
            )}
          </div>

          {isMatrix && (
            <>
              <hr className="border-border" />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Agente responsável
                </p>
                <Select
                  value={ticket.assigned_to ?? ''}
                  onValueChange={(v) =>
                    assignTicket.mutate({ id: ticket.id, agentId: v || null })
                  }
                  disabled={assignTicket.isPending}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não atribuído</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {ticket.ecu_job_id && (
            <>
              <hr className="border-border" />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  ECU Job
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate(`${prefix}/arquivos/${ticket.ecu_job_id}`)}
                >
                  Ver arquivo ECU →
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
