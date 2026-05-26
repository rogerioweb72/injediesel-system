import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Package, CreditCard, QrCode, Banknote, Building2, ChevronRight, ChevronDown, CheckCircle2, MapPin, Truck, Loader2 } from 'lucide-react'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Button } from '@/components/ui/button'
import { useCart } from '@/stores/cart'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useCreateFranchiseOrder } from '@/hooks/useOrders'
import { useShipping } from '@/hooks/useShipping'
import type { ShippingOption, ShippingCartItem } from '@/hooks/useShipping'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const INSTALLMENT_OPTIONS = [
  { value: 'credito_2', label: '2x', sub: 'sem juros' },
  { value: 'credito_3', label: '3x', sub: 'sem juros' },
  { value: 'credito_6', label: '6x', sub: 'sem juros' },
  { value: 'credito_12',label: '12x',sub: 'com juros'  },
]

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix:          'Pix',
  boleto:       'Boleto Bancário',
  credito_1:    'Cartão de Crédito — à vista',
  credito_2:    'Cartão de Crédito — 2x',
  credito_3:    'Cartão de Crédito — 3x',
  credito_6:    'Cartão de Crédito — 6x',
  credito_12:   'Cartão de Crédito — 12x',
}

function SuccessOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'pmFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes pmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes pmScaleIn { from { transform:scale(0.6); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes pmCheckDraw {
          from { stroke-dashoffset: 80 }
          to   { stroke-dashoffset: 0  }
        }
        @keyframes pmCircleDraw {
          from { stroke-dashoffset: 200 }
          to   { stroke-dashoffset: 0   }
        }
        @keyframes pmTextSlide {
          from { opacity:0; transform:translateY(12px) }
          to   { opacity:1; transform:translateY(0)    }
        }
      `}</style>

      <div style={{ animation: 'pmScaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle
            cx="60" cy="60" r="52"
            stroke="#34D399" strokeWidth="5" fill="none"
            strokeDasharray="200" strokeDashoffset="200"
            style={{ animation: 'pmCircleDraw 0.6s ease 0.2s forwards' }}
          />
          <polyline
            points="36,62 52,78 84,44"
            stroke="#34D399" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
            strokeDasharray="80" strokeDashoffset="80"
            style={{ animation: 'pmCheckDraw 0.45s ease 0.65s forwards' }}
          />
        </svg>
      </div>

      <p
        className="text-white font-bold text-xl mt-5"
        style={{ animation: 'pmTextSlide 0.4s ease 0.9s both' }}
      >
        Parabéns, pedido enviado!
      </p>
      <p
        className="text-white/50 text-sm mt-1.5"
        style={{ animation: 'pmTextSlide 0.4s ease 1.05s both' }}
      >
        Você será redirecionado em instantes
      </p>
    </div>
  )
}

export default function FranqueadoCarrinhoPage() {
  const prefix = useRoutePrefix()
  const navigate = useNavigate()
  const { items, remove, updateQty, clear } = useCart()
  const { data: myUnit } = useMyUnit()
  const [paymentType, setPaymentType] = useState<'pix'|'boleto'|'cartao'|''>('')
  const [cardMode, setCardMode] = useState<'avista'|'parcelado'|''>('')
  const [parcelas, setParcelas] = useState('')
  const [sending, setSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cepInput, setCepInput] = useState('')
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  const createOrder = useCreateFranchiseOrder()

  const shippingItems: ShippingCartItem[] = items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
  const { data: shippingOptions, isFetching: shippingLoading, error: shippingError } = useShipping(cepInput, shippingItems)

  const payment = useMemo(() => {
    if (paymentType === 'pix') return 'pix'
    if (paymentType === 'boleto') return 'boleto'
    if (paymentType === 'cartao' && cardMode === 'avista') return 'credito_1'
    if (paymentType === 'cartao' && cardMode === 'parcelado' && parcelas) return parcelas
    return ''
  }, [paymentType, cardMode, parcelas])

  const unit = myUnit?.franchise_units
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0
  const total = subtotal + shippingCost
  function tierFromContract(ct: string | undefined) {
    return ct === 'linha_leve' ? 'franqueado_linha_leve' as const : 'franqueado_full' as const
  }

  async function handleComprar() {
    if (!payment || !myUnit?.unit_id) {
      toast.error('Dados da unidade não carregados. Atualize a página e tente novamente.')
      return
    }
    setSending(true)
    try {
      await createOrder.mutateAsync({
        unit_id: myUnit.unit_id,
        price_tier: tierFromContract(unit?.contract_type),
        payment_method: payment,
        total,
        items: items.map(i => ({
          product_id: i.productId,
          description: i.name,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      })
      clear()
      setShowSuccess(true)
    } catch {
      toast.error('Erro ao registrar pedido. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (items.length === 0 && !showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--pm-gray-800))] flex items-center justify-center">
          <ShoppingCart size={28} className="text-muted-foreground opacity-40" />
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">Carrinho vazio</p>
          <p className="text-sm text-muted-foreground">Adicione produtos da loja para continuar.</p>
        </div>
        <Button onClick={() => navigate(`${prefix}/loja`)} style={{ background: 'var(--pm-accent-gradient)' }}>
          <ArrowLeft size={15} className="mr-1.5" /> Ir para a Loja
        </Button>
      </div>
    )
  }

  const shippingRequired = (shippingOptions?.length ?? 0) > 0 || cepInput.replace(/\D/g, '').length === 8
  const canSubmit = !!payment && !sending && (!shippingRequired || !!selectedShipping)

  function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setCepInput(masked)
    setSelectedShipping(null)
  }

  return (
    <>
      {showSuccess && (
        <SuccessOverlay onDone={() => navigate(`${prefix}/pedidos`)} />
      )}

      <div>
        {/* ── Breadcrumb header ── */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(`${prefix}/loja`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} />
            Loja
          </button>
          <ChevronRight size={12} className="text-muted-foreground/40" />
          <span className="text-xs text-foreground font-medium">Carrinho</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[hsl(var(--pm-gray-800))] text-muted-foreground">
            {totalQty} {totalQty === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ── LEFT: items ── */}
          <div className="pm-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--pm-gray-700))]">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produtos</span>
              <button
                onClick={clear}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={11} /> Limpar carrinho
              </button>
            </div>

            <div className="divide-y divide-[hsl(var(--pm-gray-700))]">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-4 px-5 py-4 group hover:bg-white/[0.015] transition-colors">
                  <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-[hsl(var(--pm-gray-800))] flex items-center justify-center border border-white/[0.06]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package size={20} className="text-muted-foreground opacity-25" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.name}</p>
                    {item.sku && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 opacity-60">SKU {item.sku}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(item.price)} / un</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/8 hover:border-white/20 transition-all text-muted-foreground hover:text-foreground"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-sm font-semibold font-mono w-7 text-center tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/8 hover:border-white/20 transition-all text-muted-foreground hover:text-foreground"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="w-24 text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.quantity}× {formatCurrency(item.price)}</p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(item.productId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: summary + payment ── */}
          <div className="space-y-4 lg:sticky lg:top-4">

            {/* Order summary */}
            <div className="pm-card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Resumo do Pedido</p>

              {unit && (
                <div className="flex items-start gap-3 pb-3 border-b border-[hsl(var(--pm-gray-700))]">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--pm-gray-800))] flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{unit.name}</p>
                    <p className="text-[10px] text-muted-foreground">{unit.city}{unit.state ? ` — ${unit.state}` : ''}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      <span className="font-mono text-[10px] mr-1.5 opacity-60">{item.quantity}×</span>
                      {item.name}
                    </span>
                    <span className="text-xs font-medium text-foreground shrink-0 tabular-nums">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[hsl(var(--pm-gray-700))] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Frete</span>
                  <span className="text-sm font-medium tabular-nums" style={{ color: selectedShipping ? '#34D399' : 'hsl(var(--pm-gray-500))' }}>
                    {selectedShipping ? formatCurrency(shippingCost) : '— a calcular'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-[hsl(var(--pm-gray-700))]">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(total)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                  {totalQty} {totalQty === 1 ? 'produto' : 'produtos'}
                </p>
              </div>
            </div>

            {/* Delivery notice */}
            <div className="rounded-xl border border-[hsl(var(--pm-gray-700))] px-4 py-3 flex items-start gap-3" style={{ background: 'hsl(var(--pm-gray-800))' }}>
              <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: '#34D399' }} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Endereço de entrega:</span>{' '}
                Mantenha seus dados atualizados — a entrega será realizada no endereço cadastrado da sua unidade.
              </p>
            </div>

            {/* Shipping calculator */}
            <div className="pm-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Truck size={13} style={{ color: '#34D399' }} />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Calcular Frete</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cepInput}
                  onChange={e => handleCepChange(e.target.value)}
                  maxLength={9}
                  className="flex-1 h-9 rounded-lg border border-[hsl(var(--pm-gray-700))] bg-[hsl(var(--pm-gray-800))] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#34D399] transition-colors"
                />
                {shippingLoading && (
                  <div className="h-9 w-9 flex items-center justify-center">
                    <Loader2 size={15} className="animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {shippingError && (
                <p className="text-xs text-red-400">Erro ao calcular frete. Verifique o CEP e tente novamente.</p>
              )}

              {!shippingLoading && !shippingError && shippingOptions && shippingOptions.length > 0 && (
                <div className="space-y-2">
                  {shippingOptions.map(opt => {
                    const sel = selectedShipping?.id === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedShipping(sel ? null : opt)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left"
                        style={{
                          borderColor: sel ? '#34D399' : 'hsl(var(--pm-gray-700))',
                          background: sel ? 'rgba(52,211,153,0.08)' : 'transparent',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight">{opt.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {opt.company?.name}{opt.delivery_time ? ` · ${opt.delivery_time} dias úteis` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums" style={{ color: sel ? '#34D399' : 'hsl(var(--foreground))' }}>
                            {formatCurrency(parseFloat(opt.price))}
                          </p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{ borderColor: sel ? '#34D399' : 'hsl(var(--pm-gray-600))' }}
                        >
                          {sel && <div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {!shippingLoading && !shippingError && cepInput.replace(/\D/g, '').length === 8 && shippingOptions?.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma opção de frete disponível para este CEP.</p>
              )}
            </div>

            {/* Payment method */}
            <div className="pm-card p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Forma de Pagamento</p>

              {(
                [
                  { value: 'pix',    label: 'Pix',               sub: 'Transferência instantânea',       Icon: QrCode     },
                  { value: 'cartao', label: 'Cartão de Crédito', sub: 'À vista ou parcelado',             Icon: CreditCard },
                  { value: 'boleto', label: 'Boleto Bancário',   sub: 'Vencimento em 1-3 dias úteis',    Icon: Banknote   },
                ] as const
              ).map(({ value, label, sub, Icon }) => {
                const active = paymentType === value
                return (
                  <div key={value}>
                    <button
                      onClick={() => {
                        setPaymentType(active ? '' : value)
                        setCardMode('')
                        setParcelas('')
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left"
                      style={{
                        borderColor: active ? '#34D399' : 'hsl(var(--pm-gray-700))',
                        background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: active ? 'rgba(52,211,153,0.15)' : 'hsl(var(--pm-gray-800))' }}
                      >
                        <Icon size={13} style={{ color: active ? '#34D399' : 'hsl(var(--pm-gray-400))' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sub}</p>
                      </div>
                      {value === 'cartao' ? (
                        <ChevronDown
                          size={14}
                          className="shrink-0 text-muted-foreground transition-transform duration-200"
                          style={{ transform: active ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{ borderColor: active ? '#34D399' : 'hsl(var(--pm-gray-600))' }}
                        >
                          {active && <div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} />}
                        </div>
                      )}
                    </button>

                    {value === 'cartao' && active && (
                      <div className="mt-2 ml-4 pl-3 border-l-2 border-[hsl(var(--pm-gray-700))] space-y-2">
                        {(['avista', 'parcelado'] as const).map(mode => {
                          const modeActive = cardMode === mode
                          return (
                            <div key={mode}>
                              <button
                                onClick={() => { setCardMode(modeActive ? '' : mode); setParcelas('') }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left"
                                style={{
                                  borderColor: modeActive ? '#34D399' : 'hsl(var(--pm-gray-700))',
                                  background: modeActive ? 'rgba(52,211,153,0.06)' : 'transparent',
                                }}
                              >
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-foreground">
                                    {mode === 'avista' ? 'À vista' : 'Parcelado'}
                                  </p>
                                  {mode === 'avista' && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">1× sem juros</p>
                                  )}
                                </div>
                                {mode === 'parcelado' ? (
                                  <ChevronDown
                                    size={13}
                                    className="shrink-0 text-muted-foreground transition-transform duration-200"
                                    style={{ transform: modeActive ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                  />
                                ) : (
                                  <div
                                    className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                                    style={{ borderColor: modeActive ? '#34D399' : 'hsl(var(--pm-gray-600))' }}
                                  >
                                    {modeActive && <div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} />}
                                  </div>
                                )}
                              </button>

                              {mode === 'parcelado' && modeActive && (
                                <div className="mt-2 ml-3 pl-3 border-l-2 border-[hsl(var(--pm-gray-700))] grid grid-cols-2 gap-2">
                                  {INSTALLMENT_OPTIONS.map(opt => {
                                    const sel = parcelas === opt.value
                                    return (
                                      <button
                                        key={opt.value}
                                        onClick={() => setParcelas(sel ? '' : opt.value)}
                                        className="flex flex-col items-center py-2.5 rounded-lg border text-center transition-all"
                                        style={{
                                          borderColor: sel ? '#34D399' : 'hsl(var(--pm-gray-700))',
                                          background: sel ? 'rgba(52,211,153,0.1)' : 'transparent',
                                        }}
                                      >
                                        <span
                                          className="text-sm font-bold"
                                          style={{ color: sel ? '#34D399' : 'hsl(var(--foreground))' }}
                                        >
                                          {opt.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <button
                disabled={!canSubmit}
                onClick={handleComprar}
                className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: canSubmit ? '#25D366' : 'hsl(var(--pm-gray-800))',
                  color: canSubmit ? '#fff' : 'hsl(var(--pm-gray-500))',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.6,
                }}
              >
                <CheckCircle2 size={17} />
                {sending ? 'Enviando pedido...' : `Enviar Pedido · ${formatCurrency(total)}`}
              </button>

              {!payment ? (
                <p className="text-center text-[10px] text-muted-foreground">
                  Selecione uma forma de pagamento para continuar
                </p>
              ) : shippingRequired && !selectedShipping ? (
                <p className="text-center text-[10px] text-muted-foreground">
                  Selecione uma opção de frete para continuar
                </p>
              ) : (
                <p className="text-center text-[10px] text-muted-foreground">
                  Pagamento via <strong className="text-foreground">{PAYMENT_METHOD_LABELS[payment]}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
