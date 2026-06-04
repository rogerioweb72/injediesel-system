import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Plus, ChevronDown, Check } from 'lucide-react'
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
import type { FileStatus, PriorityLevel } from '@/types/app'

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
function ElapsedCell({ createdAt, status }: { createdAt: string; status: FileStatus }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  if (status === 'concluido' || status === 'cancelado') {
    return (
      <span className="text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleDateString('pt-BR')}
      </span>
    )
  }

  // eslint-disable-next-line react-hooks/purity
  const diffMs    = Date.now() - new Date(createdAt).getTime()
  const diffMin   = Math.floor(diffMs / 60_000)
  const diffH     = Math.floor(diffMin / 60)
  const diffD     = Math.floor(diffH / 24)
  const isWarning = diffH >= 12 && diffH < 24
  const isLate    = diffH >= 24

  let label: string
  if (diffMin < 1) {
    label = 'chegou há: < 1min'
  } else if (diffMin < 60) {
    label = `chegou há: ${diffMin}min`
  } else if (diffH < 12) {
    const m = diffMin % 60
    label = `chegou há: ${diffH}h${m > 0 ? ` ${m}min` : ''}`
  } else if (diffH < 24) {
    const m = diffMin % 60
    label = `⚠ em aberto: ${diffH}h${m > 0 ? ` ${m}min` : ''}`
  } else {
    const h = diffH % 24
    const m = diffMin % 60
    label = `atrasado!: ${diffD}D ${h}h${m > 0 ? ` ${m}min` : ''}`
  }

  return (
    <span
      className="text-xs font-mono whitespace-nowrap"
      style={{
        color: isLate ? 'hsl(var(--pm-red-400))' : isWarning ? '#FBBF24' : 'hsl(var(--pm-gray-400))',
        fontWeight: isLate || isWarning ? 700 : 400,
      }}
    >
      {label}
    </span>
  )
}

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  normal: 'Normal',
  alta: 'Alta',
  critica: 'Crítica',
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
      key: 'customer', header: 'Cliente',
      cell: (r) => <span className="text-sm text-foreground">{r.customers?.name ?? '—'}</span>,
    },
    {
      key: 'vehicle', header: 'Veículo',
      cell: (r) => {
        const label = r.vehicles
          ? `${r.vehicles.brand} ${r.vehicles.model}`
          : [r.vehicle_info?.marca, r.vehicle_info?.modelo].filter(Boolean).join(' ') || '—'
        return <span className="text-sm text-muted-foreground">{label}</span>
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
      key: 'priority', header: 'Prio.',
      cell: (r) => (
        <span className={r.priority === 'critica' ? 'text-[hsl(var(--pm-red-400))] font-medium text-xs' : 'text-xs text-muted-foreground'}>
          {PRIORITY_LABELS[r.priority]}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <StatusCell job={r} readOnly={isFranchise} />,
    },
    {
      key: 'elapsed', header: 'Tempo',
      cell: (r) => <ElapsedCell createdAt={r.created_at} status={r.status} />,
    },
    {
      key: 'financeiro', header: 'Financeiro',
      cell: (r) => r.amount_charged_by_matrix != null
        ? <BadgeStatusFinanceiro status={r.matrix_payment_status} />
        : null,
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
        searchPlaceholder="Buscar por tipo de serviço..."
        onRowClick={(r) => navigate(`${prefix}/arquivos/${r.id}`)}
        emptyTitle="Nenhum job ECU"
        emptyDescription="Clique em Novo Arquivo para registrar o primeiro."
      />
    </div>
  )
}
