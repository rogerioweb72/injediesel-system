import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  ShoppingBag, ChevronDown, ChevronUp, Package, AlertTriangle,
  Clock, CheckCircle2, Truck, Ban, PackageCheck, Copy, Paperclip,
  X, Upload, FileCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useFranchiseOrders, useUpdateOrderStatus } from '@/hooks/useOrders'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useUploadReceipt } from '@/hooks/useOrderReceipt'
import { formatCurrency } from '@/lib/utils'
import { generatePixPayload } from '@/lib/pix'
import { toast } from 'sonner'
import type { Order } from '@/hooks/useOrders'

const PIX_KEY  = import.meta.env.VITE_PIX_KEY  ?? ''
const PIX_NAME = import.meta.env.VITE_PIX_NAME ?? 'PROMAX TUNER'
const PIX_CITY = import.meta.env.VITE_PIX_CITY ?? 'CASCAVEL'

const PAYMENT_LABELS: Record<string, string> = {
  pix:           'Pix',
  boleto:        'Boleto Bancário',
  credito_1:     'Cartão de Crédito — à vista',
  credito_2:     'Cartão de Crédito — 2x',
  credito_3:     'Cartão de Crédito — 3x',
  credito_6:     'Cartão de Crédito — 6x',
  credito_12:    'Cartão de Crédito — 12x',
  transferencia: 'Transferência Bancária',
}

const STATUS_FLOW = [
  'aguardando_aprovacao',
  'aguardando_pagamento',
  'em_separacao',
  'enviado',
  'entregue',
] as const

const STATUS_META: Record<string, { label: string; short: string; color: string; bg: string; Icon: React.ElementType }> = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', short: 'Análise',   color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',   Icon: Clock         },
  aprovado:             { label: 'Aprovado',              short: 'Aprovado',  color: '#34D399', bg: 'rgba(52,211,153,0.1)',   Icon: CheckCircle2  },
  aguardando_pagamento: { label: 'Aguard. Pagamento',     short: 'Pagamento', color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  Icon: AlertTriangle },
  em_separacao:         { label: 'Em Separação',          short: 'Separação', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   Icon: Package       },
  enviado:              { label: 'Enviado',               short: 'Enviado',   color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',  Icon: Truck         },
  entregue:             { label: 'Entregue',              short: 'Entregue',  color: '#34D399', bg: 'rgba(52,211,153,0.15)',  Icon: CheckCircle2  },
  cancelado:            { label: 'Cancelado',             short: 'Cancelado', color: '#F87171', bg: 'rgba(248,113,113,0.1)',  Icon: Ban           },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status] ?? { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', Icon: Package }
  const Icon = s.Icon
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, background:s.bg, color:s.color, fontSize:11, fontWeight:600 }}>
      <Icon size={11} style={{ flexShrink:0 }} />
      {s.label}
    </span>
  )
}

function StatusStepper({ status }: { status: string }) {
  const flowIdx  = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number])
  const cancelled = status === 'cancelado'
  return (
    <div className="flex items-center gap-0">
      {STATUS_FLOW.map((s, idx) => {
        const meta   = STATUS_META[s]
        const done   = !cancelled && idx < flowIdx
        const active = s === status || (s === 'aguardando_pagamento' && status === 'aprovado')
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                style={{
                  borderColor: cancelled ? 'hsl(var(--pm-gray-700))' : (done || active) ? '#34D399' : 'hsl(var(--pm-gray-600))',
                  background:  cancelled ? 'transparent' : done ? 'rgba(52,211,153,0.2)' : active ? 'rgba(52,211,153,0.15)' : 'transparent',
                  color:       cancelled ? 'hsl(var(--pm-gray-600))' : (done || active) ? '#34D399' : 'hsl(var(--pm-gray-600))',
                }}>
                {done ? '✓' : idx + 1}
              </div>
              <span className="text-[9px] text-center leading-tight max-w-[52px]"
                style={{ color: (done || active) && !cancelled ? '#34D399' : 'hsl(var(--pm-gray-500))' }}>
                {meta.short}
              </span>
            </div>
            {idx < STATUS_FLOW.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 mb-4"
                style={{ background: (done && !cancelled) ? '#34D399' : 'hsl(var(--pm-gray-700))' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── PIX Panel ──────────────────────────────────────────────────────────────────
function PixPanel({
  order,
  highlightUpload,
  onUploaded,
}: {
  order: Order
  highlightUpload?: boolean
  onUploaded?: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload  = useUploadReceipt()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasComprovante = !!(order as any).comprovante_uploaded_at

  const pixPayload = PIX_KEY
    ? generatePixPayload({ key: PIX_KEY, name: PIX_NAME, city: PIX_CITY, amount: order.total, txid: order.id.slice(0, 25) })
    : ''

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await upload.mutateAsync({ orderId: order.id, file })
      toast.success('Comprovante enviado! A matriz será notificada.')
      onUploaded?.()
    } catch {
      toast.error('Erro ao enviar comprovante. Tente novamente.')
    }
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--pm-gray-700))] overflow-hidden" style={{ background: 'hsl(var(--pm-gray-800))' }}>
      <div className="px-4 py-2.5 border-b border-[hsl(var(--pm-gray-700))] flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#34D399' }}>Pagamento via Pix</span>
      </div>

      <div className="p-4 flex gap-5 flex-wrap">
        {/* QR Code */}
        {pixPayload ? (
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="p-2 bg-white rounded-xl">
              <QRCodeSVG value={pixPayload} size={140} level="M" />
            </div>
            <p className="text-[9px] text-muted-foreground text-center">Escaneie com seu banco</p>
          </div>
        ) : (
          <div className="w-[156px] h-[156px] rounded-xl bg-[hsl(var(--pm-gray-700))] flex items-center justify-center text-[10px] text-muted-foreground text-center p-3">
            Chave Pix não configurada
          </div>
        )}

        {/* Info + actions */}
        <div className="flex-1 min-w-[200px] space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Valor a pagar</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(order.total)}</p>
            </div>
            {PIX_KEY && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Chave Pix</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-foreground bg-[hsl(var(--pm-gray-700))] px-2 py-1 rounded-lg flex-1 truncate">{PIX_KEY}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(PIX_KEY); toast.success('Chave Pix copiada!') }}
                    className="h-7 px-2 rounded-lg border border-[hsl(var(--pm-gray-600))] flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload comprovante */}
          <div className="space-y-2">
            {hasComprovante ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <FileCheck size={14} style={{ color: '#34D399', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: '#34D399' }}>Comprovante enviado</p>
                  <p className="text-[10px] text-muted-foreground">Aguardando confirmação da matriz</p>
                </div>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={upload.isPending}
                  className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all"
                  style={{
                    background: highlightUpload ? '#34D399' : 'transparent',
                    color: highlightUpload ? '#000' : 'hsl(var(--pm-gray-300))',
                    border: highlightUpload ? 'none' : '1px solid hsl(var(--pm-gray-600))',
                    animation: highlightUpload ? 'pmPulse 1.5s ease infinite' : 'none',
                  }}
                >
                  {upload.isPending
                    ? <><Upload size={13} className="animate-bounce" /> Enviando...</>
                    : <><Paperclip size={13} /> Anexar Comprovante</>
                  }
                </button>
                {highlightUpload && (
                  <p className="text-[10px] text-center" style={{ color: '#34D399' }}>
                    Anexe o comprovante para concluir o pedido
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pmPulse { 0%,100%{opacity:1} 50%{opacity:.7} }`}</style>
    </div>
  )
}

// ── PIX Modal ─────────────────────────────────────────────────────────────────
function PixModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="pm-card w-full max-w-md p-0 overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--pm-gray-700))]">
          <div>
            <p className="text-sm font-semibold text-foreground">Pagamento via Pix</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pague e anexe o comprovante para confirmar</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4">
          <PixPanel order={order} highlightUpload onUploaded={onClose} />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FranqueadoPedidosPage() {
  const { data: myUnit }  = useMyUnit()
  const { data: orders = [], isLoading } = useFranchiseOrders(myUnit?.unit_id)
  const updateStatus = useUpdateOrderStatus()
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [pixModalOrder, setPixModalOrder] = useState<Order | null>(null)

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  async function handleConfirmReceipt(id: string) {
    try {
      await updateStatus.mutateAsync({ id, status: 'entregue' })
      toast.success('Recebimento confirmado!')
    } catch {
      toast.error('Erro ao confirmar recebimento.')
    }
  }

  return (
    <div>
      <PageHeader title="Histórico de Pedidos" subtitle="Seus pedidos realizados na Loja Promax" />

      {/* PIX modal */}
      {pixModalOrder && <PixModal order={pixModalOrder} onClose={() => setPixModalOrder(null)} />}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pm-skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <ShoppingBag size={40} className="text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Nenhum pedido realizado ainda.</p>
          <p className="text-xs text-muted-foreground/60">Seus pedidos via Loja Promax aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const expanded    = expandedId === order.id
            const itemCount   = order.order_items?.length ?? 0
            const isPix       = order.payment_method === 'pix'
            const needsPay    = order.status === 'aguardando_pagamento'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasComprovante = !!(order as any).comprovante_uploaded_at
            const date = new Date(order.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
            const time = new Date(order.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })

            return (
              <div key={order.id} className="pm-card p-0 overflow-hidden">

                {/* Header */}
                <button
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() => toggle(order.id)}
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[hsl(var(--pm-gray-800))] flex items-center justify-center">
                    <Package size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {itemCount} {itemCount === 1 ? 'produto' : 'produtos'}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {PAYMENT_LABELS[order.payment_method ?? ''] ?? order.payment_method ?? '—'}
                      </span>
                      {needsPix(order) && !hasComprovante && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.15)', color: '#FB923C' }}>
                          Pagamento pendente
                        </span>
                      )}
                      {hasComprovante && needsPay && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
                          Comprovante enviado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{date} às {time}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-bold text-foreground">{formatCurrency(order.total)}</span>
                    {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded */}
                {expanded && (
                  <div className="border-t border-[hsl(var(--pm-gray-700))] px-4 py-4 space-y-4">

                    {/* Stepper */}
                    <StatusStepper status={order.status} />

                    {/* PIX panel */}
                    {isPix && needsPay && (
                      <PixPanel order={order} highlightUpload={!hasComprovante} />
                    )}

                    {/* Non-PIX payment alert */}
                    {!isPix && needsPay && (
                      <div className="rounded-xl flex items-start gap-3 px-3.5 py-3" style={{ background:'rgba(251,146,60,0.07)', border:'1px solid rgba(251,146,60,0.2)' }}>
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color:'#FB923C' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color:'#FB923C' }}>Pedido aceito — realize o pagamento</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Pague via <strong className="text-foreground">{PAYMENT_LABELS[order.payment_method ?? ''] ?? order.payment_method}</strong> e envie o comprovante para a matriz. O pedido será separado após confirmação.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="rounded-xl overflow-hidden border border-[hsl(var(--pm-gray-700))]">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3.5 py-2 border-b border-[hsl(var(--pm-gray-700))]">Produtos</p>
                        <div className="divide-y divide-[hsl(var(--pm-gray-700))]">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex items-center justify-between px-3.5 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate">{item.description}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} / un</p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-xs text-muted-foreground">{item.quantity}×</p>
                                <p className="text-sm font-medium text-foreground">{formatCurrency(item.total)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center px-3.5 py-2.5 border-t border-[hsl(var(--pm-gray-700))]" style={{ background:'hsl(var(--pm-gray-800))' }}>
                          <span className="text-xs text-muted-foreground">Total do pedido</span>
                          <span className="text-sm font-bold text-foreground">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    )}

                    {/* Confirmar recebimento */}
                    {order.status === 'enviado' && (
                      <button
                        onClick={() => handleConfirmReceipt(order.id)}
                        disabled={updateStatus.isPending}
                        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                        style={{ background:'#34D399', color:'#000' }}
                      >
                        <PackageCheck size={16} />
                        {updateStatus.isPending ? 'Confirmando...' : 'Confirmar Recebimento'}
                      </button>
                    )}

                    {order.status === 'entregue' && (
                      <div className="flex items-center justify-center gap-2 py-1">
                        <CheckCircle2 size={14} style={{ color:'#34D399' }} />
                        <span className="text-xs font-medium" style={{ color:'#34D399' }}>Pedido entregue e encerrado</span>
                      </div>
                    )}

                    {/* Quick PIX button when status is awaiting payment */}
                    {isPix && needsPay && !hasComprovante && (
                      <button
                        onClick={() => setPixModalOrder(order)}
                        className="w-full h-8 rounded-xl flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-[hsl(var(--pm-gray-700))] hover:border-foreground transition-colors"
                      >
                        Abrir pagamento em tela cheia
                      </button>
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

function needsPix(order: Order): boolean {
  return order.payment_method === 'pix' && order.status === 'aguardando_pagamento'
}
