import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Users, ShoppingCart, TrendingUp, Download,
  CheckCircle, Clock, MapPin, Award, AlertTriangle,
  Store, Wallet, Percent,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { useMatrixDashboard, type DashboardPeriod } from '@/hooks/useMatrixDashboard'
import { useNewFranchiseJobsCount } from '@/hooks/useNotifications'
import { formatCurrency } from '@/lib/utils'

const PIE_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#9CA3AF', '#F59E0B', '#A78BFA']

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'all',   label: 'Tudo' },
]

export default function Dashboard() {
  const navigate   = useNavigate()
  const prefix     = useRoutePrefix()
  const [period, setPeriod] = useState<DashboardPeriod>('month')

  const { data: metrics, isLoading } = useMatrixDashboard(period)
  const { data: newFranchiseJobs = 0 } = useNewFranchiseJobsCount()

  const pieData = (metrics?.serviceTypeRanking ?? []).map((s, i) => ({
    name: s.serviceType,
    value: s.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const maxState = Math.max(1, ...(metrics?.stateRanking.map(s => s.count) ?? []))

  return (
    <div className="relative">
      {/* Ambient light blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px]" />

      {/* Quick actions + period filter */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 mb-8">
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <QuickActionButton
            icon={<FileText size={22} />}
            title="Enviar Arquivo"
            subtitle="Novo arquivo ECU"
            color="from-blue-700 to-blue-500"
            shadow="shadow-blue-900/30"
            onClick={() => { navigate(`${prefix}/arquivos/novo`) }}
          />
          <QuickActionButton
            icon={<Users size={22} />}
            title="Novo Cliente"
            subtitle="Cadastrar cliente"
            color="from-blue-700 to-blue-500"
            shadow="shadow-blue-900/30"
            onClick={() => { navigate(`${prefix}/clientes/novo`) }}
          />
          <QuickActionButton
            icon={<ShoppingCart size={22} />}
            title="Nova Venda"
            subtitle="Abrir PDV"
            color="from-emerald-700 to-emerald-500"
            shadow="shadow-emerald-900/30"
            onClick={() => { navigate(`${prefix}/pdv`) }}
          />
        </div>

        <div className="bg-[#1C1D26] p-1 rounded-lg flex border border-gray-800/80 self-start xl:self-auto shrink-0">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                period === p.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta: novos jobs de franquia aguardando */}
      {newFranchiseJobs > 0 && (
        <button
          onClick={() => navigate(`${prefix}/arquivos`)}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl mb-8 text-left transition-colors hover:bg-blue-500/[0.08]"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)' }}
        >
          <Clock size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#60A5FA' }}>
            <strong>{newFranchiseJobs}</strong> arquivo{newFranchiseJobs === 1 ? '' : 's'} novo{newFranchiseJobs === 1 ? '' : 's'} de franquia aguardando processamento
          </p>
        </button>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          title="Total de Arquivos"
          value={isLoading ? '…' : String(metrics?.totalJobs ?? 0)}
          icon={<FileText size={18} className="text-gray-400" />}
        />
        <KpiCard
          title="Receita Bruta"
          value={isLoading ? '…' : formatCurrency(metrics?.totalRevenue ?? 0)}
          icon={<TrendingUp size={18} className="text-green-400" />}
          highlight
        />
        <KpiCard
          title="Arquivos na Fila"
          value={isLoading ? '…' : String(metrics?.pendingJobs ?? 0)}
          subtitle="aguardando processamento"
          icon={<Clock size={18} className="text-yellow-500" />}
        />
        <KpiCard
          title="Últimos 7 Dias"
          value={isLoading ? '…' : String(metrics?.weekJobs ?? 0)}
          icon={<CheckCircle size={18} className="text-blue-400" />}
        />
      </div>

      {/* KPI grid — financeiro matriz x franquia */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <KpiCard
          title="Venda Bruta Franquias"
          value={isLoading ? '…' : formatCurrency(metrics?.franchiseGrossRevenue ?? 0)}
          subtitle="cobrado do cliente final pelas franquias"
          icon={<Store size={18} className="text-blue-400" />}
        />
        <KpiCard
          title="Receita da Matriz"
          value={isLoading ? '…' : formatCurrency(metrics?.matrixRevenue ?? 0)}
          subtitle="repassado pelas franquias à matriz"
          icon={<Wallet size={18} className="text-green-400" />}
          highlight
        />
        <KpiCard
          title="Margem das Franquias"
          value={isLoading ? '…' : formatCurrency(metrics?.franchiseMargin ?? 0)}
          subtitle="venda bruta − repasse à matriz"
          icon={<Percent size={18} className="text-yellow-500" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">

        {/* Area chart — revenue evolution, dado real por dia no período selecionado */}
        <div className="xl:col-span-2 bg-[#16171E] border border-gray-800/70 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Evolução de Receita</h3>
              <p className="text-sm text-gray-500">Por dia — {PERIODS.find(p => p.value === period)?.label}</p>
            </div>
            <button className="p-2 bg-[#1C1D26] hover:bg-gray-700 rounded-lg border border-gray-700/50 transition-colors">
              <Download size={15} className="text-gray-400" />
            </button>
          </div>
          <div className="h-[260px] flex items-center justify-center">
            {isLoading ? (
              <div className="w-full h-full rounded bg-gray-800/40 animate-pulse" />
            ) : (metrics?.revenueEvolution ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">Ainda sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics!.revenueEvolution} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A35" />
                  <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v / 1000}k`} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#gradRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut chart — file types from real serviceTypeRanking data */}
        <div className="bg-[#16171E] border border-gray-800/70 rounded-2xl p-6 flex flex-col">
          <div>
            <h3 className="text-lg font-semibold text-white">Tipos de Arquivo</h3>
            <p className="text-sm text-gray-500">Distribuição dos mais produzidos</p>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center relative min-h-[260px]">
            {isLoading ? (
              <div className="w-40 h-40 rounded-full bg-gray-800/40 animate-pulse" />
            ) : pieData.length === 0 ? (
              <p className="text-sm text-gray-500 py-12">Sem dados para o período.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-10px' }}>
                  <span className="text-2xl font-bold text-white">{metrics?.totalJobs ?? 0}</span>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                </div>
                <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  {pieData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rankings row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Ranking por Estado */}
        <div className="bg-[#16171E] border border-gray-800/70 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
            <MapPin size={16} className="text-blue-500" /> Ranking por Estado
          </h3>
          {isLoading ? (
            <div className="h-44 rounded bg-gray-800/40 animate-pulse" />
          ) : (metrics?.stateRanking ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sem dados para o período.</p>
          ) : (
            <div className="space-y-4">
              {metrics!.stateRanking.slice(0, 5).map((s, i) => (
                <div key={s.state}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-200">{i + 1}. {s.state}</span>
                    <div className="flex gap-3">
                      <span className="text-gray-400">{s.count} arq.</span>
                      <span className="text-green-400 font-medium">{formatCurrency(s.revenue)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700 ease-out relative"
                      style={{ width: `${Math.max(4, (s.count / maxState) * 100)}%`, backgroundColor: PIE_COLORS[i] }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-60" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Melhores Unidades */}
        <div className="bg-[#16171E] border border-gray-800/70 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
            <Award size={16} className="text-yellow-500" /> Top Melhores Unidades
          </h3>
          {isLoading ? (
            <div className="h-44 rounded bg-gray-800/40 animate-pulse" />
          ) : (metrics?.topUnits ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics!.topUnits.slice(0, 3).map((u, i) => (
                <div key={u.unitId} className="flex items-center justify-between p-3 rounded-xl bg-[#1C1D26] border border-gray-800/50 hover:border-gray-700 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{u.name}</p>
                      {u.city && <p className="text-xs text-gray-500">{u.city}/{u.state}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-medium text-green-400">{formatCurrency(u.revenue)}</p>
                    <p className="text-xs text-gray-500">{u.count} arquivos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requer Atenção */}
        <div className="bg-[#16171E] border border-gray-800/70 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" /> Requer Atenção
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-orange-500/10 text-orange-500 rounded-md">Menor Volume</span>
          </div>
          {isLoading ? (
            <div className="h-44 rounded bg-gray-800/40 animate-pulse" />
          ) : (metrics?.bottomUnits ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sem dados para o período.</p>
          ) : (
            <div className="space-y-3">
              {metrics!.bottomUnits.slice(0, 3).map(u => (
                <div key={u.unitId} className="flex items-center justify-between p-3 rounded-xl bg-orange-950/10 border border-orange-900/20 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <AlertTriangle size={13} className="text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{u.name}</p>
                      {u.city && <p className="text-xs text-gray-500">{u.city}/{u.state}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-medium text-orange-400">{formatCurrency(u.revenue)}</p>
                    <p className="text-xs text-gray-500">{u.count} arquivos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function QuickActionButton({
  icon, title, subtitle, color, shadow, onClick,
}: {
  icon: ReactNode; title: string; subtitle: string
  color: string; shadow: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden flex-1 min-w-[190px] p-4 rounded-2xl bg-gradient-to-r ${color} ${shadow} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 text-left group`}
    >
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors" />
      <div className="flex items-center gap-3 relative z-10">
        <div className="bg-white/20 p-2.5 rounded-xl text-white">{icon}</div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">{title}</p>
          <p className="text-white/75 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
    </button>
  )
}

function KpiCard({
  title, value, subtitle, icon, highlight = false,
}: {
  title: string; value: string; subtitle?: string
  icon: ReactNode; highlight?: boolean
}) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
      highlight
        ? 'bg-gradient-to-br from-[#1A1C23] to-[#12131A] border-gray-700/60'
        : 'bg-[#16171E] border-gray-800/70'
    }`}>
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        <div className="p-2 bg-[#1C1D26] rounded-lg border border-gray-800/50">{icon}</div>
      </div>
      <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1C1D26] border border-gray-700 p-3 rounded-xl shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1C1D26] border border-gray-700 p-3 rounded-xl shadow-xl flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: payload[0].payload.color }} />
      <div>
        <p className="text-gray-400 text-xs">{payload[0].name}</p>
        <p className="text-white font-bold text-sm">{payload[0].value} arquivos</p>
      </div>
    </div>
  )
}
