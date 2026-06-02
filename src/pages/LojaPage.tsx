import { useState, useEffect, useMemo } from 'react'

function useBreakpoint(bp: number) {
  const [match, setMatch] = useState(false)
  useEffect(() => {
    const check = () => setMatch(window.innerWidth <= bp)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [bp])
  return match
}
import { Link } from 'react-router-dom'
import { useEcuCatalogPublic } from '@/hooks/useEcuCatalog'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import { lookupCarImage } from '@/data/car-image-map'
import { useProducts } from '@/hooks/useProducts'
import type { ProductWithPrices } from '@/hooks/useProducts'
import { useShipping } from '@/hooks/useShipping'
import type { ShippingOption, ShippingCartItem } from '@/hooks/useShipping'

const RED    = '#E72B2B'
const DARK   = '#141416'
const CARD   = '#1a1a1d'
const BORDER = '#242528'
const MUTED  = '#8a8d90'

const LOJA_CSS = `
.loja-pg .btn-skew{transform:skewX(-12deg);transition:filter .2s ease;position:relative;overflow:hidden;display:inline-flex}
.loja-pg .btn-skew-text{display:inline-block;transform:skewX(12deg)}
.loja-pg .btn-skew:hover{filter:brightness(1.22)}
.loja-pg .btn-skew::before{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transform:skewX(25deg);transition:left .45s ease}
.loja-pg .btn-skew:hover::before{left:200%}
.loja-pg .arrow-slide{transition:transform .2s ease;display:inline-block}
.loja-pg .btn-skew:hover .arrow-slide{transform:translateX(4px)}
.loja-pg .card-img img{transition:transform .6s cubic-bezier(.25,1,.5,1)}
.loja-pg .product-card:hover .card-img img{transform:scale(1.05)}
.loja-pg .product-card{transition:border-color .25s ease}
.loja-pg .product-card:hover{border-color:${RED} !important}
.loja-pg .filter-row{background:transparent;border:none;border-bottom:1px solid ${BORDER};cursor:pointer;width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;padding:.65rem .75rem;transition:background .15s}
.loja-pg .filter-row:hover{background:rgba(255,255,255,.03)}
.loja-pg .filter-row:last-child{border-bottom:none}
.loja-pg .filter-row.active{background:rgba(231,43,43,.07)}
@keyframes sw-l{0%,100%{transform:translateX(-5px);opacity:.2}50%{transform:translateX(0);opacity:1}}
@keyframes sw-r{0%,100%{transform:translateX(5px);opacity:.2}50%{transform:translateX(0);opacity:1}}
.sw-l{animation:sw-l 1.3s cubic-bezier(.45,0,.55,1) infinite}
.sw-r{animation:sw-r 1.3s cubic-bezier(.45,0,.55,1) infinite}
@keyframes fadeUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
.loja-pg .product-card{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.cart-drawer{animation:slideIn .25s cubic-bezier(.16,1,.3,1) both}
.cart-overlay{animation:fadeUp .2s ease both}
.cart-item-img{width:56px;height:56px;object-fit:cover;flex-shrink:0}
`

const PAGE_SIZE = 24

const CATEGORIES = [
  { key:'carros',  label:'CARROS',   slug:'carros-e-suvs' },
  { key:'pickups', label:'PICKUPS',  slug:'pickups'       },
  { key:'trucks',  label:'TRUCKS',   slug:'trucks'        },
  { key:'agricola',label:'AGRÍCOLA', slug:'agricola'      },
  { key:'maquinas',label:'MÁQUINAS', slug:'maquinas'      },
  { key:'motos',   label:'MOTOS',    slug:'motos'         },
]

const WA_NUM = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g,'')
const MONO: React.CSSProperties = { fontFamily:'"JetBrains Mono",monospace' }
const DISP: React.CSSProperties = { fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic' }

interface CartItem {
  id: string
  sku: string
  name: string
  price: number | null
  image_url: string | null
  qty: number
}

function parseGain(ganho: string | null): { num: string; unit: string } {
  if (!ganho) return { num: '—', unit: '' }
  const m = ganho.match(/([+-]?\d+(?:[.,]\d+)?)\s*(cv|kgf\.?m|%)/i)
  if (m) return { num: m[1].startsWith('+') || m[1].startsWith('-') ? m[1] : '+' + m[1], unit: m[2].toLowerCase().replace('kgf.m','kgf.m') }
  return { num: ganho.slice(0, 8), unit: '' }
}

function formatPrice(v: number | null): string {
  if (!v) return 'Consultar'
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function waLink(row: EcuCatalogRow): string {
  const title = [row.marca, row.secao_original, row.modelo_descricao].filter(Boolean).join(' ')
  const price = formatPrice(row.preco_cliente_final)
  const msg = `Olá! Tenho interesse no remapeamento:\n*Veículo:* ${title}\n*Ganho:* ${row.ganho ?? '—'}\n*Preço:* ${price}\n\nAguardo retorno!`
  return WA_NUM ? `https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}` : '#'
}

export default function LojaPage() {
  const isMobile = useBreakpoint(768)
  const [filterOpen, setFilterOpen]  = useState(false)
  const [section, setSection]       = useState<'remap'|'acessorios'>('remap')
  const [category, setCategory]     = useState('carros')
  const [brandFilter, setBrandFilter] = useState('')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(0)
  const [accCategory, setAccCategory] = useState('')
  const [accSearch, setAccSearch]   = useState('')
  const [accPage, setAccPage]       = useState(0)
  const [cart, setCart]             = useState<CartItem[]>([])
  const [cartOpen, setCartOpen]     = useState(false)
  const [cartStep, setCartStep]     = useState<'items'|'checkout'>('items')
  const [delivery, setDelivery]     = useState({ cep:'', address:'', number:'', city:'', state:'', reference:'' })
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)

  const cartSubtotal = cart.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0)
  const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0
  const cartTotal    = cartSubtotal + shippingCost
  const cartCount    = cart.reduce((s, i) => s + i.qty, 0)

  const shippingItems: ShippingCartItem[] = cart
    .filter(i => i.price != null)
    .map(i => ({ productId: i.id, quantity: i.qty, price: i.price! }))
  const { data: shippingOptions, isFetching: shippingLoading, error: shippingError } = useShipping(delivery.cep, shippingItems)

  function handleCepChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setDelivery(d => ({ ...d, cep: masked }))
    setSelectedShipping(null)
  }

  function pushToCart(p: ProductWithPrices): void {
    const price = p.product_prices?.find(x => x.tier === 'cliente_final')?.price ?? null
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === p.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; return next
      }
      return [...prev, { id: p.id, sku: p.sku, name: p.name, price: price ? Number(price) : null, image_url: p.image_url, qty: 1 }]
    })
  }

  function addToCart(p: ProductWithPrices) {
    pushToCart(p)
    // silent — no drawer open
  }

  function buyNow(p: ProductWithPrices) {
    pushToCart(p)
    setCartStep('checkout')
    setCartOpen(true)
  }

  function changeQty(id: string, delta: number) {
    setCart(prev => prev.flatMap(i => {
      if (i.id !== id) return [i]
      const qty = i.qty + delta
      return qty <= 0 ? [] : [{ ...i, qty }]
    }))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  function sendCartWA() {
    const lines = cart.map(i => {
      const un  = i.price ? 'R$ ' + i.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 'consultar'
      const sub = i.price ? 'R$ ' + (i.price * i.qty).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 'consultar'
      return `• *${i.qty}x ${i.name}* (SKU: ${i.sku})\n  Valor un.: ${un} | Total: ${sub}`
    }).join('\n')
    const d = delivery
    const subtotalLine = cartSubtotal > 0 ? `\n\n💰 *RESUMO FINANCEIRO:*\n*Subtotal:* R$ ${cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : ''
    const freteLines = selectedShipping
      ? `\n*Frete (${selectedShipping.name}):* R$ ${parseFloat(selectedShipping.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · ${selectedShipping.delivery_time} dias úteis\n*TOTAL: R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}*`
      : cartSubtotal > 0 ? `\n*TOTAL GERAL: R$ ${cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}*` : ''
    const deliveryBlock = [
      `\n\n📦 *DADOS DE ENTREGA:*`,
      `*Endereço:* ${d.address}${d.number ? `, ${d.number}` : ''}`,
      `*Cidade/Estado:* ${d.city}${d.state ? `/${d.state}` : ''}`,
      `*CEP:* ${d.cep}`,
      d.reference ? `*Referência:* ${d.reference}` : '',
    ].filter(Boolean).join('\n')
    const msg = `Olá! Finalizei meu pedido na loja Promax.\n\n🛒 *PRODUTOS:*\n${lines}${subtotalLine}${freteLines}${deliveryBlock}`
    window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function closeCart() {
    setCartOpen(false)
    setCartStep('items')
  }

  const catSlug = CATEGORIES.find(c => c.key === category)?.slug ?? 'carros-e-suvs'
  const { data: rows = [], isLoading } = useEcuCatalogPublic(catSlug)

  // Acessórios — fetch all active products (large page, filter client-side)
  const { data: accData, isLoading: accLoading } = useProducts({ pageSize: 600, q: '' })
  const accProducts: ProductWithPrices[] = ((accData?.data ?? []) as ProductWithPrices[]).filter(p => p.active)

  const accCategories = useMemo(
    () => [...new Set(accProducts.map(p => p.category).filter(Boolean))].sort(),
    [accProducts],
  )

  const filteredAcc = useMemo(() => {
    let r = accCategory ? accProducts.filter(p => p.category === accCategory) : accProducts
    if (accSearch.trim()) {
      const q = accSearch.toLowerCase()
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    }
    return r
  }, [accProducts, accCategory, accSearch])

  const accTotalPages = Math.max(1, Math.ceil(filteredAcc.length / PAGE_SIZE))
  const accVisible    = filteredAcc.slice(accPage * PAGE_SIZE, (accPage + 1) * PAGE_SIZE)

  // Reset pages on filter change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(0) }, [category, brandFilter, search])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAccPage(0) }, [accCategory, accSearch])

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'loja-pg-css'
    el.textContent = LOJA_CSS
    document.head.appendChild(el)
    return () => document.getElementById('loja-pg-css')?.remove()
  }, [])

  const brands = useMemo(
    () => [...new Set(rows.map(r => r.marca).filter((m): m is string => Boolean(m)))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    let r = brandFilter ? rows.filter(row => row.marca === brandFilter) : rows
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(row =>
        row.marca?.toLowerCase().includes(q) ||
        row.modelo_descricao?.toLowerCase().includes(q) ||
        row.secao_original?.toLowerCase().includes(q) ||
        row.categoria?.toLowerCase().includes(q)
      )
    }
    return r
  }, [rows, brandFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="loja-pg" style={{ background:DARK, color:'#fff', minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'"DM Sans",sans-serif', overflowX:'hidden', maxWidth:'100vw' }}>

      {/* ── HEADER ── */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,9,0.97)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ padding: isMobile ? '0 1rem' : '0 2rem', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ lineHeight:0 }}>
            <img src="/tuner-logo.svg" alt="Promax Tuner" style={{ height:'22px', width:'auto' }} />
          </Link>
          <nav style={{ display: isMobile ? 'none' : 'flex', alignItems:'center', gap:'2.25rem', fontWeight:700, fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase' }}>
            {[
              { label:'Serviços',      href:'/#serviços' },
              { label:'Veículos',      href:'/#veículos' },
              { label:'Como Funciona', href:'/#como-funciona' },
              { label:'Resultados',    href:'/#resultados' },
              { label:'Sobre',         href:'/#sobre' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ color:'rgba(255,255,255,.5)', textDecoration:'none', transition:'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color='#fff')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,.5)')}
              >{l.label}</a>
            ))}
            <div style={{ width:'1px', height:'14px', background:'rgba(255,255,255,.16)' }} />
            <Link to="/loja" style={{ color:'#fff', textDecoration:'none', borderBottom:`2px solid ${RED}`, paddingBottom:'3px' }}>Loja</Link>
          </nav>
          {!isMobile && (
            <div className="btn-skew" style={{ background:RED }}>
              <a href="/#veículos" className="btn-skew-text" style={{ padding:'0 1.4rem', height:'40px', ...DISP, fontWeight:700, textTransform:'uppercase', fontSize:'1.1rem', letterSpacing:'0.1em', color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
                Analisar Veículo <span className="arrow-slide" style={{ marginLeft:'4px' }}>→</span>
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ── BANNER ── */}
      <section style={{ overflow:'hidden', position:'relative', background:'#0a0a0b', borderBottom:`2px solid ${BORDER}` }}>
        <div style={{ position:'absolute', inset:0 }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(105deg,#0a0a0b 0%,#0a0a0b 52%,#1a0505 52%,#0f0303 100%)' }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:'51%', width:'3px', background:RED, transform:'skewX(-6deg)', zIndex:1 }} />
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 50%,rgba(231,43,43,.08) 0%,transparent 65%)', zIndex:1 }} />
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize:'48px 48px', zIndex:1 }} />
        </div>
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap:'1.5rem', padding: isMobile ? '1.25rem 1rem 1.5rem' : '1.5rem 2rem', minHeight: isMobile ? 'auto' : '165px' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.5rem' }}>
              <span style={{ width:'28px', height:'2px', background:RED, display:'inline-block' }} />
              <span style={{ ...MONO, fontSize:'.58rem', letterSpacing:'.32em', textTransform:'uppercase', color:RED }}>Loja Oficial</span>
            </div>
            <h1 style={{ ...DISP, fontWeight:900, textTransform:'uppercase', lineHeight:.88, color:'#fff', margin:'0 0 .75rem', fontSize:'clamp(2.6rem,6vw,5.2rem)', letterSpacing:'-.02em' }}>
              MÁXIMA<br/>
              <span style={{ color:RED }}>PERFORMANCE</span>
              <span style={{ color:MUTED, fontSize:'.65em', display:'block', marginTop:'.05em' }}>PARA SEU VEÍCULO</span>
            </h1>
            <div style={{ display:'flex', alignItems:'stretch', gap:0, flexWrap:'wrap' }}>
              {[
                { val:String(rows.length || '1.9k+'), label:'Registros ECU',      red:false },
                { val:String(brands.length || '—'),   label:'Marcas no Catálogo', red:false },
                { val:'100%',                          label:'Licença Definitiva', red:true  },
              ].map((s,i) => (
                <div key={s.label} style={{ padding:'.6rem 1.4rem .6rem 0', borderRight:i<2?`1px solid ${BORDER}`:'none', marginRight:i<2?'1.4rem':0 }}>
                  <span style={{ ...DISP, fontWeight:900, fontSize:'2rem', color:s.red?RED:'#fff', lineHeight:1, display:'block' }}>{s.val}</span>
                  <span style={{ ...MONO, fontSize:'.55rem', letterSpacing:'.18em', textTransform:'uppercase', color:MUTED, display:'block', marginTop:'2px' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flexShrink:0, display: isMobile ? 'none' : 'flex', flexDirection:'column', alignItems:'flex-end', gap:'1rem', minWidth:'240px' }}>
            <div style={{ background:'rgba(231,43,43,.1)', border:'1px solid rgba(231,43,43,.3)', padding:'1.25rem 1.75rem', textAlign:'center', position:'relative' }}>
              <div style={{ position:'absolute', top:'-1px', left:'-1px', width:'16px', height:'16px', borderTop:`2px solid ${RED}`, borderLeft:`2px solid ${RED}` }} />
              <div style={{ position:'absolute', bottom:'-1px', right:'-1px', width:'16px', height:'16px', borderBottom:`2px solid ${RED}`, borderRight:`2px solid ${RED}` }} />
              <span style={{ ...MONO, fontSize:'.55rem', letterSpacing:'.28em', textTransform:'uppercase', color:RED, display:'block', marginBottom:'.4rem' }}>Catálogo ECU</span>
              <span style={{ ...DISP, fontWeight:900, fontSize:'1.5rem', color:'#fff', textTransform:'uppercase', display:'block', lineHeight:1.1 }}>Carros · Trucks</span>
              <span style={{ ...MONO, fontSize:'.6rem', color:MUTED, display:'block', marginTop:'.3rem' }}>Pickups · Agrícola · Máquinas</span>
              <div style={{ marginTop:'.9rem', paddingTop:'.75rem', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                <span style={{ ...DISP, fontWeight:700, fontSize:'1.75rem', color:'#fff' }}>+1.900 veículos</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
              <span style={{ width:'6px', height:'6px', background:RED, transform:'rotate(45deg)', flexShrink:0, display:'inline-block' }} />
              <span style={{ ...MONO, fontSize:'.58rem', letterSpacing:'.14em', textTransform:'uppercase', color:MUTED }}>Remapeamento com garantia técnica</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEPARATOR ── */}
      <div style={{ background:BORDER, borderBottom:`1px solid #2e3035`, padding: isMobile ? '.75rem 1rem' : '.9rem 2rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ ...MONO, fontSize:'.58rem', letterSpacing:'.22em', textTransform:'uppercase', color:'#6b6e73' }}>
          escolha entre produtos ou remap no menu abaixo
        </span>
      </div>

      {/* ── SECTION SWITCHER ── */}
      <div style={{ display:'flex', background:'#0a0a0b', borderBottom:`2px solid ${BORDER}`, position:'relative' }}>
        {(['remap','acessorios'] as const).map(s => {
          const active = section === s
          return (
            <button key={s} onClick={() => setSection(s)} style={{
              flex:1, height: isMobile ? '52px' : '64px', ...DISP, fontWeight:900, textTransform:'uppercase',
              fontSize: isMobile ? '1.1rem' : '1.55rem', letterSpacing:'.1em',
              background: active ? RED : '#5e5e66', color: active ? '#fff' : '#1a1a1e',
              border:'none', cursor:'pointer', borderRight: s==='remap' ? `2px solid #1a0808` : 'none',
              transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:'.75rem',
            }}>
              <span style={{ ...MONO, fontSize:'1.8rem', display:'inline-block', opacity: active ? 1 : 0.35 }} className={active ? 'sw-l' : ''}>→</span>
              {s === 'remap' ? 'REMAP' : 'ACESSÓRIOS'}
              <span style={{ ...MONO, fontSize:'1.8rem', display:'inline-block', opacity: active ? 1 : 0.35 }} className={active ? 'sw-r' : ''}>←</span>
            </button>
          )
        })}
        {/* junction icon */}
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', zIndex:10, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', width:50, height:50, background:'#0a0a0b', borderRadius:'50%', border:`1.5px solid #2a2a2e` }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24">
            <g fill="none" fillRule="nonzero">
              <path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z"/>
              <path fill="#FFFFFF" d="M8.207 11.757a1 1 0 0 1 0 1.415L6.38 15H16a1 1 0 1 1 0 2H6.38l1.828 1.828a1 1 0 1 1-1.414 1.415l-3.536-3.536a1 1 0 0 1 0-1.414l3.536-3.536a1 1 0 0 1 1.414 0Zm7.586-8a1 1 0 0 1 1.32-.083l.094.083 3.536 3.536a1 1 0 0 1 .083 1.32l-.083.094-3.536 3.535a1 1 0 0 1-1.497-1.32l.083-.094L17.62 9H8a1 1 0 0 1-.117-1.993L8 7h9.621L15.793 5.17a1 1 0 0 1 0-1.414Z"/>
            </g>
          </svg>
        </div>
      </div>

      {/* ── REMAP SECTION ── */}
      {section === 'remap' && (
        <>
          {/* Category tabs */}
          <div style={{ background:BORDER, marginTop:'50px' }}>
            <div style={{ padding:'.75rem 2rem', display:'flex', gap:'.5rem', overflowX:'auto', maxWidth:'1920px', margin:'0 auto' }}>
              {CATEGORIES.map(c => {
                const active = category === c.key
                return (
                  <button key={c.key} onClick={() => setCategory(c.key)} style={{
                    ...DISP, fontWeight:700, textTransform:'uppercase', fontSize:'.9rem', letterSpacing:'.08em',
                    padding:'.6rem 1.75rem', whiteSpace:'nowrap', cursor:'pointer',
                    background: active ? RED : 'transparent', color: active ? '#fff' : MUTED,
                    border: active ? 'none' : `1px solid rgba(255,255,255,.12)`,
                    transition:'all .15s',
                  }}>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'flex', flex:1, flexDirection: isMobile ? 'column' : 'row', maxWidth:'1920px', margin:'0 auto', width:'100%' }}>
            {/* Mobile filter toggle */}
            {isMobile && (
              <div style={{ padding:'.75rem 1rem', borderBottom:`1px solid ${BORDER}`, background:DARK }}>
                <button onClick={() => setFilterOpen(v => !v)} style={{
                  background:'none', border:`1px solid ${BORDER}`, color:'#fff', padding:'.5rem 1rem',
                  cursor:'pointer', fontSize:'.75rem', letterSpacing:'.1em', textTransform:'uppercase',
                  display:'flex', alignItems:'center', gap:'.5rem', fontFamily:'"JetBrains Mono",monospace',
                }}>
                  {filterOpen ? '✕ FECHAR FILTROS' : '▸ FILTROS'} {brandFilter && `· ${brandFilter}`}
                </button>
              </div>
            )}
            {/* Filter sidebar */}
            <aside style={{ width: isMobile ? '100%' : '260px', flexShrink:0, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, background:DARK, minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)', display: isMobile && !filterOpen ? 'none' : 'block', borderBottom: isMobile ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${BORDER}`, padding:'.75rem 1.25rem' }}>
                <span style={{ ...MONO, color:'#fff', textTransform:'uppercase', fontSize:'.6rem', letterSpacing:'.28em', fontWeight:600 }}>
                  <span style={{ color:RED }}>▸ </span>FILTROS
                </span>
                {brandFilter && (
                  <button onClick={() => setBrandFilter('')}
                    style={{ ...MONO, color:MUTED, textTransform:'uppercase', fontSize:'.55rem', letterSpacing:'.12em', background:'none', border:'none', cursor:'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.color=RED)} onMouseOut={e => (e.currentTarget.style.color=MUTED)}>
                    LIMPAR
                  </button>
                )}
              </div>

              <FilterSection label="── MARCA">
                <div style={{ border:`1px solid ${BORDER}` }}>
                  {brands.map((b, i) => {
                    const active = brandFilter === b
                    return (
                      <button key={b} onClick={() => setBrandFilter(active ? '' : b)} className={`filter-row${active?' active':''}`} style={{ borderBottom: i < brands.length-1 ? `1px solid ${BORDER}` : 'none' }}>
                        <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.68rem', letterSpacing:'.08em', color: active ? '#fff' : MUTED }}>{b}</span>
                        <span style={{ ...MONO, fontSize:'.6rem', color: active ? RED : MUTED }}>{active ? '[×]' : '[ ]'}</span>
                      </button>
                    )
                  })}
                  {brands.length === 0 && isLoading && (
                    <div style={{ padding:'1rem', ...MONO, fontSize:'.6rem', color:MUTED, textAlign:'center' }}>carregando...</div>
                  )}
                </div>
              </FilterSection>
            </aside>

            {/* Grid */}
            <div style={{ flexGrow:1, padding: isMobile ? '1rem' : '2rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem', borderBottom:`1px solid ${BORDER}`, paddingBottom:'1rem', flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:1, minWidth:'180px' }}>
                  <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:MUTED, fontSize:'14px', pointerEvents:'none' }}>⌕</span>
                  <input
                    type="text"
                    placeholder="Buscar marca, modelo ou categoria..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width:'100%', background:'rgba(255,255,255,.04)', border:`1px solid ${BORDER}`,
                      borderRadius:0, padding:'.55rem .75rem .55rem 2.2rem',
                      color:'#fff', fontFamily:'"JetBrains Mono",monospace', fontSize:'.75rem',
                      outline:'none', boxSizing:'border-box',
                      transition:'border-color .15s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'12px', padding:0, lineHeight:1 }}>✕</button>
                  )}
                </div>
                <span style={{ color:MUTED, textTransform:'uppercase', fontSize:'10px', letterSpacing:'.15em', whiteSpace:'nowrap' }}>
                  <strong style={{ color:'#fff' }}>{filtered.length}</strong> resultado{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isLoading ? (
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:'1rem' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ background:CARD, border:`1px solid ${BORDER}`, height:'180px', opacity: 0.4 + (i % 6) * 0.08 }} />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '3rem 1rem' : '6rem', border:`1px solid ${BORDER}`, background:CARD, color:MUTED, textAlign:'center' }}>
                  <div style={{ ...DISP, fontWeight:700, fontSize:'1.1rem', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'.5rem' }}>Em breve</div>
                  <div style={{ fontSize:'.75rem' }}>Registros para esta categoria sendo preparados</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:'1rem' }}>
                  {visible.map((row, i) => <ProductCard key={row.id} row={row} delay={i * 20} />)}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem' }}>
                  <span style={{ ...MONO, color:MUTED, textTransform:'uppercase', fontSize:'9px', letterSpacing:'.2em' }}>
                    Página {page+1} / {totalPages}
                  </span>
                  <div style={{ display:'flex', gap:'.375rem', ...DISP, fontWeight:700, fontSize:'1.25rem' }}>
                    <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{ width:'36px', height:'36px', border:`1px solid ${BORDER}`, background:'transparent', color: page===0 ? MUTED : '#fff', cursor: page===0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: page===0 ? 0.4 : 1 }}>←</button>
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                      return (
                        <button key={p} onClick={() => setPage(p)} style={{ width:'36px', height:'36px', border: p===page ? `1px solid ${RED}` : `1px solid ${BORDER}`, background: p===page ? RED : 'transparent', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem' }}>{p+1}</button>
                      )
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page === totalPages-1} style={{ width:'36px', height:'36px', border:`1px solid ${BORDER}`, background:'transparent', color: page===totalPages-1 ? MUTED : '#fff', cursor: page===totalPages-1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: page===totalPages-1 ? 0.4 : 1 }}>→</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── ACESSÓRIOS ── */}
      {section === 'acessorios' && (
        <div style={{ display:'flex', flex:1, flexDirection: isMobile ? 'column' : 'row', maxWidth:'1920px', margin:'50px auto 0', width:'100%' }}>
          {/* Mobile filter toggle for accessories */}
          {isMobile && (
            <div style={{ padding:'.75rem 1rem', borderBottom:`1px solid ${BORDER}`, background:DARK }}>
              <button onClick={() => setFilterOpen(v => !v)} style={{
                background:'none', border:`1px solid ${BORDER}`, color:'#fff', padding:'.5rem 1rem',
                cursor:'pointer', fontSize:'.75rem', letterSpacing:'.1em', textTransform:'uppercase',
                display:'flex', alignItems:'center', gap:'.5rem', fontFamily:'"JetBrains Mono",monospace',
              }}>
                {filterOpen ? '✕ FECHAR FILTROS' : '▸ FILTROS'} {accCategory && `· ${accCategory}`}
              </button>
            </div>
          )}
          {/* Sidebar */}
          <aside style={{ width: isMobile ? '100%' : '260px', flexShrink:0, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, background:DARK, minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)', display: isMobile && !filterOpen ? 'none' : 'block', borderBottom: isMobile ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${BORDER}`, padding:'.75rem 1.25rem' }}>
              <span style={{ ...MONO, color:'#fff', textTransform:'uppercase', fontSize:'.6rem', letterSpacing:'.28em', fontWeight:600 }}>
                <span style={{ color:RED }}>▸ </span>FILTROS
              </span>
              {accCategory && (
                <button onClick={() => setAccCategory('')}
                  style={{ ...MONO, color:MUTED, textTransform:'uppercase', fontSize:'.55rem', letterSpacing:'.12em', background:'none', border:'none', cursor:'pointer' }}
                  onMouseOver={e => (e.currentTarget.style.color=RED)} onMouseOut={e => (e.currentTarget.style.color=MUTED)}>
                  LIMPAR
                </button>
              )}
            </div>
            <FilterSection label="── CATEGORIA">
              <div style={{ border:`1px solid ${BORDER}` }}>
                {accCategories.map((cat, i) => {
                  const active = accCategory === cat
                  return (
                    <button key={cat} onClick={() => setAccCategory(active ? '' : cat)} className={`filter-row${active?' active':''}`} style={{ borderBottom: i < accCategories.length-1 ? `1px solid ${BORDER}` : 'none' }}>
                      <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.68rem', letterSpacing:'.08em', color: active ? '#fff' : MUTED }}>{cat}</span>
                      <span style={{ ...MONO, fontSize:'.6rem', color: active ? RED : MUTED }}>{active ? '[×]' : '[ ]'}</span>
                    </button>
                  )
                })}
                {accCategories.length === 0 && accLoading && (
                  <div style={{ padding:'1rem', ...MONO, fontSize:'.6rem', color:MUTED, textAlign:'center' }}>carregando...</div>
                )}
              </div>
            </FilterSection>
          </aside>

          {/* Grid */}
          <div style={{ flexGrow:1, padding: isMobile ? '1rem' : '2rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', borderBottom:`1px solid ${BORDER}`, paddingBottom:'1rem', flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:'180px' }}>
                <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:MUTED, fontSize:'14px', pointerEvents:'none' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Buscar produto, SKU ou categoria..."
                  value={accSearch}
                  onChange={e => setAccSearch(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,.04)', border:`1px solid ${BORDER}`, borderRadius:0, padding:'.55rem .75rem .55rem 2.2rem', color:'#fff', fontFamily:'"JetBrains Mono",monospace', fontSize:'.75rem', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                {accSearch && (
                  <button onClick={() => setAccSearch('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'12px', padding:0, lineHeight:1 }}>✕</button>
                )}
              </div>
              <span style={{ color:MUTED, textTransform:'uppercase', fontSize:'10px', letterSpacing:'.15em', whiteSpace:'nowrap' }}>
                <strong style={{ color:'#fff' }}>{filteredAcc.length}</strong> produto{filteredAcc.length !== 1 ? 's' : ''}
              </span>
            </div>

            {accLoading ? (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:'1rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ background:CARD, border:`1px solid ${BORDER}`, height:'200px', opacity: 0.4 + (i % 6) * 0.08 }} />
                ))}
              </div>
            ) : accVisible.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6rem', border:`1px solid ${BORDER}`, background:CARD, color:MUTED, textAlign:'center' }}>
                <div style={{ ...DISP, fontWeight:700, fontSize:'1.1rem', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'.5rem' }}>Nenhum resultado</div>
                <div style={{ fontSize:'.75rem' }}>Tente outro filtro ou busca</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:'1rem' }}>
                {accVisible.map((p, i) => <ProductItemCard key={p.id} product={p} delay={i * 20} onAddToCart={addToCart} onBuyNow={buyNow} />)}
              </div>
            )}

            {accTotalPages > 1 && (
              <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem' }}>
                <span style={{ ...MONO, color:MUTED, textTransform:'uppercase', fontSize:'9px', letterSpacing:'.2em' }}>
                  Página {accPage+1} / {accTotalPages}
                </span>
                <div style={{ display:'flex', gap:'.375rem', ...DISP, fontWeight:700, fontSize:'1.25rem' }}>
                  <button onClick={() => setAccPage(p => Math.max(0, p-1))} disabled={accPage === 0} style={{ width:'36px', height:'36px', border:`1px solid ${BORDER}`, background:'transparent', color: accPage===0 ? MUTED : '#fff', cursor: accPage===0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: accPage===0 ? 0.4 : 1 }}>←</button>
                  {Array.from({ length: Math.min(5, accTotalPages) }).map((_, i) => {
                    const p = Math.max(0, Math.min(accPage - 2, accTotalPages - 5)) + i
                    return (
                      <button key={p} onClick={() => setAccPage(p)} style={{ width:'36px', height:'36px', border: p===accPage ? `1px solid ${RED}` : `1px solid ${BORDER}`, background: p===accPage ? RED : 'transparent', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem' }}>{p+1}</button>
                    )
                  })}
                  <button onClick={() => setAccPage(p => Math.min(accTotalPages-1, p+1))} disabled={accPage === accTotalPages-1} style={{ width:'36px', height:'36px', border:`1px solid ${BORDER}`, background:'transparent', color: accPage===accTotalPages-1 ? MUTED : '#fff', cursor: accPage===accTotalPages-1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: accPage===accTotalPages-1 ? 0.4 : 1 }}>→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CART FAB ── (só visível em Acessórios) */}
      {section === 'acessorios' && (
        <button
          onClick={() => { setCartStep('items'); setCartOpen(o => !o) }}
          style={{
            position:'fixed', bottom:'2rem', right:'2rem', zIndex:200,
            width:'60px', height:'60px', background:RED, border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 24px rgba(231,43,43,.5)',
            transform:'skewX(-6deg)',
          }}
          title="Ver carrinho"
        >
          <span style={{ transform:'skewX(6deg)', fontSize:'22px' }}>🛒</span>
          {cartCount > 0 && (
            <span style={{
              position:'absolute', top:'-6px', right:'-6px',
              background:'#fff', color:RED, borderRadius:'999px',
              width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center',
              ...MONO, fontSize:'10px', fontWeight:700, transform:'skewX(6deg)',
            }}>
              {cartCount}
            </span>
          )}
        </button>
      )}

      {/* ── CART OVERLAY ── */}
      {cartOpen && section === 'acessorios' && (
        <div
          className="cart-overlay"
          onClick={closeCart}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:300, backdropFilter:'blur(2px)' }}
        />
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && section === 'acessorios' && (
        <div
          className="cart-drawer"
          style={{
            position:'fixed', top:0, right:0, bottom:0, zIndex:400,
            width:'min(420px, 100vw)', background:'#111113',
            borderLeft:`1px solid ${BORDER}`, display:'flex', flexDirection:'column',
            boxShadow:'-8px 0 40px rgba(0,0,0,.6)',
          }}
        >
          {/* Header */}
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
              {cartStep === 'checkout' && (
                <button onClick={() => setCartStep('items')} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'4px 6px 4px 0' }}>←</button>
              )}
              <div>
                <span style={{ ...DISP, fontWeight:900, fontSize:'1.6rem', textTransform:'uppercase', color:'#fff' }}>
                  {cartStep === 'items' ? 'Carrinho' : 'Entrega'}
                </span>
                {cartStep === 'items' && cartCount > 0 && (
                  <span style={{ ...MONO, fontSize:'.6rem', color:MUTED, textTransform:'uppercase', letterSpacing:'.15em', marginLeft:'.75rem' }}>{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
                )}
              </div>
            </div>
            <button onClick={closeCart} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'20px', lineHeight:1, padding:'4px' }}>✕</button>
          </div>

          {/* STEP 1 — Items */}
          {cartStep === 'items' && (
            <div style={{ flex:1, overflowY:'auto', padding:'1rem 1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
              {cart.length === 0 ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', padding:'3rem 0', color:MUTED }}>
                  <span style={{ fontSize:'2.5rem', opacity:.3 }}>🛒</span>
                  <span style={{ ...DISP, fontWeight:700, fontSize:'1.1rem', textTransform:'uppercase', letterSpacing:'.1em' }}>Carrinho vazio</span>
                  <span style={{ fontSize:'.75rem' }}>Adicione produtos da loja</span>
                </div>
              ) : (
                cart.map(item => {
                  const itemTotal = item.price ? item.price * item.qty : null
                  return (
                    <div key={item.id} style={{ display:'flex', gap:'.75rem', background:CARD, border:`1px solid ${BORDER}`, padding:'.75rem' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="cart-item-img" referrerPolicy="no-referrer" style={{ borderRadius:2 }} />
                      ) : (
                        <div style={{ width:56, height:56, background:'#1a1a1d', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ ...DISP, fontSize:'1rem', color:'rgba(255,255,255,.1)', fontWeight:900 }}>PRO</span>
                        </div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'.78rem', color:'#fff', lineHeight:1.3, marginBottom:'.25rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.name}</p>
                        <p style={{ ...MONO, fontSize:'.6rem', color:MUTED }}>SKU: {item.sku}</p>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'.5rem' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:0, border:`1px solid ${BORDER}` }}>
                            <button onClick={() => changeQty(item.id, -1)} style={{ width:28, height:28, background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                            <span style={{ ...MONO, fontSize:'.75rem', color:'#fff', minWidth:24, textAlign:'center' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.id, +1)} style={{ width:28, height:28, background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            {itemTotal != null
                              ? <span style={{ ...DISP, fontWeight:700, fontSize:'1.1rem', color:'#fff' }}>R$ {itemTotal.toLocaleString('pt-BR', { minimumFractionDigits:0 })}</span>
                              : <span style={{ ...MONO, fontSize:'.7rem', color:MUTED }}>Consultar</span>
                            }
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'13px', alignSelf:'flex-start', padding:'2px', flexShrink:0, lineHeight:1 }}
                        onMouseOver={e => (e.currentTarget.style.color=RED)} onMouseOut={e => (e.currentTarget.style.color=MUTED)}>✕</button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* STEP 2 — Delivery form */}
          {cartStep === 'checkout' && (
            <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
              <p style={{ ...MONO, fontSize:'.6rem', color:MUTED, textTransform:'uppercase', letterSpacing:'.15em' }}>
                {cartCount} {cartCount === 1 ? 'item' : 'itens'} · {cartTotal > 0 ? 'R$ ' + cartTotal.toLocaleString('pt-BR', { minimumFractionDigits:0 }) : 'a consultar'}
              </p>
              {([
                { key:'cep',       label:'CEP',           placeholder:'00000-000', half:false },
                { key:'address',   label:'Endereço',      placeholder:'Rua, Avenida...', half:false },
                { key:'number',    label:'Número',        placeholder:'123', half:true },
                { key:'city',      label:'Cidade',        placeholder:'Sua cidade', half:true },
                { key:'state',     label:'Estado (UF)',   placeholder:'PR', half:true },
                { key:'reference', label:'Referência',    placeholder:'Perto de...', half:false },
              ] as { key: keyof typeof delivery; label: string; placeholder: string; half: boolean }[]).map((f, idx, arr) => {
                const prev = arr[idx - 1]
                const isSecondHalf = f.half && prev?.half
                if (isSecondHalf) return null
                const next = arr[idx + 1]
                const hasPair = f.half && next?.half
                return (
                  <div key={f.key} style={{ display: hasPair ? 'grid' : 'block', gridTemplateColumns: hasPair ? '1fr 1fr' : undefined, gap: hasPair ? '.75rem' : undefined }}>
                    {[f, ...(hasPair ? [next] : [])].map(field => (
                      <div key={field.key}>
                        <label style={{ ...MONO, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.15em', color:MUTED, display:'block', marginBottom:'.3rem' }}>{field.label}</label>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={delivery[field.key]}
                          onChange={e => field.key === 'cep'
                            ? handleCepChange(e.target.value)
                            : setDelivery(d => ({ ...d, [field.key]: e.target.value }))}
                          style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,.04)', border:`1px solid ${BORDER}`, padding:'.6rem .75rem', color:'#fff', ...MONO, fontSize:'.78rem', outline:'none', transition:'border-color .15s' }}
                          onFocus={e => (e.currentTarget.style.borderColor = RED)}
                          onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}

              {/* Shipping options — appear after CEP is complete */}
              {delivery.cep.replace(/\D/g,'').length === 8 && (
                <div>
                  <label style={{ ...MONO, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.15em', color:MUTED, display:'block', marginBottom:'.5rem' }}>
                    Opções de Frete
                  </label>
                  {shippingLoading ? (
                    <div style={{ ...MONO, fontSize:'.7rem', color:MUTED, padding:'.5rem 0' }}>Calculando frete...</div>
                  ) : shippingError ? (
                    <div style={{ ...MONO, fontSize:'.7rem', color:'#f87171', padding:'.5rem 0' }}>
                      Erro ao calcular frete. Verifique o CEP e tente novamente.
                    </div>
                  ) : (shippingOptions ?? []).length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                      {shippingOptions!.map(opt => {
                        const sel = selectedShipping?.id === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedShipping(sel ? null : opt)}
                            style={{
                              display:'flex', alignItems:'center', gap:'.75rem',
                              padding:'.65rem .85rem', border:`1px solid ${sel ? '#34D399' : BORDER}`,
                              background: sel ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,.02)',
                              cursor:'pointer', textAlign:'left', width:'100%', transition:'border-color .15s, background .15s',
                            }}
                          >
                            <div style={{ flex:1 }}>
                              <p style={{ ...MONO, fontSize:'.72rem', color:sel ? '#34D399' : '#fff', lineHeight:1.3 }}>{opt.name}</p>
                              <p style={{ ...MONO, fontSize:'.6rem', color:MUTED, marginTop:'2px' }}>
                                {opt.company?.name}{opt.delivery_time ? ` · ${opt.delivery_time} dias úteis` : ''}
                              </p>
                            </div>
                            <span style={{ ...MONO, fontWeight:700, fontSize:'.85rem', color: sel ? '#34D399' : '#fff', whiteSpace:'nowrap' }}>
                              R$ {parseFloat(opt.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${sel ? '#34D399' : MUTED}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {sel && <div style={{ width:7, height:7, borderRadius:'50%', background:'#34D399' }} />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ ...MONO, fontSize:'.7rem', color:MUTED, padding:'.5rem 0' }}>Nenhuma opção disponível para este CEP.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {cart.length > 0 && (
            <div style={{ borderTop:`1px solid ${BORDER}`, padding:'1.25rem 1.5rem', flexShrink:0, display:'flex', flexDirection:'column', gap:'.75rem', background:'#0d0d0f' }}>
              {cartStep === 'items' && (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.6rem', letterSpacing:'.2em', color:MUTED }}>Subtotal</span>
                    {cartSubtotal > 0
                      ? <span style={{ ...DISP, fontWeight:900, fontSize:'1.75rem', color:'#fff' }}>R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits:0 })}</span>
                      : <span style={{ ...MONO, fontSize:'.75rem', color:MUTED }}>A consultar</span>
                    }
                  </div>
                  <div className="btn-skew" style={{ background:RED, width:'100%' }}>
                    <button onClick={() => setCartStep('checkout')} className="btn-skew-text"
                      style={{ width:'100%', padding:'.85rem 1.5rem', ...DISP, fontWeight:900, textTransform:'uppercase', fontSize:'1.2rem', letterSpacing:'.1em', color:'#fff', border:'none', cursor:'pointer', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem' }}>
                      Finalizar Pedido <span className="arrow-slide">→</span>
                    </button>
                  </div>
                  <p style={{ ...MONO, fontSize:'.58rem', color:MUTED, textAlign:'center', lineHeight:1.5 }}>
                    Informe o CEP no próximo passo para calcular o frete.
                  </p>
                  <button onClick={() => setCart([])} style={{ background:'none', border:'none', ...MONO, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.15em', color:MUTED, cursor:'pointer', textAlign:'center' }}
                    onMouseOver={e => (e.currentTarget.style.color=RED)} onMouseOut={e => (e.currentTarget.style.color=MUTED)}>
                    Limpar carrinho
                  </button>
                </>
              )}
              {cartStep === 'checkout' && (
                <>
                  {/* Summary: subtotal + frete + total */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'.35rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.58rem', letterSpacing:'.15em', color:MUTED }}>Subtotal</span>
                      <span style={{ ...MONO, fontSize:'.8rem', color:'#fff' }}>
                        {cartSubtotal > 0 ? `R$ ${cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : 'A consultar'}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.58rem', letterSpacing:'.15em', color:MUTED }}>Frete</span>
                      <span style={{ ...MONO, fontSize:'.8rem', color: selectedShipping ? '#34D399' : MUTED }}>
                        {selectedShipping
                          ? `R$ ${parseFloat(selectedShipping.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '— a calcular'}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', borderTop:`1px solid ${BORDER}`, paddingTop:'.4rem', marginTop:'.1rem' }}>
                      <span style={{ ...MONO, textTransform:'uppercase', fontSize:'.6rem', letterSpacing:'.2em', color:MUTED }}>Total</span>
                      {cartTotal > 0
                        ? <span style={{ ...DISP, fontWeight:900, fontSize:'1.6rem', color:'#fff' }}>R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        : <span style={{ ...MONO, fontSize:'.75rem', color:MUTED }}>A consultar</span>
                      }
                    </div>
                  </div>
                  <div className="btn-skew" style={{ background:'#25D366', width:'100%' }}>
                    <button onClick={sendCartWA} className="btn-skew-text"
                      style={{ width:'100%', padding:'.85rem 1.5rem', ...DISP, fontWeight:900, textTransform:'uppercase', fontSize:'1.2rem', letterSpacing:'.1em', color:'#fff', border:'none', cursor:'pointer', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem' }}>
                      Enviar no WhatsApp <span className="arrow-slide">→</span>
                    </button>
                  </div>
                  <p style={{ ...MONO, fontSize:'.58rem', color:MUTED, textAlign:'center', lineHeight:1.6 }}>
                    A mensagem será aberta no WhatsApp com todos os dados. Clique em enviar.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background:'#000', padding:'4rem 2rem 2rem', borderTop:'1px solid #1f222a', marginTop:'auto' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3rem', marginBottom:'3rem' }}>
            <div>
              <img src="/tuner-logo.svg" alt="Promax Tuner" style={{ height:'36px', opacity:.92, display:'block', marginBottom:'1rem' }} />
              <p style={{ fontSize:'.75rem', color:'#71717a', lineHeight:1.8, maxWidth:'280px' }}>
                Desempenho real. Resultados reais.<br/>Excelência técnica em remapeamento e performance automotiva.
              </p>
              <p style={{ ...MONO, textTransform:'uppercase', fontSize:'.55rem', color:RED, letterSpacing:'.25em', marginBottom:'1.25rem', marginTop:'1.5rem' }}>Performance</p>
              {['Stage 1 & 2','Custom Tuning','Dyno Test','Track Day'].map(i => (
                <p key={i} style={{ fontSize:'.78rem', color:'#71717a', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.7rem' }}>{i}</p>
              ))}
            </div>
            <div>
              <p style={{ ...MONO, textTransform:'uppercase', fontSize:'.55rem', color:RED, letterSpacing:'.25em', marginBottom:'1.25rem' }}>Navegação</p>
              {[
                { label:'Serviços',      href:'/#serviços' },
                { label:'Veículos',      href:'/#veículos' },
                { label:'Como Funciona', href:'/#como-funciona' },
                { label:'Loja Virtual',  href:'/loja' },
                { label:'Contato',       href:'/#contato' },
              ].map(l => (
                <p key={l.label} style={{ fontSize:'.78rem', color:'#71717a', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.7rem' }}>
                  <a href={l.href} style={{ color:'inherit', textDecoration:'none' }}>{l.label}</a>
                </p>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid #1a1a1a', paddingTop:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ ...MONO, textTransform:'uppercase', fontSize:'.55rem', color:'#404040', letterSpacing:'.1em' }}>© 2026 PROMAX TUNER. TODOS OS DIREITOS RESERVADOS.</p>
            <p style={{ ...MONO, textTransform:'uppercase', fontSize:'.55rem', color:'#404040', letterSpacing:'.1em' }}>POWERED BY <strong style={{ color:'#606060' }}>PROMAX GROUP</strong></p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProductItemCard({ product, delay, onAddToCart, onBuyNow }: { product: ProductWithPrices; delay: number; onAddToCart: (p: ProductWithPrices) => void; onBuyNow: (p: ProductWithPrices) => void }) {
  const clientePrice = product.product_prices?.find(p => p.tier === 'cliente_final')?.price ?? null
  const price = clientePrice
    ? 'R$ ' + Number(clientePrice).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : 'Consultar'

  return (
    <article className="product-card" style={{ background:CARD, border:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', animationDelay:`${delay}ms` }}>
      <div className="card-img" style={{ height:'180px', background:'#000', position:'relative', overflow:'hidden' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.9 }}
          />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1a1a1d 0%,#0d0d0f 100%)' }}>
            <span style={{ ...DISP, fontWeight:900, fontSize:'3rem', color:'rgba(255,255,255,.06)', textTransform:'uppercase' }}>PRO</span>
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 50%,#1a1a1d 100%)', zIndex:2 }} />
        <div style={{ position:'absolute', top:'12px', left:'12px', zIndex:10 }}>
          <span style={{ ...MONO, color:'#fff', background:RED, padding:'1px 8px', textTransform:'uppercase', fontSize:'9px', letterSpacing:'.1em' }}>
            {product.category}
          </span>
        </div>
        {product.sku && (
          <div style={{ position:'absolute', top:'12px', right:'12px', zIndex:10 }}>
            <span style={{ ...MONO, color:MUTED, fontSize:'9px', letterSpacing:'.1em' }}>#{product.sku}</span>
          </div>
        )}
      </div>

      <div style={{ padding:'1rem 1.25rem', display:'flex', flexDirection:'column', flexGrow:1 }}>
        <h2 style={{ ...DISP, fontWeight:900, color:'#fff', textTransform:'uppercase', lineHeight:1.05, marginBottom:'.5rem', fontSize:'1.1rem', letterSpacing:'-.01em' }}>
          {product.name}
        </h2>
        {product.description && (
          <p style={{ fontSize:'.7rem', color:MUTED, marginBottom:'.5rem', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {product.description}
          </p>
        )}

        <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'.7rem', marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.5rem' }}>
          <span style={{ ...DISP, fontWeight:700, color: clientePrice ? '#fff' : MUTED, fontSize:'1.35rem' }}>{price}</span>
          {/* dual-button block — single skewed container */}
          <div style={{ display:'flex', alignItems:'stretch', transform:'skewX(-12deg)', flexShrink:0, overflow:'hidden', height:36 }}>
            {/* cart icon half — dark */}
            <button
              onClick={() => onAddToCart(product)}
              title="Adicionar ao carrinho"
              style={{ background:'linear-gradient(160deg,#2a2a30 0%,#16161a 100%)', border:`1px solid ${BORDER}`, borderRight:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 .65rem', transition:'filter .2s' }}
              onMouseOver={e => (e.currentTarget.style.filter='brightness(1.25)')}
              onMouseOut={e => (e.currentTarget.style.filter='brightness(1)')}
            >
              <span style={{ transform:'skewX(12deg)', display:'flex', alignItems:'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                  <path d="M12.5 17h-6.5v-14h-2" />
                  <path d="M6 5l14 1l-.86 6.017m-2.64 .983h-10.5" />
                  <path d="M16 19h6" />
                  <path d="M19 16v6" />
                </svg>
              </span>
            </button>

            {/* divider — vertical line, centered, follows skew naturally */}
            <div style={{ width:'1.5px', background:'rgba(255,255,255,.22)', alignSelf:'center', height:'55%', flexShrink:0 }} />

            {/* COMPRAR half — red */}
            <button
              onClick={() => onBuyNow(product)}
              style={{ background:'linear-gradient(160deg,#f03535 0%,#b81e1e 100%)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 .85rem', position:'relative', overflow:'hidden', transition:'filter .2s' }}
              onMouseOver={e => (e.currentTarget.style.filter='brightness(1.18)')}
              onMouseOut={e => (e.currentTarget.style.filter='brightness(1)')}
            >
              <span style={{ transform:'skewX(12deg)', display:'flex', alignItems:'center', gap:'4px', ...DISP, fontWeight:700, textTransform:'uppercase', fontSize:'.88rem', letterSpacing:'.07em', color:'#fff', whiteSpace:'nowrap' }}>
                COMPRAR <span className="arrow-slide">→</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom:`1px solid ${BORDER}`, padding:'1rem 1.25rem' }}>
      <p style={{ fontFamily:'"JetBrains Mono",monospace', color:MUTED, textTransform:'uppercase', fontSize:'.58rem', letterSpacing:'.28em', marginBottom:'.75rem' }}>{label}</p>
      {children}
    </div>
  )
}

function ProductCard({ row, delay }: { row: EcuCatalogRow; delay: number }) {
  const { num: gainNum, unit: gainUnit } = parseGain(row.ganho)
  const title    = [row.marca, row.secao_original].filter(Boolean).join(' · ') || '—'
  const subtitle = row.modelo_descricao || ''
  const badge    = row.ganho ? gainNum + gainUnit.toUpperCase() : 'REMAP'
  const price    = formatPrice(row.preco_cliente_final)

  const imgSrc = row.foto_url ?? lookupCarImage(row)
  const imgStyle: React.CSSProperties = imgSrc
    ? {}
    : { background:'linear-gradient(135deg,#1a1a1d 0%,#0d0d0f 100%)' }

  return (
    <article className="product-card" style={{ background:CARD, border:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', animationDelay:`${delay}ms` }}>
      <div className="card-img" style={{ height:'160px', background:'#000', position:'relative', overflow:'hidden', ...imgStyle }}>
        {imgSrc && (
          <img src={imgSrc} alt={title} referrerPolicy="no-referrer" style={{ width:'100%', height:'100%', objectFit:'cover', mixBlendMode:'lighten', opacity:.82 }} />
        )}
        {!imgSrc && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:900, fontSize:'3rem', color:'rgba(255,255,255,.06)', textTransform:'uppercase', letterSpacing:'-.02em' }}>ECU</span>
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 35%,#1a1a1d 100%)', zIndex:2 }} />
        <div style={{ position:'absolute', top:'12px', left:'12px', zIndex:10 }}>
          <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:700, color:'#fff', background:RED, padding:'1px 8px', textTransform:'uppercase', fontSize:'11px', letterSpacing:'.1em' }}>{badge}</span>
        </div>
      </div>

      <div style={{ padding:'1rem 1.25rem', display:'flex', flexDirection:'column', flexGrow:1 }}>
        <span style={{ fontFamily:'"JetBrains Mono",monospace', color:RED, textTransform:'uppercase', fontSize:'9px', letterSpacing:'.2em', marginBottom:'.2rem' }}>
          {row.categoria || 'ECU'}
        </span>
        <h2 style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:900, color:'#fff', textTransform:'uppercase', lineHeight:1.05, marginBottom:'.2rem', fontSize:'1.35rem', letterSpacing:'-.01em' }}>
          {title}
        </h2>
        {subtitle && (
          <span style={{ fontSize:'.7rem', color:MUTED, marginBottom:'.5rem', lineHeight:1.3 }}>{subtitle}{row.ano ? ` · ${row.ano}` : ''}</span>
        )}

        {row.ganho && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:'.4rem', margin:'.15rem 0 .5rem' }}>
            <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:900, color:RED, lineHeight:.85, fontSize:'2.2rem' }}>{gainNum}</span>
            <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:700, color:RED, marginBottom:'2px', fontSize:'1rem' }}>{gainUnit}</span>
            <span style={{ fontSize:'.62rem', color:MUTED, marginBottom:'2px', paddingLeft:'.4rem', borderLeft:`1px solid ${BORDER}` }}>ganho</span>
          </div>
        )}

        <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:'.7rem', marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.5rem' }}>
          <div>
            <span style={{ fontFamily:'"JetBrains Mono",monospace', color:MUTED, textTransform:'uppercase', display:'block', fontSize:'9px', letterSpacing:'.15em' }}>Remapeamento ECU</span>
            <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:700, color: price === 'Consultar' ? MUTED : '#fff', fontSize:'1.2rem' }}>{price}</span>
          </div>
          <div className="btn-skew" style={{ background:RED, flexShrink:0 }}>
            <a href={waLink(row)} target="_blank" rel="noopener noreferrer" className="btn-skew-text" style={{ padding:'.45rem .85rem', fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic', fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap', fontSize:'.85rem', letterSpacing:'.07em', color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
              Solicitar <span className="arrow-slide">→</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
