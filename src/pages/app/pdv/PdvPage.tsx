import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePrefix } from '@/contexts/RoutePrefixContext'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, CheckCircle2, X, Wallet, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriceTierBadge } from '@/components/shared/PriceTierBadge'
import { EcuPaymentSheet } from '@/components/shared/EcuPaymentSheet'
import { useProducts, useProductCategories, type ProductWithPrices } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { useCheckout } from '@/hooks/useOrders'
import { useCompanySettings, PDV_DEFAULTS } from '@/hooks/useCompanySettings'
import { useManagerDiscountHashes } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/auth'
import { useMyUnit } from '@/hooks/useMyUnit'
import { usePendingPayments, type PendingPayment } from '@/hooks/useCaixa'
import type { PriceTier } from '@/types/app'

interface CartItem {
  product: ProductWithPrices
  quantity: number
  unitPrice: number
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'debito',   label: 'Débito',   icon: Wallet },
  { value: 'cartao',   label: 'Crédito',  icon: CreditCard },
  { value: 'pix',      label: 'PIX',      icon: Smartphone },
]

function getPriceForTier(product: ProductWithPrices, tier: PriceTier): number {
  return product.product_prices?.find((p) => p.tier === tier)?.price ?? 0
}

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcInstallment(total: number, n: number, rate: number, free: number) {
  if (n <= free || rate === 0) return { per: total / n, totalFinal: total }
  const r = rate / 100
  const per = total * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
  return { per, totalFinal: per * n }
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function StockPill({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 999, background: 'rgba(248,113,113,0.1)', color: '#F87171', fontWeight: 600, whiteSpace: 'nowrap' }}>Sem estoque</span>
  if (stock <= 3)
    return <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 999, background: 'rgba(251,191,36,0.1)', color: '#FBBF24', fontWeight: 600, whiteSpace: 'nowrap' }}>{stock} rest.</span>
  return <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 999, background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 600, whiteSpace: 'nowrap' }}>Em estoque</span>
}

function AddToCartIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.75 9C12.75 8.58579 12.4142 8.25 12 8.25C11.5858 8.25 11.25 8.58579 11.25 9L11.25 11.25H9C8.58579 11.25 8.25 11.5858 8.25 12C8.25 12.4142 8.58579 12.75 9 12.75H11.25V15C11.25 15.4142 11.5858 15.75 12 15.75C12.4142 15.75 12.75 15.4142 12.75 15L12.75 12.75H15C15.4142 12.75 15.75 12.4142 15.75 12C15.75 11.5858 15.4142 11.25 15 11.25H12.75V9Z" fill="#22C55E"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12.0574 1.25H11.9426C9.63424 1.24999 7.82519 1.24998 6.41371 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24998 7.82519 1.24999 9.63422 1.25 11.9426V12.0574C1.24999 14.3658 1.24998 16.1748 1.43975 17.5863C1.63399 19.031 2.03933 20.1711 2.93414 21.0659C3.82895 21.9607 4.96897 22.366 6.41371 22.5603C7.82519 22.75 9.63423 22.75 11.9426 22.75H12.0574C14.3658 22.75 16.1748 22.75 17.5863 22.5603C19.031 22.366 20.1711 21.9607 21.0659 21.0659C21.9607 20.1711 22.366 19.031 22.5603 17.5863C22.75 16.1748 22.75 14.3658 22.75 12.0574V11.9426C22.75 9.63423 22.75 7.82519 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1748 1.24998 14.3658 1.24999 12.0574 1.25ZM3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62177 21.25 12C21.25 14.3782 21.2484 16.0864 21.0736 17.3864C20.9018 18.6648 20.5749 19.4355 20.0052 20.0052C19.4355 20.5749 18.6648 20.9018 17.3864 21.0736C16.0864 21.2484 14.3782 21.25 12 21.25C9.62177 21.25 7.91356 21.2484 6.61358 21.0736C5.33517 20.9018 4.56445 20.5749 3.9948 20.0052C3.42514 19.4355 3.09825 18.6648 2.92637 17.3864C2.75159 16.0864 2.75 14.3782 2.75 12C2.75 9.62177 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948Z" fill="#22C55E"/>
    </svg>
  )
}

const CARD_BASE: React.CSSProperties = {
  background: '#181920',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
}

function ProductDetail({
  product, price, onClose, onAdd,
}: { product: ProductWithPrices; price: number; onClose: () => void; onAdd: () => void }) {
  const initial = product.name[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#181920', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: '100%', maxWidth: 360, padding: 24, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}>
          <X size={14} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          {product.image_url
            ? <img src={product.image_url} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
            : <div style={{ width: 80, height: 80, borderRadius: 10, background: 'rgba(177,40,37,0.1)', border: '1px solid rgba(177,40,37,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#B12825' }}>{initial}</span>
              </div>
          }
        </div>
        <span style={{ display: 'inline-block', fontSize: 10, fontFamily: '"JetBrains Mono", monospace', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{product.sku}</span>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC', lineHeight: 1.4, marginBottom: 4 }}>{product.name}</p>
        {product.category && <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>{product.category}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F8FAFC' }}>{formatCurrency(price)}</span>
          <StockPill stock={product.stock} />
        </div>
        <button onClick={() => { onAdd(); onClose() }} style={{ width: '100%', height: 44, borderRadius: 8, border: 'none', background: 'var(--pm-accent-gradient)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <AddToCartIcon size={18} />
          Adicionar ao Carrinho
        </button>
      </div>
    </div>
  )
}

export default function PdvPage() {
  const navigate = useNavigate()
  const prefix = useRoutePrefix()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [installments, setInstallments] = useState(1)
  const [checkoutDone, setCheckoutDone] = useState<string | null>(null)
  const [finalizeHover, setFinalizeHover] = useState(false)
  const [detailProduct, setDetailProduct] = useState<ProductWithPrices | null>(null)

  // Discount
  const [discountPct, setDiscountPct] = useState(0)
  const [discountRaw, setDiscountRaw] = useState('')
  const [pendingDiscount, setPendingDiscount] = useState(0)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authPin, setAuthPin] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [selectedEcu, setSelectedEcu] = useState<PendingPayment | null>(null)

  const profile = useAuthStore((s) => s.profile)
  const maxDiscountPct = profile?.max_discount_pct ?? 0

  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id ?? null
  const maxDiscountFranquia = myUnit?.franchise_units?.max_discount_pct ?? maxDiscountPct
  const { data: ecuPendentes = [] } = usePendingPayments(unitId)

  const { data: companySettings } = useCompanySettings()
  const pdv = { ...PDV_DEFAULTS, ...(companySettings?.pdv_settings ?? {}) }

  const { data: productsData, isLoading: loadingProducts } = useProducts({ q: search, category, pageSize: 30 })
  const { data: categories = [] } = useProductCategories()
  const { data: customersData } = useCustomers({ pageSize: 100 })
  const { data: managerHashes = [] } = useManagerDiscountHashes()
  const checkout = useCheckout()

  const customers = customersData?.data ?? []
  const products = productsData?.data ?? []

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const priceTier: PriceTier = selectedCustomer?.price_tier ?? 'cliente_final'

  const baseTotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart])
  const discountedBase = discountPct > 0 ? baseTotal * (1 - discountPct / 100) : baseTotal
  const isCashDiscount = (paymentMethod === 'dinheiro' || paymentMethod === 'pix') && pdv.cash_pix_discount > 0
  const effectiveTotal = isCashDiscount ? discountedBase * (1 - pdv.cash_pix_discount / 100) : discountedBase

  const installmentInfo = useMemo(() => {
    if (paymentMethod !== 'cartao' || cart.length === 0) return null
    return calcInstallment(effectiveTotal, installments, pdv.interest_rate, pdv.interest_free_installments)
  }, [paymentMethod, installments, effectiveTotal, pdv.interest_rate, pdv.interest_free_installments, cart.length])

  const displayTotal = installmentInfo ? installmentInfo.totalFinal : effectiveTotal

  // ── Discount helpers ──────────────────────────────────────────────────────
  function requestDiscount(raw: string) {
    const val = Math.min(Math.max(parseFloat(raw) || 0, 0), 100)
    if (val <= maxDiscountPct) {
      setDiscountPct(val)
      setDiscountRaw(val > 0 ? String(val) : '')
    } else {
      setPendingDiscount(val)
      setAuthPin('')
      setAuthError('')
      setAuthModalOpen(true)
    }
  }

  async function handleAuthConfirm() {
    if (!authPin.trim()) return
    setAuthLoading(true)
    setAuthError('')
    try {
      if (managerHashes.length === 0) {
        setAuthError('Nenhuma senha de autorização configurada no sistema.')
        return
      }
      const hash = await sha256hex(authPin.trim())
      const match = managerHashes.some((m) => m.discount_auth_hash === hash)
      if (match) {
        setDiscountPct(pendingDiscount)
        setDiscountRaw(String(pendingDiscount))
        setAuthModalOpen(false)
        setPendingDiscount(0)
      } else {
        setAuthError('Senha incorreta. Tente novamente.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  function cancelAuthModal() {
    setAuthModalOpen(false)
    setPendingDiscount(0)
    setDiscountRaw(discountPct > 0 ? String(discountPct) : '')
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function addToCart(product: ProductWithPrices) {
    const price = getPriceForTier(product, priceTier)
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unitPrice: price }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  async function handleCheckout() {
    const totalMultiplier = displayTotal / (baseTotal || 1)
    const sale = await checkout.mutateAsync({
      customer_id: customerId || null,
      price_tier: priceTier,
      payment_method: paymentMethod,
      items: cart.map((i) => ({
        product_id: i.product.id,
        description: i.product.name,
        quantity: i.quantity,
        unit_price: i.unitPrice * totalMultiplier,
      })),
    })
    setCart([])
    setCustomerId('')
    setInstallments(1)
    setDiscountPct(0)
    setDiscountRaw('')
    setCheckoutDone(sale.id)
  }

  if (checkoutDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'hsl(var(--pm-red-500)/0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={36} style={{ color: 'hsl(var(--pm-red-500))' }} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">Venda Realizada!</h2>
          <p className="text-sm text-muted-foreground font-mono">#{checkoutDone.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setCheckoutDone(null)} style={{ background: 'var(--pm-accent-gradient)', color: 'white', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Nova Venda
          </button>
          <button onClick={() => navigate(`${prefix}/pedidos`)} style={{ background: 'transparent', color: 'hsl(var(--muted-foreground))', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            Ver Vendas
          </button>
        </div>
      </div>
    )
  }

  const canFinalize = cart.length > 0 && !checkout.isPending

  return (
    <div>
      <PageHeader title="PDV" subtitle="Ponto de Venda" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ height: 'calc(100vh - 160px)' }}>

        {/* ── Produtos ── */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category chips — wrap, not scroll */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => setCategory('')}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 150ms ease',
                  background: category === '' ? 'hsl(var(--pm-red-500)/0.15)' : 'rgba(255,255,255,0.05)',
                  color: category === '' ? 'hsl(var(--pm-red-500))' : 'hsl(var(--muted-foreground))',
                  outline: category === '' ? '1px solid hsl(var(--pm-red-500)/0.35)' : '1px solid transparent',
                }}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? '' : cat)}
                  style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 150ms ease', whiteSpace: 'nowrap',
                    background: category === cat ? 'hsl(var(--pm-red-500)/0.15)' : 'rgba(255,255,255,0.05)',
                    color: category === cat ? 'hsl(var(--pm-red-500))' : 'hsl(var(--muted-foreground))',
                    outline: category === cat ? '1px solid hsl(var(--pm-red-500)/0.35)' : '1px solid transparent',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
            {loadingProducts
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="pm-skeleton rounded" style={{ height: 52 }} />)
              : products.map((product) => {
                  const price = getPriceForTier(product, priceTier)
                  const inCart = cart.some((i) => i.product.id === product.id)
                  const initial = product.name[0]?.toUpperCase() ?? '?'
                  return (
                    <div
                      key={product.id}
                      role="button" tabIndex={0}
                      onClick={() => setDetailProduct(product)}
                      onKeyDown={(e) => e.key === 'Enter' && setDetailProduct(product)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px 9px 12px', borderRadius: 8,
                        border: `1px solid ${inCart ? 'hsl(var(--pm-red-500)/0.4)' : 'rgba(255,255,255,0.06)'}`,
                        background: inCart ? 'hsl(var(--pm-red-500)/0.08)' : '#181920',
                        cursor: 'pointer', transition: 'border-color 150ms ease, background 150ms ease',
                      }}
                    >
                      {product.image_url
                        ? <img src={product.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(177,40,37,0.1)', border: '1px solid rgba(177,40,37,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#B12825' }}>{initial}</span>
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: 'hsl(var(--muted-foreground))', marginBottom: 1 }}>{product.sku}</span>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{product.name}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{formatCurrency(price)}</span>
                        <StockPill stock={product.stock} />
                      </div>
                      <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)', flexShrink: 0, marginLeft: 4 }} />
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product) }}
                        title="Adicionar ao carrinho"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: inCart ? 0.55 : 1, transition: 'opacity 150ms, transform 150ms' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                      >
                        <AddToCartIcon size={22} />
                      </button>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* ── Carrinho ── */}
        <div className="lg:col-span-2 flex flex-col gap-3">

          {/* Cliente */}
          <div style={{ ...CARD_BASE, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Cliente</p>
            <Select value={customerId || '_anon'} onValueChange={(v) => setCustomerId(v === '_anon' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_anon">Venda Avulsa</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedCustomer && <div className="mt-2"><PriceTierBadge tier={selectedCustomer.price_tier} /></div>}
          </div>

          {/* Items */}
          <div style={{ ...CARD_BASE, flex: 1, overflowY: 'auto', padding: 0 }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: 40, color: 'hsl(var(--muted-foreground))' }}>
                <ShoppingCart size={28} style={{ opacity: 0.35 }} />
                <p style={{ fontSize: 13 }}>Carrinho vazio</p>
              </div>
            ) : (
              <div>
                {cart.map((item, idx) => (
                  <div key={item.product.id} style={{ padding: '12px 14px', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#F8FAFC', lineHeight: 1.4, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.product.name}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 150ms' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                        <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}><Minus size={11} /></button>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC', width: 28, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}><Plus size={11} /></button>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>{formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagamento + Total + Finalizar */}
          <div style={{ ...CARD_BASE, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Payment toggle */}
            <div style={{ display: 'flex', gap: 6 }}>
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => {
                const active = paymentMethod === value
                return (
                  <button
                    key={value}
                    onClick={() => { setPaymentMethod(value); setInstallments(1) }}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8,
                      border: active ? '1.5px solid #34D399' : '1px solid rgba(255,255,255,0.07)',
                      background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                      boxShadow: active ? '0 0 0 3px rgba(52,211,153,0.1)' : 'none',
                      color: active ? '#34D399' : 'hsl(var(--muted-foreground))',
                      fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms ease',
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Installments selector (cartão only) */}
            {paymentMethod === 'cartao' && cart.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Parcelas</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Array.from({ length: pdv.max_installments }, (_, i) => i + 1).map((n) => {
                    const { per, totalFinal } = calcInstallment(effectiveTotal, n, pdv.interest_rate, pdv.interest_free_installments)
                    const active = installments === n
                    const hasInterest = n > pdv.interest_free_installments && pdv.interest_rate > 0
                    return (
                      <button
                        key={n}
                        onClick={() => setInstallments(n)}
                        title={`${n}x ${formatCurrency(per)}${hasInterest ? ` (total ${formatCurrency(totalFinal)})` : ' sem juros'}`}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: active ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#34D399' : hasInterest ? '#FBBF24' : 'hsl(var(--muted-foreground))',
                          outline: active ? '1px solid rgba(52,211,153,0.4)' : '1px solid transparent',
                          transition: 'all 120ms ease',
                        }}
                      >
                        {n}x
                      </button>
                    )
                  })}
                </div>
                {installments > 1 && installmentInfo && (
                  <p style={{ fontSize: 11, color: installments > pdv.interest_free_installments ? '#FBBF24' : '#34D399', marginTop: 6 }}>
                    {installments}x {formatCurrency(installmentInfo.per)}
                    {installments <= pdv.interest_free_installments ? ' sem juros' : ` · total ${formatCurrency(installmentInfo.totalFinal)}`}
                  </p>
                )}
              </div>
            )}

            {/* Discount field */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                Desconto
                {maxDiscountPct > 0 && (
                  <span style={{ fontWeight: 400, fontSize: 9, color: '#475569' }}>
                    (até {maxDiscountPct}% autônomo)
                  </span>
                )}
                {maxDiscountPct === 0 && (
                  <span style={{ fontWeight: 400, fontSize: 9, color: '#475569' }}>
                    (requer autorização)
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="0"
                    value={discountRaw}
                    onChange={(e) => setDiscountRaw(e.target.value)}
                    onBlur={(e) => requestDiscount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
                    style={{ paddingRight: 28 }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'hsl(var(--muted-foreground))', pointerEvents: 'none' }}>%</span>
                </div>
                {discountPct > 0 && (
                  <button
                    onClick={() => { setDiscountPct(0); setDiscountRaw('') }}
                    style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}
                    title="Remover desconto"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Total */}
            <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {discountPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#34D399' }}>Desconto {discountPct}%</span>
                  <span style={{ fontSize: 11, color: '#34D399' }}>-{formatCurrency(baseTotal - discountedBase)}</span>
                </div>
              )}
              {isCashDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#34D399' }}>Desconto {pdv.cash_pix_discount}% ({paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'})</span>
                  <span style={{ fontSize: 11, color: '#34D399' }}>-{formatCurrency(discountedBase - effectiveTotal)}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#F8FAFC' }}>{formatCurrency(displayTotal)}</span>
              </div>
            </div>

            {/* Finalize button */}
            <button
              disabled={!canFinalize}
              onClick={handleCheckout}
              onMouseEnter={() => setFinalizeHover(true)}
              onMouseLeave={() => setFinalizeHover(false)}
              style={{
                position: 'relative', width: '100%', height: 48, borderRadius: 8, border: 'none',
                background: canFinalize ? 'var(--pm-accent-gradient)' : 'rgba(255,255,255,0.05)',
                color: canFinalize ? 'white' : 'rgba(255,255,255,0.25)',
                fontSize: 13, fontWeight: 700, cursor: canFinalize ? 'pointer' : 'not-allowed',
                overflow: 'hidden', transition: 'opacity 200ms ease', opacity: canFinalize ? 1 : 0.6,
              }}
            >
              {canFinalize && (
                <span style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: 'rgba(255,255,255,0.35)', width: finalizeHover ? '100%' : '60%', transition: 'width 400ms ease' }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {checkout.isPending ? 'Processando...' : `Finalizar · ${formatCurrency(displayTotal)}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Cobranças ECU pendentes */}
      {ecuPendentes.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--pm-gray-500))' }}>
              Cobranças ECU Pendentes
            </p>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'hsl(var(--pm-red-500)/0.15)', color: 'hsl(var(--pm-red-500))' }}>
              {ecuPendentes.length}
            </span>
          </div>
          <div className="space-y-2">
            {ecuPendentes.map((p) => (
              <div key={p.id} className="rounded-xl p-4 flex items-center justify-between gap-4"
                style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-medium text-white truncate text-sm">{p.ecu_jobs?.customers?.name ?? '—'}</p>
                  <p className="text-xs truncate" style={{ color: 'hsl(var(--pm-gray-400))' }}>
                    {p.ecu_jobs?.service_type ?? p.description}
                  </p>
                  {p.ecu_jobs?.seller && (
                    <p className="text-xs" style={{ color: 'hsl(var(--pm-gray-600))' }}>
                      Vendedor: {p.ecu_jobs.seller.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-semibold text-white text-sm">
                    {Math.abs(p.ecu_jobs?.amount_charged_to_customer ?? p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button onClick={() => setSelectedEcu(p)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'hsl(var(--pm-red-500))', color: '#fff' }}>
                    <CreditCard size={12} /> Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEcu && (
        <EcuPaymentSheet payment={selectedEcu} maxDiscountPct={maxDiscountFranquia} onClose={() => setSelectedEcu(null)} />
      )}

      {/* Product detail modal */}
      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          price={getPriceForTier(detailProduct, priceTier)}
          onClose={() => setDetailProduct(null)}
          onAdd={() => addToCart(detailProduct)}
        />
      )}

      {/* Discount authorization modal */}
      {authModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={cancelAuthModal}
        >
          <div
            style={{ background: '#181920', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: '100%', maxWidth: 340, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} style={{ color: '#FBBF24' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', marginBottom: 2 }}>Autorização Necessária</p>
                <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                  Desconto de <strong style={{ color: '#FBBF24' }}>{pendingDiscount}%</strong> acima do seu limite de {maxDiscountPct}%
                </p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
              Peça para um gerente ou administrador inserir a senha de autorização.
            </p>

            <Input
              type="password"
              placeholder="Senha do gerente..."
              value={authPin}
              onChange={(e) => { setAuthPin(e.target.value); setAuthError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAuthConfirm() }}
              autoFocus
              style={{ marginBottom: authError ? 6 : 14 }}
            />
            {authError && (
              <p style={{ fontSize: 11, color: '#F87171', marginBottom: 10 }}>{authError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={cancelAuthModal}
                style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'hsl(var(--muted-foreground))', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAuthConfirm}
                disabled={authLoading || !authPin.trim()}
                style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)', color: 'white', fontSize: 13, fontWeight: 600, cursor: authLoading || !authPin.trim() ? 'not-allowed' : 'pointer', opacity: authLoading || !authPin.trim() ? 0.6 : 1 }}
              >
                {authLoading ? 'Verificando...' : 'Autorizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
