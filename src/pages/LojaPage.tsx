import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CatalogoCliente } from '@/components/catalogo/CatalogoCliente'

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
.loja-pg .proto-tag{font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;padding:.3rem .55rem;border:1px solid ${BORDER};background:transparent;color:${MUTED};cursor:pointer;transition:border-color .15s,color .15s,background .15s;border-radius:0}
.loja-pg .proto-tag:hover{border-color:${MUTED};color:#fff}
.loja-pg .proto-tag.active{border-color:${RED};background:rgba(231,43,43,.1);color:#fff}
@keyframes sw-l{0%,100%{transform:translateX(-5px);opacity:.2}50%{transform:translateX(0);opacity:1}}
@keyframes sw-r{0%,100%{transform:translateX(5px);opacity:.2}50%{transform:translateX(0);opacity:1}}
.sw-l{animation:sw-l 1.3s cubic-bezier(.45,0,.55,1) infinite}
.sw-r{animation:sw-r 1.3s cubic-bezier(.45,0,.55,1) infinite}
@keyframes fadeUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
.loja-pg .product-card{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
`


const CATEGORIES = [
  { key:'carros',  label:'CARROS',   slug:'carros-e-suvs' },
  { key:'pickups', label:'PICKUPS',  slug:'pickups'       },
  { key:'trucks',  label:'TRUCKS',   slug:'trucks'        },
  { key:'agricola',label:'AGRÍCOLA', slug:'agricola'      },
  { key:'maquinas',label:'MÁQUINAS', slug:'maquinas'      },
  { key:'motos',   label:'MOTOS',    slug:'motos'         },
]
const WA_NUM  = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g,'')

const MONO: React.CSSProperties = { fontFamily:'"JetBrains Mono",monospace' }
const DISP: React.CSSProperties = { fontFamily:'"Barlow Condensed",sans-serif', fontStyle:'italic' }

export default function LojaPage() {
  const [section, setSection]   = useState<'remap'|'acessorios'>('remap')
  const [category, setCategory] = useState('carros')

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'loja-pg-css'
    el.textContent = LOJA_CSS
    document.head.appendChild(el)
    return () => document.getElementById('loja-pg-css')?.remove()
  }, [])


  return (
    <div className="loja-pg" style={{ background: DARK, color:'#fff', minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'"DM Sans",sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,9,0.97)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ padding:'0 3rem', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ lineHeight:0 }}>
            <img src="/tuner-logo.svg" alt="Promax Tuner" style={{ height:'24px', width:'auto' }} />
          </Link>

          <nav style={{ display:'flex', alignItems:'center', gap:'2.25rem', fontWeight:700, fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase' }}>
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

          <div className="btn-skew" style={{ background: RED }}>
            <a href="/#veículos" className="btn-skew-text" style={{ padding:'0 1.4rem', height:'40px', ...DISP, fontWeight:700, textTransform:'uppercase', fontSize:'1.1rem', letterSpacing:'0.1em', color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
              Analisar Veículo <span className="arrow-slide" style={{ marginLeft:'4px' }}>→</span>
            </a>
          </div>
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
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2rem', padding:'2.5rem 3rem', minHeight:'220px' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.75rem' }}>
              <span style={{ width:'28px', height:'2px', background:RED, display:'inline-block' }} />
              <span style={{ ...MONO, fontSize:'.58rem', letterSpacing:'.32em', textTransform:'uppercase', color:RED }}>Loja Oficial · Performance ECU</span>
            </div>
            <h1 style={{ ...DISP, fontWeight:900, textTransform:'uppercase', lineHeight:.88, color:'#fff', margin:'0 0 1rem', fontSize:'clamp(2.6rem,6vw,5.2rem)', letterSpacing:'-.02em' }}>
              MÁXIMA<br/>
              <span style={{ color:RED }}>PERFORMANCE</span><br/>
              <span style={{ color:MUTED, fontSize:'.65em' }}>PARA SEU VEÍCULO</span>
            </h1>
            <p style={{ color:MUTED, fontSize:'.85rem', maxWidth:'420px', lineHeight:1.65, margin:'0 0 1.75rem' }}>
              Módulos Stage 1, 2 e 3 calibrados por especialistas. Mais potência, mais torque — garantia técnica de fábrica.
            </p>
            <div style={{ display:'flex', alignItems:'stretch', gap:0, flexWrap:'wrap' }}>
              {[
                { val:'+140cv',   label:'Ganho Máximo',       red:false },
                { val:'6 Marcas', label:'No Catálogo',        red:false },
                { val:'100%',     label:'Licença Definitiva', red:true  },
              ].map((s,i) => (
                <div key={s.label} style={{ padding:'.6rem 1.4rem .6rem 0', borderRight:i<2?`1px solid ${BORDER}`:'none', marginRight:i<2?'1.4rem':0 }}>
                  <span style={{ ...DISP, fontWeight:900, fontSize:'2rem', color:s.red?RED:'#fff', lineHeight:1, display:'block' }}>{s.val}</span>
                  <span style={{ ...MONO, fontSize:'.55rem', letterSpacing:'.18em', textTransform:'uppercase', color:MUTED, display:'block', marginTop:'2px' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1rem', minWidth:'240px' }}>
            <div style={{ background:'rgba(231,43,43,.1)', border:'1px solid rgba(231,43,43,.3)', padding:'1.25rem 1.75rem', textAlign:'center', position:'relative' }}>
              <div style={{ position:'absolute', top:'-1px', left:'-1px', width:'16px', height:'16px', borderTop:`2px solid ${RED}`, borderLeft:`2px solid ${RED}` }} />
              <div style={{ position:'absolute', bottom:'-1px', right:'-1px', width:'16px', height:'16px', borderBottom:`2px solid ${RED}`, borderRight:`2px solid ${RED}` }} />
              <span style={{ ...MONO, fontSize:'.55rem', letterSpacing:'.28em', textTransform:'uppercase', color:RED, display:'block', marginBottom:'.4rem' }}>Destaque do Mês</span>
              <span style={{ ...DISP, fontWeight:900, fontSize:'1.5rem', color:'#fff', textTransform:'uppercase', display:'block', lineHeight:1.1 }}>Audi RS3 8V</span>
              <span style={{ ...MONO, fontSize:'.6rem', color:MUTED, display:'block', marginTop:'.3rem' }}>STAGE 3 · +140cv · +25kgf.m</span>
              <div style={{ marginTop:'.9rem', paddingTop:'.75rem', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                <span style={{ ...DISP, fontWeight:700, fontSize:'1.75rem', color:'#fff' }}>R$ 8.900</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
              <span style={{ width:'6px', height:'6px', background:RED, transform:'rotate(45deg)', flexShrink:0, display:'inline-block' }} />
              <span style={{ ...MONO, fontSize:'.58rem', letterSpacing:'.14em', textTransform:'uppercase', color:MUTED }}>Licença definitiva · sem assinatura</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION SWITCHER ── */}
      <div style={{ display:'flex', background:'#0a0a0b', borderBottom:`2px solid ${BORDER}` }}>
        {(['remap','acessorios'] as const).map(s => {
          const active = section === s
          return (
            <button key={s} onClick={() => setSection(s)} style={{
              flex:1, height:'64px', ...DISP, fontWeight:900, textTransform:'uppercase',
              fontSize:'1.55rem', letterSpacing:'.1em',
              background: active ? RED : '#0a0a0b', color: active ? '#fff' : '#4a4c4f',
              border:'none', cursor:'pointer', borderRight: s==='remap' ? `2px solid #1a0808` : 'none',
              transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:'.75rem',
            }}>
              <span style={{ ...MONO, fontSize:'1.8rem', display:'inline-block', opacity: active ? 1 : 0.15 }} className={active ? 'sw-l' : ''}>→</span>
              {s === 'remap' ? 'REMAP' : 'ACESSÓRIOS'}
              <span style={{ ...MONO, fontSize:'1.8rem', display:'inline-block', opacity: active ? 1 : 0.15 }} className={active ? 'sw-r' : ''}>←</span>
            </button>
          )
        })}
      </div>

      {/* ── REMAP SECTION ── */}
      {section === 'remap' && (
        <>
          {/* Category tabs */}
          <div style={{ borderBottom:`1px solid ${BORDER}`, background:'#0d0d0f' }}>
            <div style={{ padding:'.75rem 2rem', display:'flex', gap:'.5rem', overflowX:'auto' }}>
              {CATEGORIES.map(c => {
                const active = category === c.key
                return (
                  <button key={c.key} onClick={() => setCategory(c.key)} style={{
                    ...DISP, fontWeight:700, textTransform:'uppercase', fontSize:'.9rem', letterSpacing:'.08em',
                    padding:'.6rem 1.75rem', whiteSpace:'nowrap', cursor:'pointer',
                    background: active ? RED : 'transparent', color: active ? '#fff' : MUTED,
                    border: active ? 'none' : `1px solid ${BORDER}`,
                    transition:'all .15s',
                  }}>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ maxWidth:'1920px', margin:'0 auto', width:'100%', padding:'2rem' }}>
            <CatalogoCliente categorySlug={CATEGORIES.find(c => c.key === category)?.slug ?? 'carros-e-suvs'} />
          </div>
        </>
      )}

      {/* ── ACESSÓRIOS ── */}
      {section === 'acessorios' && (
        <div style={{ display:'flex', flex:1, maxWidth:'1920px', margin:'0 auto', width:'100%' }}>
          <aside style={{ width:'260px', flexShrink:0, borderRight:`1px solid ${BORDER}`, background:DARK, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <span style={{ ...DISP, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'.15em', fontSize:'1rem', borderBottom:`1px solid ${BORDER}`, paddingBottom:'1rem', display:'block' }}>Categoria</span>
            {['Filtros de Ar','Turbinas','Intercoolers','Downpipes','Escapamentos'].map((item,i) => (
              <label key={item} style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                <div style={{ width:'14px', height:'14px', border:`1px solid ${i===0 ? RED : BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {i===0 && <div style={{ width:'6px', height:'6px', background:RED }} />}
                </div>
                <span style={{ color: i===0 ? '#fff' : MUTED, textTransform:'uppercase', fontSize:'10px' }}>{item}</span>
              </label>
            ))}
          </aside>
          <div style={{ flexGrow:1, padding:'2rem' }}>
            <div style={{ borderBottom:`1px solid ${BORDER}`, paddingBottom:'1rem', marginBottom:'1.5rem' }}>
              <span style={{ color:MUTED, textTransform:'uppercase', fontSize:'10px', letterSpacing:'.15em' }}>
                Exibindo <strong style={{ color:'#fff' }}>0</strong> Acessórios Disponíveis
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6rem', border:`1px solid ${BORDER}`, background:CARD, color:MUTED, textAlign:'center' }}>
              <div style={{ ...DISP, fontWeight:700, fontSize:'1.1rem', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:'.5rem' }}>Em breve</div>
              <div style={{ fontSize:'.75rem' }}>Catálogo de acessórios sendo preparado</div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background:'#000', padding:'4rem 3rem 2rem', borderTop:'1px solid #1f222a', marginTop:'auto' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:'3rem', marginBottom:'3rem' }}>
            <div>
              <img src="/tuner-logo.svg" alt="Promax Tuner" style={{ height:'36px', opacity:.92, display:'block', marginBottom:'1rem' }} />
              <p style={{ fontSize:'.75rem', color:'#71717a', lineHeight:1.8, maxWidth:'280px' }}>
                Desempenho real. Resultados reais.<br/>Excelência técnica em remapeamento e performance automotiva.
              </p>
            </div>
            <div>
              <p style={{ ...MONO, textTransform:'uppercase', fontSize:'.55rem', color:RED, letterSpacing:'.25em', marginBottom:'1.25rem' }}>Performance</p>
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
