import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Files, UserPlus, ShoppingCart, TrendingUp, TrendingDown, MapPin, Award, AlertTriangle, ChevronRight } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { MetricCard } from '@/components/shared/MetricCard'
import { EcuStatusBadge } from '@/components/shared/EcuStatusBadge'
import { useMatrixDashboard, type DashboardPeriod } from '@/hooks/useMatrixDashboard'
import { formatCurrency } from '@/lib/utils'
import type { FileStatus } from '@/types/app'

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'all',   label: 'Tudo' },
]

function MiniBar({ value, max, color = 'hsl(var(--pm-red-500))' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div className="h-1.5 rounded-full bg-[hsl(var(--pm-gray-700))] overflow-hidden w-full">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [period, setPeriod] = useState<DashboardPeriod>('month')

  const { data: metrics, isLoading } = useMatrixDashboard(period)

  const maxStateCount   = Math.max(1, ...(metrics?.stateRanking.map(s => s.count) ?? []))
  const maxServiceCount = Math.max(1, ...(metrics?.serviceTypeRanking.map(s => s.count) ?? []))
  const maxUnitCount    = Math.max(1, ...(metrics?.topUnits.map(u => u.count) ?? []))

  return (
    <div>
      {/* Quick actions */}
      <div className="pm-accent-line">Ações Rápidas</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {/* Red: Enviar Arquivo */}
        <button
          onClick={() => navigate(`${prefix}/arquivos/novo`)}
          className="hover:scale-[1.025] active:scale-[0.98] transition-transform"
          style={{
            background: 'var(--pm-accent-gradient)',
            borderRadius: 12,
            padding: '18px 20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textAlign: 'left',
            boxShadow: '0 4px 24px rgba(177,40,37,0.22)',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Files size={20} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, marginBottom: 3 }}>Enviar Arquivo</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: 0 }}>Novo arquivo ECU</p>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
        </button>

        {/* Blue: Novo Cliente */}
        <button
          onClick={() => navigate(`${prefix}/clientes/novo`)}
          className="hover:scale-[1.025] active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
            borderRadius: 12,
            padding: '18px 20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textAlign: 'left',
            boxShadow: '0 4px 24px rgba(96,165,250,0.22)',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserPlus size={20} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, marginBottom: 3 }}>Novo Cliente</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: 0 }}>Cadastrar cliente</p>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
        </button>

        {/* Green: Nova Venda */}
        <button
          onClick={() => navigate(`${prefix}/pdv`)}
          className="hover:scale-[1.025] active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
            borderRadius: 12,
            padding: '18px 20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textAlign: 'left',
            boxShadow: '0 4px 24px rgba(52,211,153,0.22)',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCart size={20} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, marginBottom: 3 }}>Nova Venda</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: 0 }}>Abrir PDV</p>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 mb-4">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              period === p.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground bg-[hsl(var(--pm-gray-800))] hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="Total de Arquivos"
          value={isLoading ? '…' : String(metrics?.totalJobs ?? 0)}
          trend="neutral"
        />
        <MetricCard
          label="Receita (R$)"
          value={isLoading ? '…' : formatCurrency(metrics?.totalRevenue ?? 0)}
          trend="up"
        />
        <div
          className="cursor-pointer rounded-xl transition-all"
          onClick={() => navigate(`${prefix}/arquivos`)}
          title="Ver arquivos aguardando"
          style={(metrics?.pendingJobs ?? 0) > 0
            ? { boxShadow: '0 0 0 1.5px hsl(var(--pm-red-500)/0.6)', borderRadius: 12 }
            : undefined}
        >
          <MetricCard
            label="Arquivos Recebidos"
            value={isLoading ? '…' : String(metrics?.pendingJobs ?? 0)}
            trend={(metrics?.pendingJobs ?? 0) > 0 ? 'up' : 'neutral'}
            description={(metrics?.pendingJobs ?? 0) > 0 ? 'aguardando' : 'em dia'}
          />
        </div>
        <MetricCard
          label="Últimos 7 Dias"
          value={isLoading ? '…' : String(metrics?.weekJobs ?? 0)}
          trend="neutral"
        />
      </div>

      {/* State ranking + Service type ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* State ranking */}
        <div className="pm-card space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking por Estado</span>
          </div>
          {isLoading || !metrics ? (
            <div className="pm-skeleton h-40 rounded" />
          ) : metrics.stateRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics.stateRanking.map((s, i) => (
                <div key={s.state}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <span className="text-sm font-medium text-foreground">{s.state}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-xs text-muted-foreground w-16">{s.count} arq.</span>
                      <span className="text-xs font-medium text-[hsl(var(--pm-green-400))] w-28">{formatCurrency(s.revenue)}</span>
                    </div>
                  </div>
                  <MiniBar value={s.count} max={maxStateCount} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service type ranking */}
        <div className="pm-card space-y-3">
          <div className="flex items-center gap-2">
            <Files size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipos de Arquivo mais Produzidos</span>
          </div>
          {isLoading || !metrics ? (
            <div className="pm-skeleton h-40 rounded" />
          ) : metrics.serviceTypeRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics.serviceTypeRanking.map((s, i) => (
                <div key={s.serviceType}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                      <span className="text-sm text-foreground truncate">{s.serviceType}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground ml-2 shrink-0">{s.count}</span>
                  </div>
                  <MiniBar value={s.count} max={maxServiceCount} color="hsl(var(--pm-blue-400, 210 80% 56%))" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 + Bottom 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Top 5 */}
        <div className="pm-card space-y-3">
          <div className="flex items-center gap-2">
            <Award size={14} className="text-[hsl(var(--pm-green-400))]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top 5 Melhores Unidades</span>
          </div>
          {isLoading || !metrics ? (
            <div className="pm-skeleton h-40 rounded" />
          ) : metrics.topUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topUnits.map((u, i) => (
                <div key={u.unitId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        {u.city && <p className="text-xs text-muted-foreground">{u.city}/{u.state}</p>}
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-xs text-foreground font-medium">{u.count} arq.</p>
                      <p className="text-xs text-[hsl(var(--pm-green-400))]">{formatCurrency(u.revenue)}</p>
                    </div>
                  </div>
                  <MiniBar value={u.count} max={maxUnitCount} color="hsl(var(--pm-green-400))" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 5 */}
        <div className="pm-card space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[hsl(var(--pm-amber-400))]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidades com Menor Volume</span>
          </div>
          {isLoading || !metrics ? (
            <div className="pm-skeleton h-40 rounded" />
          ) : metrics.bottomUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics.bottomUnits.map((u, i) => (
                <div key={u.unitId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        {u.city && <p className="text-xs text-muted-foreground">{u.city}/{u.state}</p>}
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-xs text-foreground font-medium">{u.count} arq.</p>
                      <p className="text-xs text-[hsl(var(--pm-amber-400))]">{formatCurrency(u.revenue)}</p>
                    </div>
                  </div>
                  <MiniBar value={u.count} max={maxUnitCount} color="hsl(var(--pm-amber-400))" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status volume */}
      <div className="pm-card space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume por Status</span>
        </div>
        {isLoading ? (
          <div className="pm-skeleton h-16 rounded" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(metrics?.statusVolume ?? []).map(sv => (
              <div key={sv.status} className="rounded-lg bg-[hsl(var(--pm-gray-900))] p-3 text-center">
                <p className="text-xl font-bold text-foreground">{sv.count}</p>
                <div className="mt-1 flex justify-center">
                  <EcuStatusBadge status={sv.status as FileStatus} />
                </div>
              </div>
            ))}
            {(metrics?.statusVolume ?? []).length === 0 && (
              <p className="col-span-6 text-sm text-muted-foreground text-center py-2">Sem dados para o período.</p>
            )}
          </div>
        )}
      </div>

      {/* Revenue trend placeholder */}
      <div className="mt-6 pm-card flex items-center gap-3 py-6 justify-center text-muted-foreground">
        <TrendingDown size={18} />
        <span className="text-sm">Gráfico de evolução de receita — disponível em breve.</span>
      </div>
    </div>
  )
}
