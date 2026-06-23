import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Database, ChevronRight, TrendingUp, Files, Clock, CheckCircle } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useEcuJobs } from '@/hooks/useEcuJobs'
import { useMyUnit } from '@/hooks/useMyUnit'
import { EcuStatusBadge } from '@/components/shared/EcuStatusBadge'
import { formatCurrency } from '@/lib/utils'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return formatCurrency(n)
}

function MiniBar({ pct, color = 'hsl(var(--pm-red-500))' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[hsl(var(--pm-gray-800))] overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(3, pct)}%`, background: color }}
      />
    </div>
  )
}

function KpiCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="pm-card p-5 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest font-mono text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function QuickCard({
  label, sub, gradient, shadow, icon: Icon, to,
}: {
  label: string; sub: string
  gradient: string; shadow: string
  icon: React.ElementType; to: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="hover:scale-[1.025] active:scale-[0.98] transition-transform"
      style={{
        background: gradient,
        borderRadius: 12,
        padding: '18px 20px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        boxShadow: shadow,
        width: '100%',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} style={{ color: 'white' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: 0 }}>{sub}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
    </button>
  )
}

export default function FranqueadoDashboard() {
  const { data: myUnit, isLoading: unitLoading } = useMyUnit()
  const { data: jobsData, isLoading: jobsLoading } = useEcuJobs({ pageSize: 200 })
  const prefix = useRoutePrefix()
  const navigate = useNavigate()
  const isLoading = unitLoading || jobsLoading

  const myJobs = useMemo(
    () => (jobsData?.data ?? []).filter(j => !myUnit || j.unit_id === myUnit.unit_id),
    [jobsData, myUnit]
  )

  const activeJobs = useMemo(
    () => myJobs.filter(j => j.status !== 'cancelado'),
    [myJobs]
  )

  const inProgressJobs = useMemo(
    () => myJobs.filter(j => ['recebido', 'em_triagem', 'em_processamento', 'aguardando_cliente'].includes(j.status)),
    [myJobs]
  )

  const completedJobs = useMemo(
    () => myJobs.filter(j => j.status === 'concluido'),
    [myJobs]
  )

  const faturamento = useMemo(
    () => activeJobs.reduce((sum, j) => sum + (j.amount_charged_to_customer ?? 0), 0),
    [activeJobs]
  )

  const ticketMedio = activeJobs.length > 0 ? faturamento / activeJobs.length : 0

  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    activeJobs.forEach(j => {
      const key = j.service_type || 'Outro'
      map[key] = (map[key] ?? 0) + (j.amount_charged_to_customer ?? 0)
    })
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: faturamento > 0 ? (value / faturamento) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [activeJobs, faturamento])

  const recentJobs = useMemo(
    () => [...myJobs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [myJobs]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="pm-skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="pm-skeleton h-28 rounded-xl" />)}
        </div>
        <div className="pm-skeleton h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Faturamento Total"
          value={fmt(faturamento)}
          sub={`${activeJobs.length} serviços`}
          color="#34D399"
        />
        <KpiCard
          label="Serviços Realizados"
          value={String(completedJobs.length)}
          sub="concluídos"
          color="#F8FAFC"
        />
        <KpiCard
          label="Ticket Médio"
          value={fmt(ticketMedio)}
          color="#FBBF24"
        />
        <KpiCard
          label="Em Andamento"
          value={String(inProgressJobs.length)}
          sub="aguardando processamento"
          color="hsl(var(--pm-red-400))"
        />
      </div>

      {/* Quick actions + Service breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Ações Rápidas */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-mono">
            Ações Rápidas
          </p>
          <QuickCard
            label="Enviar Arquivo"
            sub="Novo arquivo ECU"
            to={`${prefix}/arquivos/novo`}
            icon={Upload}
            gradient="var(--pm-accent-gradient)"
            shadow="0 4px 24px rgba(177,40,37,0.22)"
          />
          <QuickCard
            label="Tabela de Remap"
            sub="Consultar catálogo"
            to={`${prefix}/tabela-remap`}
            icon={Database}
            gradient="linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)"
            shadow="0 4px 24px rgba(96,165,250,0.22)"
          />
          <QuickCard
            label="Meus Arquivos"
            sub="Ver histórico de jobs"
            to={`${prefix}/arquivos`}
            icon={Files}
            gradient="linear-gradient(135deg, #059669 0%, #34D399 100%)"
            shadow="0 4px 24px rgba(52,211,153,0.18)"
          />
        </div>

        {/* Service type breakdown */}
        <div className="lg:col-span-2 pm-card">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento por Tipo de Serviço
            </span>
          </div>

          {byType.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Clock size={28} className="text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhum serviço registrado ainda.</p>
              <p className="text-xs text-muted-foreground opacity-60">Os dados aparecerão após o primeiro job ECU.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {byType.map(({ label, value, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground truncate max-w-[55%] font-medium">{label}</span>
                    <span className="text-muted-foreground font-mono shrink-0 ml-2">
                      {fmt(value)} <span className="opacity-50">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <MiniBar pct={pct} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent ECU jobs */}
      <div className="pm-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Últimos Arquivos ECU
            </span>
          </div>
          </div>

        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Files size={28} className="text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Nenhum job enviado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--pm-gray-800))]">
                  <th className="text-left text-muted-foreground font-medium pb-3 pr-4">Cliente</th>
                  <th className="text-left text-muted-foreground font-medium pb-3 pr-4">Veículo</th>
                  <th className="text-left text-muted-foreground font-medium pb-3 pr-4">Serviço</th>
                  <th className="text-left text-muted-foreground font-medium pb-3 pr-4">Status</th>
                  <th className="text-right text-muted-foreground font-medium pb-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--pm-gray-800)/0.5)]">
                {recentJobs.map(job => (
                  <tr
                    key={job.id}
                    className="hover:bg-[hsl(var(--pm-gray-800)/0.4)] transition-colors cursor-pointer"
                    onClick={() => navigate(`${prefix}/arquivos/${job.id}`)}
                  >
                    <td className="py-3 pr-4">
                      <span className="text-foreground font-medium">
                        {job.customers?.name ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {job.vehicles ? `${job.vehicles.brand} ${job.vehicles.model}` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground max-w-[160px] truncate">
                      {job.service_type || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <EcuStatusBadge status={job.status} />
                    </td>
                    <td className="py-3 text-right text-muted-foreground font-mono">
                      {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
