import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers } from '@/hooks/useUsers'
import {
  useAuditLogs,
  ENTITY_LABELS,
  ACTION_LABELS,
  type AuditLogsFilter,
} from '@/hooks/useAuditLog'
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] ?? entity
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

function metaSummary(entity: string, action: string, meta: Record<string, unknown>): string {
  if (entity === 'ecu_job' && action === 'status_changed' && meta.status) return `→ ${meta.status}`
  if (entity === 'ecu_job' && action === 'matrix_price_set' && meta.amount != null) return `R$ ${Number(meta.amount).toFixed(2)}`
  if (entity === 'financial_entry' && meta.type && meta.amount != null)
    return `${meta.type === 'income' ? 'Entrada' : 'Saída'} R$ ${Number(meta.amount).toFixed(2)}`
  if (entity === 'order' && action === 'status_changed' && meta.status) return `→ ${meta.status}`
  if (entity === 'order' && meta.total != null) return `R$ ${Number(meta.total).toFixed(2)}`
  if (entity === 'pos_sale' && meta.total != null) return `R$ ${Number(meta.total).toFixed(2)}`
  if (entity === 'monthly_closing' && meta.month && meta.year) return `${String(meta.month).padStart(2,'0')}/${meta.year}`
  if (entity === 'support_ticket' && meta.protocol) return `#${meta.protocol}`
  if (entity === 'support_ticket' && meta.status) return `→ ${meta.status}`
  if (entity === 'vehicle' && meta.customerId) return `cliente ${String(meta.customerId).slice(0,8)}…`
  return ''
}

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  created:          { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  updated:          { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  deleted:          { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  status_changed:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  matrix_price_set: { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  assigned:         { color: '#FB923C', bg: 'rgba(251,146,60,0.1)' },
}

const PAGE_SIZE = 50

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [entity,    setEntity]    = useState('')
  const [actorId,   setActorId]   = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [page,      setPage]      = useState(0)

  const { data: usersData = [] } = useUsers()

  const filter: AuditLogsFilter = {
    entity:   entity   || undefined,
    actorId:  actorId  || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading } = useAuditLogs(filter)
  const rows  = data?.rows  ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function resetFilters() {
    setEntity('')
    setActorId('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const hasFilters = entity || actorId || dateFrom || dateTo

  const inputStyle = {
    background: 'hsl(var(--pm-gray-900))',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#fff',
    borderRadius: 10,
    fontSize: 13,
    padding: '6px 12px',
    outline: 'none',
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Auditoria"
        subtitle={`${total.toLocaleString('pt-BR')} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-3 items-end"
        style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Entity filter */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[11px] text-gray-500 uppercase font-semibold">Módulo</label>
          <select
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(0) }}
            style={inputStyle}
          >
            <option value="">Todos</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Actor filter */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-[11px] text-gray-500 uppercase font-semibold">Usuário</label>
          <select
            value={actorId}
            onChange={(e) => { setActorId(e.target.value); setPage(0) }}
            style={inputStyle}
          >
            <option value="">Todos</option>
            {usersData.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 uppercase font-semibold">De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
            style={inputStyle}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 uppercase font-semibold">Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
            style={inputStyle}
          />
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Search size={32} style={{ color: 'hsl(var(--pm-gray-700))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-500))' }}>Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--pm-gray-900))' }}>
                {['Data / Hora', 'Usuário', 'Módulo', 'Ação', 'Detalhes'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'hsl(var(--pm-gray-500))' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const actionStyle = ACTION_COLORS[row.action] ?? { color: 'hsl(var(--pm-gray-400))', bg: 'transparent' }
                return (
                  <tr
                    key={row.id}
                    style={{
                      background: i % 2 === 0 ? 'hsl(var(--pm-gray-900))' : 'hsl(var(--pm-gray-800))',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'hsl(var(--pm-gray-400))', fontFamily: 'var(--pm-font-mono)', fontSize: 12 }}>
                      {fmtDateTime(row.created_at)}
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}
                      >
                        {row.actor_name ?? 'Sistema'}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-300))' }}>
                        {entityLabel(row.entity)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: actionStyle.color, background: actionStyle.bg }}
                      >
                        {actionLabel(row.action)}
                      </span>
                    </td>

                    {/* Meta summary */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        {metaSummary(row.entity, row.action, row.metadata)}
                        {row.entity_id && (
                          <span style={{ marginLeft: 6, opacity: 0.4, fontFamily: 'var(--pm-font-mono)', fontSize: 10 }}>
                            {String(row.entity_id).slice(0, 8)}…
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: 'hsl(var(--pm-gray-900))', borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Página {page + 1} de {totalPages} · {total.toLocaleString('pt-BR')} registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: 'hsl(var(--pm-gray-800))' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: 'hsl(var(--pm-gray-800))' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
