import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EcuStatusBadge, STATUS_LABELS } from '@/components/shared/EcuStatusBadge'
import { useEcuJobs, useUpdateEcuJobStatus, type EcuJob } from '@/hooks/useEcuJobs'
import { BadgeStatusFinanceiro } from '@/components/shared/BadgeStatusFinanceiro'
import { useProfile } from '@/hooks/useProfile'
import { useUnseenJobs } from '@/hooks/useUnseenJobs'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { FileStatus } from '@/types/app'

// ─── Status dot indicator ──────────────────────────────────────────────────────
function StatusDot({ status, unseen }: { status: FileStatus; unseen?: boolean }) {
  if (status === 'concluido') {
    if (unseen) {
      return (
        <div className="flex items-center justify-center w-5 relative">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 7px 3px rgba(74,222,128,0.6)' }} />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center w-5">
        <Check size={12} strokeWidth={3} style={{ color: 'rgba(110,231,183,0.65)' }} />
      </div>
    )
  }
  if (status === 'cancelado') {
    return <div className="w-2 h-2 rounded-full bg-[hsl(var(--pm-gray-700))] mx-auto" />
  }
  const isNew = status === 'recebido' || status === 'em_triagem'
  return (
    <div className="flex items-center justify-center w-5">
      <div
        className="h-2.5 w-2.5 rounded-full animate-pulse"
        style={isNew
          ? { background: '#FBBF24', boxShadow: '0 0 7px 2px rgba(251,191,36,0.55)' }
          : { background: '#FB923C', boxShadow: '0 0 7px 2px rgba(251,146,60,0.55)' }
        }
      />
    </div>
  )
}

// ─── Elapsed time cell ─────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  if (ms < 60_000) return '< 1min'
  const totalMin = Math.floor(ms / 60_000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h${m > 0 ? ` ${m}min` : ''}`
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`
  return `${m}min`
}

function ElapsedCell({ createdAt, updatedAt, status, firstEntregaAt }: {
  createdAt: string
  updatedAt: string
  status: FileStatus
  firstEntregaAt?: string | null
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const isTerminal = status === 'concluido' || status === 'cancelado'

  // Relógio congela na entrega do 1º arquivo 'entrega'. Sem entrega e job
  // terminal (cancelado antes de entregar, por ex.), cai pra updated_at —
  // sem isso um job cancelado ficaria "correndo" pra sempre até o refresh.
  // eslint-disable-next-line react-hooks/purity
  const endMs = firstEntregaAt
    ? new Date(firstEntregaAt).getTime()
    : isTerminal
      ? new Date(updatedAt).getTime()
      : Date.now()

  const diffMs  = Math.max(0, endMs - new Date(createdAt).getTime())
  const diffMin = Math.floor(diffMs / 60_000)

  if (isTerminal) {
    return (
      <span className="text-xs font-mono whitespace-nowrap text-muted-foreground">
        {formatDuration(diffMs)}
      </span>
    )
  }

  const color = diffMin > 50 ? 'hsl(var(--pm-red-400))' : diffMin > 20 ? '#FBBF24' : '#4ADE80'

  return (
    <span className="text-xs font-mono whitespace-nowrap inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span style={{ color, fontWeight: diffMin > 50 ? 700 : 400 }}>{formatDuration(diffMs)}</span>
    </span>
  )
}

const STATUS_ORDER: FileStatus[] = [
  'recebido', 'em_triagem', 'em_processamento',
  'aguardando_cliente', 'concluido', 'cancelado',
]

const STATUS_FILTER_OPTIONS: { value: FileStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
]

// ─── Inline status changer (matrix-only) ──────────────────────────────────────
function StatusCell({ job, readOnly }: { job: EcuJob; readOnly?: boolean }) {
  const update = useUpdateEcuJobStatus()

  if (readOnly) return <EcuStatusBadge status={job.status} />

  function handleSelect(e: Event, newStatus: FileStatus) {
    e.stopPropagation()
    if (newStatus !== job.status) {
      update.mutate({ id: job.id, status: newStatus })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          className="flex items-center gap-1 group outline-none"
          title="Alterar status"
        >
          <EcuStatusBadge status={job.status} />
          <ChevronDown
            size={11}
            className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onClick={(e) => e.stopPropagation()}
        className="min-w-[180px]"
      >
        {STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={s === job.status || update.isPending}
            onSelect={(e) => handleSelect(e, s)}
            className="gap-2"
          >
            <EcuStatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Table columns ─────────────────────────────────────────────────────────────
function buildColumns(
  _navigate: ReturnType<typeof useNavigate>,
  isFranchise: boolean,
  unseenIds: Set<string>,
): Column<EcuJob>[] {
  const cols: Column<EcuJob>[] = [
    {
      key: 'indicator', header: '',
      className: 'w-8 pr-0',
      cell: (r) => <StatusDot status={r.status} unseen={unseenIds.has(r.id)} />,
    },
    {
      key: 'job', header: 'Job',
      cell: (r) => (
        <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1.5">
          {r.contact_finance && (
            <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
          )}
          {r.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'created_at', header: 'Data/Hora',
      cell: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.created_at)}</span>,
    },
    {
      key: 'customer', header: 'Cliente',
      cell: (r) => <span className="text-sm text-foreground">{r.customers?.name ?? '—'}</span>,
    },
    {
      key: 'vehicle', header: 'Placa/Veículo',
      cell: (r) => {
        const plate = r.vehicles?.plate ?? r.vehicle_info?.placa
        const model = r.vehicles
          ? `${r.vehicles.brand} ${r.vehicles.model}`
          : [r.vehicle_info?.marca, r.vehicle_info?.modelo].filter(Boolean).join(' ')
        return (
          <div>
            {plate && <p className="text-xs font-mono text-foreground">{plate}</p>}
            <p className="text-xs text-muted-foreground">{model || '—'}</p>
          </div>
        )
      },
    },
  ]

  if (!isFranchise) {
    cols.push({
      key: 'unit', header: 'Unidade',
      cell: (r) => {
        const u = r.franchise_units as { name: string; city: string | null; state: string | null } | null
        if (u) {
          return (
            <div>
              <p className="text-xs text-foreground">{u.name}</p>
              {u.city && <p className="text-xs text-muted-foreground">{u.city}/{u.state}</p>}
            </div>
          )
        }
        const creatorName = r.creator_profile?.name
        const firstName = creatorName ? creatorName.trim().split(' ')[0] : null
        return (
          <span className="text-xs font-mono text-amber-400">
            MATRIZ{firstName ? ` — ${firstName}` : ''}
          </span>
        )
      },
    })
  }

  cols.push(
    { key: 'service_type', header: 'Serviço', cell: (r) => <span className="text-sm">{r.service_type}</span> },
    {
      key: 'status', header: 'Status',
      cell: (r) => <StatusCell job={r} readOnly={isFranchise} />,
    },
    {
      key: 'elapsed', header: 'Tempo',
      cell: (r) => (
        <ElapsedCell
          createdAt={r.created_at}
          updatedAt={r.updated_at}
          status={r.status}
          firstEntregaAt={r.first_entrega_at}
        />
      ),
    },
    {
      // Valor que a franquia deve à matriz (custo dela). Job direto matriz-
      // cliente não tem repasse — amount_charged_by_matrix fica null, célula
      // vazia. Badge de status de pagamento fica aqui quando é job de
      // franquia — é o valor que efetivamente vira financial_entries nesse
      // caso (mesma regra que já valia na coluna "Financeiro" antiga).
      key: 'valor_custo', header: 'Valor Custo',
      cell: (r) => {
        if (r.amount_charged_by_matrix == null) return null
        const isFranchiseJob = r.unit_id !== null
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-foreground">{formatCurrency(r.amount_charged_by_matrix)}</span>
            {isFranchiseJob && <BadgeStatusFinanceiro status={r.matrix_payment_status} />}
          </div>
        )
      },
    },
    {
      // Valor cobrado do cliente final. Em job direto (sem franquia), é
      // esse valor que vira financial_entries — badge fica aqui nesse caso.
      key: 'valor_cliente', header: 'Valor Cliente',
      cell: (r) => {
        if (r.amount_charged_to_customer == null) return null
        const isFranchiseJob = r.unit_id !== null
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-foreground">{formatCurrency(r.amount_charged_to_customer)}</span>
            {!isFranchiseJob && <BadgeStatusFinanceiro status={r.matrix_payment_status} />}
          </div>
        )
      },
    },
  )

  return cols
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function EcuJobsPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const { isFranchiseUser } = useProfile()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<FileStatus | ''>('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data, isLoading } = useEcuJobs({ q, status, page, pageSize: PAGE_SIZE })
  const isFranchise = isFranchiseUser()
  const { unseenIds } = useUnseenJobs()

  const COLUMNS = buildColumns(navigate, isFranchise, unseenIds)

  return (
    <div>
      <PageHeader
        title="Arquivos ECU"
        subtitle="Gestão de jobs de remapeamento e tuning"
      />

      {/* Filter bar + Novo Arquivo */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            value={status || '_all'}
            onValueChange={(v) => { setStatus(v === '_all' ? '' : v as FileStatus); setPage(0) }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <PermissionGuard module="ecu_arquivos" action="create">
            <Button
              onClick={() => navigate(`${prefix}/arquivos/novo`)}
              style={{ background: 'var(--pm-accent-gradient)' }}
            >
              <Plus size={16} className="mr-2" />
              Novo Arquivo
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(v) => { setQ(v); setPage(0) }}
        searchValue={q}
        searchPlaceholder="Buscar por cliente, CPF, placa ou serviço..."
        onRowClick={(r) => navigate(`${prefix}/arquivos/${r.id}`)}
        rowClassName={(r) => r.contact_finance ? 'bg-red-500/[0.08] hover:bg-red-500/[0.14] border-l-2 border-l-red-500' : undefined}
        emptyTitle="Nenhum job ECU"
        emptyDescription="Clique em Novo Arquivo para registrar o primeiro."
      />
    </div>
  )
}
