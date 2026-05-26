import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { useSupportTickets, type SupportTicket } from '@/hooks/useSupportTickets'
import type { TicketStatus } from '@/types/app'
import { useAuthStore } from '@/stores/auth'
import { getAccountTier, CATEGORY_LABELS } from '@/types/app'
import { SupportSLABadge } from '@/components/support/SupportSLABadge'
import { useFranchiseUnitsList } from '@/hooks/useFranchiseUnits'

const STATUS_LABELS: Record<TicketStatus, string> = {
  aberto:            'Aberto',
  em_atendimento:    'Em Atendimento',
  aguardando_cliente:'Aguardando Cliente',
  resolvido:         'Resolvido',
  fechado:           'Fechado',
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  aberto:             'text-blue-400',
  em_atendimento:     'text-amber-400',
  aguardando_cliente: 'text-purple-400',
  resolvido:          'text-green-400',
  fechado:            'text-muted-foreground',
}

const PRIORITY_COLORS: Record<string, string> = {
  baixa:   'text-muted-foreground',
  media:   'text-foreground',
  alta:    'text-amber-400',
  critica: 'text-red-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  baixa:   'Baixa',
  media:   'Média',
  alta:    'Alta',
  critica: 'Crítica',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const COLUMNS: Column<SupportTicket>[] = [
  {
    key: 'protocol',
    header: 'Protocolo',
    cell: (t) => (
      <span className="font-mono text-xs text-muted-foreground">{t.protocol}</span>
    ),
  },
  {
    key: 'title',
    header: 'Título',
    cell: (t) => <span className="text-sm text-foreground">{t.title}</span>,
  },
  {
    key: 'customers',
    header: 'Cliente',
    cell: (t) => (
      <span className="text-sm text-foreground">
        {(t.customers as { name: string } | null)?.name ?? '—'}
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Categoria',
    cell: (t) => <span className="text-sm text-foreground">{CATEGORY_LABELS[t.category] ?? t.category}</span>,
  },
  {
    key: 'priority',
    header: 'Prioridade',
    cell: (t) => (
      <span className={`text-sm font-medium ${PRIORITY_COLORS[t.priority]}`}>
        {PRIORITY_LABELS[t.priority]}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (t) => (
      <span className={`text-sm font-medium ${STATUS_COLORS[t.status]}`}>
        {STATUS_LABELS[t.status]}
      </span>
    ),
  },
  {
    key: 'sla_due_at',
    header: 'SLA',
    cell: (t) => <SupportSLABadge slaAt={t.sla_due_at} />,
  },
  {
    key: 'created_at',
    header: 'Abertura',
    cell: (t) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(t.created_at)}</span>
    ),
  },
]

export default function SupportPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const PAGE_SIZE = 20

  const profile = useAuthStore((s) => s.profile)
  const isMatrix = profile ? getAccountTier(profile.role) === 'matrix' : false
  const [unitFilter, setUnitFilter] = useState<string>('')

  const { data: units } = useFranchiseUnitsList(isMatrix)

  const { data, isLoading } = useSupportTickets({ q: search, status, page, pageSize: PAGE_SIZE, unitId: unitFilter || undefined })

  return (
    <div>
      <PageHeader
        title="Suporte"
        subtitle="Gerenciamento de chamados e tickets"
        actions={
          <Button onClick={() => navigate(`${prefix}/suporte/novo`)} style={{ background: 'var(--pm-accent-gradient)' }}>
            <Plus size={16} className="mr-2" />Novo Ticket
          </Button>
        }
      />

      <div className="mb-4 flex gap-3">
        <Select value={status || '_all'} onValueChange={(v) => { setStatus(v === '_all' ? '' : v as TicketStatus); setPage(0) }}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os status</SelectItem>
            {(Object.entries(STATUS_LABELS) as [TicketStatus, string][]).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isMatrix && (
          <Select value={unitFilter || '_all'} onValueChange={(v) => { setUnitFilter(v === '_all' ? '' : v); setPage(0) }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todas as unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as unidades</SelectItem>
              {(units ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(0) }}
        searchValue={search}
        searchPlaceholder="Buscar por protocolo..."
        onRowClick={(t) => navigate(`${prefix}/suporte/${t.id}`)}
        emptyTitle="Nenhum ticket encontrado"
        emptyDescription="Abra um novo ticket para começar."
      />
    </div>
  )
}
