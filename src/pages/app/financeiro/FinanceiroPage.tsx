import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProfile } from '@/hooks/useProfile'
import {
  usePendingPayments, useEcuReceipts, useMatrixFranchiseBilling, useOpenEcuJobs, useOpenOrders,
  type PendingPayment, type OpenEcuJob, type OpenOrder,
} from '@/hooks/useCaixa'
import { useLancamentos, useDeleteLancamento, CATEGORIA_LABELS, type Lancamento } from '@/hooks/useLancamentos'
import { NovoLancamentoModal } from '@/pages/app/caixa/NovoLancamentoModal'
import {
  CreditCard, Loader2, CheckCircle2, Plus,
  TrendingUp, TrendingDown, Scale, Trash2, FileEdit, Receipt, Building2, AlertTriangle,
} from 'lucide-react'
import { EcuPaymentSheet } from '@/components/shared/EcuPaymentSheet'
import { EcuStatusBadge } from '@/components/shared/EcuStatusBadge'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import type { FileStatus } from '@/types/app'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FranquiasTab from '@/pages/app/financeiro/FranquiasTab'
import { useUnseenFranchiseCount } from '@/hooks/useFranquiasFinanceiro'

function fmtBRL(value: number) {
  return Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SummaryCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="p-2.5 rounded-lg" style={{ background: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
          {label}
        </p>
        <p className="text-lg font-bold mt-0.5" style={{ color }}>{fmtBRL(value)}</p>
      </div>
    </div>
  )
}


function LancamentoRow({ item, unitId }: { item: Lancamento; unitId: string | null }) {
  const deleteLancamento = useDeleteLancamento()
  const isReceita = item.type === 'receita'
  const isAjuste  = item.type === 'ajuste'
  const isRascunho = item.status === 'rascunho'
  const amountColor = isReceita ? '#4ADE80' : isAjuste ? '#FBBF24' : '#F87171'
  const amountSign  = isReceita ? '+' : isAjuste ? (item.amount >= 0 ? '+' : '') : '-'

  return (
    <div className="flex items-center gap-4 px-4 py-3 group" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: amountColor, boxShadow: `0 0 6px ${amountColor}88` }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">
            {item.categoria ? (CATEGORIA_LABELS[item.categoria] ?? item.categoria) : '—'}
          </span>
          {item.subcategoria && <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>· {item.subcategoria}</span>}
          {isRascunho && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}>
              Rascunho
            </span>
          )}
          {item.recorrente && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
              Recorrente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.data_competencia && <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>{fmtDate(item.data_competencia)}</span>}
          {item.centro_de_custo && <span className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>· {item.centro_de_custo}</span>}
          {item.description && <span className="text-xs truncate max-w-[200px]" style={{ color: 'hsl(var(--pm-gray-600))' }}>· {item.description}</span>}
        </div>
      </div>
      <span className="font-semibold text-sm shrink-0" style={{ color: amountColor }}>{amountSign}{fmtBRL(item.amount)}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => deleteLancamento.mutate({ id: item.id, unitId })}
          disabled={deleteLancamento.isPending}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'hsl(var(--pm-gray-600))' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#F87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--pm-gray-600))' }}
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function FinanceiroPage() {
  const navigate = useNavigate()
  const prefix   = useRoutePrefix()
  const { profile } = useProfile()
  const unitId = null  // matriz: jobs e entries sem unit_id
  const maxDiscountPct = profile?.max_discount_pct ?? 100

  const { data: payments = [], isLoading: loadingPay } = usePendingPayments(unitId)
  const { data: lancamentos = [], isLoading: loadingLanc } = useLancamentos(unitId)
  const { data: ecuReceipts = [] } = useEcuReceipts(unitId)
  const { data: franchiseBilling = [] } = useMatrixFranchiseBilling()
  const { data: openJobs = [] } = useOpenEcuJobs(unitId)
  const { data: openOrders = [] } = useOpenOrders(unitId)

  const [selected, setSelected]   = useState<PendingPayment | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [filterTipo, setFilterTipo]           = useState<string>('todos')
  const [filterStatus, setFilterStatus]       = useState<string>('todos')
  const [filterCategoria, setFilterCategoria] = useState<string>('todas')

  const unseenCount = useUnseenFranchiseCount()

  const resumo = useMemo(() => {
    const lancados = lancamentos.filter((l) => l.status === 'lancado')
    const receitasManuais = lancados.filter((l) => l.type === 'receita').reduce((s, l) => s + Math.abs(l.amount), 0)
    const despesas = lancados.filter((l) => l.type === 'despesa').reduce((s, l) => s + Math.abs(l.amount), 0)
    const ajustes  = lancados.filter((l) => l.type === 'ajuste').reduce((s, l) => s + l.amount, 0)
    const receitasEcu = ecuReceipts.reduce((s, r) => s + r.amount, 0)
    const receitas = receitasManuais + receitasEcu
    return { receitas, despesas, saldo: receitas - despesas + ajustes }
  }, [lancamentos, ecuReceipts])

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filterTipo !== 'todos' && l.type !== filterTipo) return false
      if (filterStatus !== 'todos' && l.status !== filterStatus) return false
      if (filterCategoria !== 'todas' && l.categoria !== filterCategoria) return false
      return true
    })
  }, [lancamentos, filterTipo, filterStatus, filterCategoria])

  const selectStyle: React.CSSProperties = {
    background: 'hsl(var(--pm-gray-800))',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'hsl(var(--pm-gray-300))',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    outline: 'none',
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader title="Financeiro" subtitle="Caixa e lançamentos da matriz" />

      <Tabs defaultValue="em-aberto" className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <TabsList style={{ background: 'hsl(var(--pm-gray-900))' }}>
            <TabsTrigger value="em-aberto" className="text-xs px-3">Em Aberto</TabsTrigger>
            <TabsTrigger value="franquias" className="text-xs px-3 gap-1.5">
              Franquias
              {unseenCount > 0 && (
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                  style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                >
                  {unseenCount > 9 ? '9+' : unseenCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inter-franquias" className="text-xs px-3">Inter-Franquias</TabsTrigger>
            <TabsTrigger value="lancamentos" className="text-xs px-3">Lançamentos</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs px-3" disabled>Histórico</TabsTrigger>
          </TabsList>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2563EB' }}
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <SummaryCard label="Saldo do Período" value={resumo.saldo} icon={Scale}
            color={resumo.saldo >= 0 ? '#4ADE80' : '#F87171'}
            bg={resumo.saldo >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'} />
          <SummaryCard label="Total Receitas" value={resumo.receitas} icon={TrendingUp} color="#4ADE80" bg="rgba(74,222,128,0.1)" />
          <SummaryCard label="Total Despesas" value={resumo.despesas} icon={TrendingDown} color="#F87171" bg="rgba(248,113,113,0.1)" />
        </div>

        <TabsContent value="em-aberto" className="space-y-6 mt-0">
          {/* Em Aberto — ECU diretos + pedidos franquias */}
          {(openJobs.length > 0 || openOrders.length > 0) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: '#FBBF24' }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FBBF24' }}>
                  Em Aberto
                </p>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>
                  {openJobs.length + openOrders.length}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(251,191,36,0.2)' }}>
                {openJobs.map((job: OpenEcuJob, i: number) => {
                  const ageH      = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60))
                  const ageD      = Math.floor(ageH / 24)
                  const isOverdue = ageH >= 12
                  const techName  = job.assigned_profile?.name ?? job.creator_profile?.name ?? '—'
                  const ageLabel  = ageD > 0 ? `${ageD}d ${ageH % 24}h` : ageH > 0 ? `${ageH}h` : '< 1h'
                  return (
                    <div key={job.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                      onClick={() => navigate(`${prefix}/arquivos/${job.id}`)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: isOverdue ? '#FBBF24' : 'hsl(var(--pm-gray-600))' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {job.customers?.name ?? '—'}
                          <span className="text-muted-foreground font-normal"> · {job.service_type}</span>
                        </p>
                        <p className="text-xs truncate" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                          Técnico: {techName}
                          {isOverdue
                            ? <span style={{ color: '#FBBF24' }}> · ⚠ {ageLabel} em aberto</span>
                            : <span> · {ageLabel}</span>}
                        </p>
                      </div>
                      <EcuStatusBadge status={job.status as FileStatus} />
                    </div>
                  )
                })}
                {openOrders.map((order: OpenOrder, i: number) => {
                  const idx = openJobs.length + i
                  const ORDER_STATUS_LABELS: Record<string, string> = {
                    aguardando_aprovacao: 'Aguardando aprovação',
                    aguardando_pagamento: 'Aguardando pagamento',
                    aprovado: 'Aprovado — pend. envio',
                    em_separacao: 'Em separação',
                    enviado: 'Enviado — pend. confirmação',
                  }
                  return (
                    <div key={order.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                      onClick={() => navigate(`${prefix}/pedidos-b2b`)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          Pedido B2B{order.franchise_units ? ` · ${order.franchise_units.name}` : ''}
                        </p>
                        <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                        style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
                        B2B
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Cobranças ECU pendentes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Cobranças ECU Pendentes
              </p>
              {payments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'hsl(var(--pm-red-500)/0.15)', color: 'hsl(var(--pm-red-500))' }}>
                  {payments.length}
                </span>
              )}
            </div>
            {loadingPay ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
              </div>
            ) : payments.length === 0 ? (
              <div className="rounded-xl flex items-center justify-center py-10 gap-2"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CheckCircle2 size={16} style={{ color: 'hsl(var(--pm-gray-700))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhuma cobrança pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-xl p-4 flex items-center justify-between gap-4"
                    style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{p.ecu_jobs?.customers?.name ?? '—'}</p>
                      <p className="text-sm truncate" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                        {p.ecu_jobs?.service_type ?? p.description}
                      </p>
                      <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>
                        {fmtDateTime(p.created_at)}
                        {p.ecu_jobs?.seller && <span> · Vendedor: {p.ecu_jobs.seller.name}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-semibold text-white">{fmtBRL(p.ecu_jobs?.amount_charged_to_customer ?? p.amount)}</span>
                      <button onClick={() => setSelected(p)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}>
                        <CreditCard size={12} /> Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Serviços ECU realizados (pagos) */}
          {ecuReceipts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                  Serviços ECU Realizados
                </p>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>
                  {ecuReceipts.length}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
                {ecuReceipts.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-4 px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                    <Receipt size={14} style={{ color: '#4ADE80', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {r.ecu_jobs?.customers?.name ?? '—'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                        {r.ecu_jobs?.service_type ?? r.description ?? '—'} · {fmtDateTime(r.created_at)}
                        {r.payment_method && <span> · {r.payment_method}</span>}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0" style={{ color: '#4ADE80' }}>
                      +{fmtBRL(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="franquias" className="mt-0">
          <FranquiasTab />
        </TabsContent>

        <TabsContent value="inter-franquias" className="space-y-6 mt-0">
          {/* Faturamento inter-franquias (comparativo separado) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Faturamento Inter-Franquias
              </p>
              {franchiseBilling.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
                  {franchiseBilling.length}
                </span>
              )}
            </div>
            {franchiseBilling.length === 0 ? (
              <div className="rounded-xl flex items-center justify-center py-8 gap-2"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Building2 size={16} style={{ color: 'hsl(var(--pm-gray-700))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Nenhum serviço cobrado às franquias</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl p-4 mb-3 flex items-center gap-4"
                  style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)' }}>
                    <Building2 size={18} style={{ color: '#60A5FA' }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                      Total Cobrado às Franquias
                    </p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: '#60A5FA' }}>
                      {fmtBRL(franchiseBilling.reduce((s, e) => s + e.amount_charged_by_matrix, 0))}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {franchiseBilling.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-4 px-4 py-3"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <Building2 size={14} style={{ color: '#60A5FA', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {e.franchise_units?.name ?? e.unit_id}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                          {e.service_type} · {e.customers?.name ?? '—'} · {fmtDateTime(e.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm" style={{ color: '#60A5FA' }}>{fmtBRL(e.amount_charged_by_matrix)}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>cobrado ao cliente: {fmtBRL(e.amount_charged_to_customer)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </TabsContent>

        <TabsContent value="lancamentos" className="space-y-6 mt-0">
          {/* Lançamentos manuais */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
                Lançamentos Manuais
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} style={selectStyle}>
                  <option value="todos">Todos os tipos</option>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                  <option value="ajuste">Ajuste</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                  <option value="todos">Todos os status</option>
                  <option value="lancado">Lançado</option>
                  <option value="rascunho">Rascunho</option>
                </select>
                <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} style={selectStyle}>
                  <option value="todas">Todas as categorias</option>
                  {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLanc ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="animate-spin" style={{ color: 'hsl(var(--pm-gray-600))' }} />
              </div>
            ) : lancamentosFiltrados.length === 0 ? (
              <div className="rounded-xl flex flex-col items-center justify-center py-12 gap-3 cursor-pointer group"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}
                onClick={() => setModalOpen(true)}>
                <FileEdit size={24} style={{ color: 'hsl(var(--pm-gray-700))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>
                  {lancamentos.length === 0
                    ? 'Nenhum lançamento — clique para adicionar'
                    : 'Nenhum resultado com os filtros aplicados'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-4 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2 shrink-0" />
                  <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-600))' }}>Categoria</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--pm-gray-600))' }}>Valor</span>
                  <div className="w-8 shrink-0" />
                </div>
                {lancamentosFiltrados.map((item) => (
                  <LancamentoRow key={item.id} item={item} unitId={unitId} />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <div
            className="flex items-center justify-center py-16 rounded-xl"
            style={{ background: 'hsl(var(--pm-gray-900))', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm" style={{ color: 'hsl(var(--pm-gray-600))' }}>Em breve — histórico de pagamentos</p>
          </div>
        </TabsContent>
      </Tabs>

      {selected && (
        <EcuPaymentSheet payment={selected} maxDiscountPct={maxDiscountPct} onClose={() => setSelected(null)} />
      )}
      {modalOpen && (
        <NovoLancamentoModal unitId={unitId} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
