import { useState } from 'react'
import { Building2, Package, ChevronDown, ChevronUp, Clock, CheckCircle2, Truck, XCircle, AlertCircle, Ban, Banknote, MapPin, FileCheck, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useAllFranchiseOrders, useUpdateOrderStatus } from '@/hooks/useOrders'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_FLOW = [
  'aguardando_aprovacao',
  'aprovado',
  'aguardando_pagamento',
  'em_separacao',
  'enviado',
  'entregue',
] as const

interface FranchiseOrderItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

interface FranchiseOrder {
  id: string
  unit_id: string | null
  status: string
  total: number
  created_at: string
  franchise_units: { name: string; city: string | null; state: string | null } | null
  order_items: FranchiseOrderItem[]
  comprovante_uploaded_at?: string | null
  comprovante_url?: string | null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', Icon: Clock },
  aprovado:             { label: 'Aprovado',              color: '#34D399', bg: 'rgba(52,211,153,0.1)', Icon: CheckCircle2 },
  aguardando_pagamento: { label: 'Aguard. Pagamento',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', Icon: Banknote },
  em_separacao:         { label: 'Em Separação',          color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', Icon: Package },
  enviado:              { label: 'Enviado',               color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', Icon: Truck },
  entregue:             { label: 'Entregue',              color: '#34D399', bg: 'rgba(52,211,153,0.15)', Icon: CheckCircle2 },
  cancelado:            { label: 'Cancelado',             color: '#F87171', bg: 'rgba(248,113,113,0.1)', Icon: Ban },
}

const NEXT_STATUS: Record<string, string | null> = {
  aguardando_aprovacao: 'aprovado',
  aprovado:             'aguardando_pagamento',
  aguardando_pagamento: 'em_separacao',
  em_separacao:         'enviado',
  enviado:              'entregue',
  entregue:             null,
  cancelado:            null,
}

const NEXT_LABEL: Record<string, string> = {
  aguardando_aprovacao: 'Aprovar Pedido',
  aprovado:             'Confirmar Pagamento',
  aguardando_pagamento: 'Iniciar Separação',
  em_separacao:         'Marcar como Enviado',
  enviado:              'Confirmar Entrega',
}

const STATUS_FILTERS = [
  { value: '',                    label: 'Todos' },
  { value: 'aguardando_aprovacao',label: 'Aguardando' },
  { value: 'aprovado',            label: 'Aprovados' },
  { value: 'aguardando_pagamento',label: 'Pag. Pendente' },
  { value: 'em_separacao',        label: 'Em Separação' },
  { value: 'enviado',             label: 'Enviados' },
  { value: 'entregue',            label: 'Entregues' },
  { value: 'cancelado',           label: 'Cancelados' },
]

export default function PedidosB2BPage() {
  const { data: orders = [], isLoading } = useAllFranchiseOrders() as { data: FranchiseOrder[]; isLoading: boolean }
  const updateStatus = useUpdateOrderStatus()
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter ? orders.filter(o => o.status === filter) : orders

  async function handleAdvance(id: string, next: string) {
    try {
      await updateStatus.mutateAsync({ id, status: next })
      toast.success(`Status atualizado: ${STATUS_META[next]?.label}`)
    } catch {
      toast.error('Erro ao atualizar status.')
    }
  }

  async function handleCancel(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'cancelado' })
      toast.success('Pedido cancelado.')
    } catch {
      toast.error('Erro ao cancelar pedido.')
    }
  }

  return (
    <div>
      <PageHeader title="Pedidos B2B" subtitle="Pedidos recebidos das unidades franqueadas" />

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={filter === f.value
              ? { background: 'hsl(var(--pm-red-500))', color: '#fff' }
              : { background: 'hsl(var(--pm-gray-800))', color: 'hsl(var(--pm-gray-400))' }}
          >
            {f.label}
            {f.value === '' && orders.length > 0 && (
              <span className="ml-1.5 opacity-60">{orders.length}</span>
            )}
            {f.value !== '' && orders.filter(o => o.status === f.value).length > 0 && (
              <span className="ml-1.5 opacity-60">{orders.filter(o => o.status === f.value).length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="pm-skeleton h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertCircle size={36} className="text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const meta = STATUS_META[order.status] ?? STATUS_META['aguardando_aprovacao']
            const StatusIcon = meta.Icon
            const next = NEXT_STATUS[order.status]
            const isOpen = expanded === order.id
            const itemCount = order.order_items?.length ?? 0

            return (
              <div key={order.id} className="pm-card p-0 overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none hover:bg-white/[0.025] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  {/* Unit */}
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--pm-gray-800))] flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {order.franchise_units?.name ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.franchise_units?.city ?? ''}{order.franchise_units?.state ? ` — ${order.franchise_units.state}` : ''}
                      {' · '}{new Date(order.created_at).toLocaleDateString('pt-BR')} {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <StatusIcon size={11} />
                    {meta.label}
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
                  </div>

                  {/* Expand indicator */}
                  <div className="text-muted-foreground shrink-0">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-[hsl(var(--pm-gray-700))] px-5 py-4 space-y-4">

                    {/* Status stepper */}
                    <div className="flex items-center gap-0">
                      {STATUS_FLOW.map((s, idx) => {
                        const stepMeta = STATUS_META[s]
                        const flowIdx = STATUS_FLOW.indexOf(order.status)
                        const done = idx < flowIdx
                        const active = s === order.status
                        const cancelled = order.status === 'cancelado'
                        return (
                          <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                                style={{
                                  borderColor: cancelled ? 'hsl(var(--pm-gray-700))' : (done || active) ? '#34D399' : 'hsl(var(--pm-gray-600))',
                                  background: cancelled ? 'transparent' : done ? 'rgba(52,211,153,0.2)' : active ? 'rgba(52,211,153,0.15)' : 'transparent',
                                  color: cancelled ? 'hsl(var(--pm-gray-600))' : (done || active) ? '#34D399' : 'hsl(var(--pm-gray-600))',
                                }}
                              >
                                {done ? '✓' : idx + 1}
                              </div>
                              <span
                                className="text-[9px] text-center leading-tight max-w-[52px]"
                                style={{ color: (done || active) && !cancelled ? '#34D399' : 'hsl(var(--pm-gray-500))' }}
                              >
                                {stepMeta.label}
                              </span>
                            </div>
                            {idx < STATUS_FLOW.length - 1 && (
                              <div
                                className="flex-1 h-0.5 mx-1 mb-4"
                                style={{ background: (done && !cancelled) ? '#34D399' : 'hsl(var(--pm-gray-700))' }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Items list */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Produtos</p>
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            <span className="font-mono text-[10px] mr-1.5 opacity-60">{item.quantity}×</span>
                            {item.description}
                          </span>
                          <span className="font-medium text-foreground tabular-nums shrink-0">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery address */}
                    {(() => {
                      const fu = order.franchise_units
                      const parts = [fu?.logradouro, fu?.numero, fu?.complemento].filter(Boolean).join(', ')
                      const line2 = [fu?.bairro, fu?.city, fu?.state].filter(Boolean).join(' — ')
                      if (!fu?.cep && !parts) return null
                      return (
                        <div className="rounded-xl border border-[hsl(var(--pm-gray-700))] p-3 space-y-1" style={{ background: 'hsl(var(--pm-gray-800))' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MapPin size={12} style={{ color: '#34D399' }} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#34D399' }}>Endereço de Entrega</span>
                          </div>
                          {parts && <p className="text-xs text-foreground font-medium">{parts}</p>}
                          {line2 && <p className="text-xs text-muted-foreground">{line2}</p>}
                          {fu?.cep && (
                            <p className="text-xs font-mono text-muted-foreground">CEP: <span className="text-foreground">{fu.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}</span></p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Payment info */}
                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground">
                        Pagamento: <span className="text-foreground font-medium">{order.payment_method}</span>
                      </p>
                    )}

                    {/* Comprovante */}
                    {order.comprovante_uploaded_at && (
                      <div className="rounded-xl border flex items-center gap-3 px-3.5 py-2.5" style={{ borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.06)' }}>
                        <FileCheck size={15} style={{ color: '#34D399', flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: '#34D399' }}>Comprovante recebido</p>
                          <p className="text-[10px] text-muted-foreground">
                            Enviado em {new Date(order.comprovante_uploaded_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })}
                          </p>
                        </div>
                        {order.comprovante_url && (
                          <a
                            href={order.comprovante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 px-2 rounded-lg border flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            style={{ borderColor: 'rgba(52,211,153,0.3)' }}
                          >
                            <ExternalLink size={11} /> Ver
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    {order.status !== 'cancelado' && order.status !== 'entregue' && (
                      <div className="flex gap-2 pt-1">
                        {next && (
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() => handleAdvance(order.id, next)}
                            style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}
                          >
                            {NEXT_LABEL[order.status] ?? 'Avançar'}
                          </Button>
                        )}
                        {order.status === 'aguardando_aprovacao' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                            disabled={updateStatus.isPending}
                            onClick={() => handleCancel(order.id)}
                          >
                            <XCircle size={12} className="mr-1" />
                            Recusar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
