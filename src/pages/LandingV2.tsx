import { useEffect, useRef, useState } from 'react'

// ── Responsive breakpoint hook ────────────────────────────────────────────────
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
import logoUrl from '@/assets/tuner-logo.svg'
import vehicleCarros  from '@/assets/vehicle-carros.jpg'
import vehiclePickups from '@/assets/vehicle-pickups.jpg'
import vehicleTrucks  from '@/assets/vehicle-trucks.jpg'
import vehicleMotos   from '@/assets/vehicle-motos.jpg'
import vehicleAgricola from '@/assets/vehicle-agricola.jpg'
import catCarros   from '@/assets/cat-carros.jpg'
import catPickups  from '@/assets/cat-pickups.jpg'
import catTrucks   from '@/assets/cat-trucks.jpg'
import catAgricola from '@/assets/cat-agricola.jpg'
import catMaquinas from '@/assets/cat-maquinas.jpg'
import catMotos    from '@/assets/cat-motos.jpg'
import { useTunerSplash } from '@/components/branding/TunerSplashProvider'
import { useNavigate } from 'react-router-dom'
import {
  Fuel,
  LayoutGrid, ShieldCheck, Settings2, Headphones,
  Wrench, Cpu, FlameKindling, ShoppingBag, ArrowRight,
  Star, Phone, Mail, MapPin, Zap, ChevronRight, ChevronLeft,
  Menu, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── WhatsApp CTA ──────────────────────────────────────────────────────────────
const WA_NUMBER = '5545999985254'
const WA_MSG    = 'Olá! Estava no site da Promax Tuner e gostaria de saber mais sobre reprogramação eletrônica.'
function openWA() {
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`, '_blank')
}

// ── Design tokens (same as existing) ──────────────────────────────────────────
const RED    = 'hsl(var(--pm-red-500))'
const DARK   = 'hsl(var(--pm-gray-950))'
const CARD   = 'hsl(var(--pm-gray-900))'
const BORDER = 'hsl(var(--pm-gray-700))'

// ── Shared primitives ──────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{ width: '24px', height: '2px', background: RED }} />
      <span style={{
        color: RED, fontSize: '0.6rem', fontWeight: 700,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        fontFamily: 'var(--pm-font-mono)',
      }}>
        {children}
      </span>
    </div>
  )
}

function Display({ children, size = '4rem', center = false }: {
  children: React.ReactNode
  size?: string
  center?: boolean
}) {
  return (
    <h2 style={{
      fontFamily: 'var(--pm-font-display)',
      fontWeight: 500, fontStyle: 'normal',
      fontSize: size, lineHeight: 1.0,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      color: 'hsl(var(--pm-gray-50))',
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </h2>
  )
}

function Accent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: RED }}>{children}</span>
}

// ── Vehicle data ──────────────────────────────────────────────────────────────
type VehicleV2 = {
  slug: string
  label: string
  modelName: string
  fuel: string
  image: string | null
  gaugeValue: number
  gaugeDisplayNum: number
  estimatedImprovement: string
  powerGain: string
  powerNum: number
  powerUnit: string
  torqueGain: string
  torqueNum: number
  torqueUnit: string
  base: string
  titleLine1: string
  titleLine2: string
  supportText: string
  audienceInsight: string
  commercialCall: string
}

const V2_VEHICLES: VehicleV2[] = [
  {
    slug: 'carros', label: 'CARROS', modelName: 'BMW 320i',
    fuel: 'GASOLINA', image: vehicleCarros,
    gaugeValue: 78, gaugeDisplayNum: 55,
    estimatedImprovement: '~45% a 55%',
    powerGain: '+80 a +125 cv', powerNum: 125, powerUnit: 'cv',
    torqueGain: '+10 a +14 kgf.m', torqueNum: 14, torqueUnit: 'kgf.m',
    base: '184 cv / ~30,6 kgf.m',
    titleLine1: 'MAIS RESPOSTA.', titleLine2: 'MAIS 320i.',
    supportText: 'Mais resposta, torque e dirigibilidade para transformar a experiência ao volante.',
    audienceInsight: '',
    commercialCall: '+50% Performance',
  },
  {
    slug: 'pickups', label: 'PICKUPS', modelName: 'VW Amarok V6',
    fuel: 'DIESEL', image: vehiclePickups,
    gaugeValue: 72, gaugeDisplayNum: 30,
    estimatedImprovement: '~25% a 30%',
    powerGain: '+80 a +90 cv', powerNum: 90, powerUnit: 'cv',
    torqueGain: '+10 kgf.m', torqueNum: 10, torqueUnit: 'kgf.m',
    base: '258 cv / 58 kgf.m',
    titleLine1: 'FORÇA QUE', titleLine2: 'SE IMPÕE.',
    supportText: 'Força extra para carga, estrada e terreno pesado com resposta mais presente.',
    audienceInsight: '',
    commercialCall: '+30% Performance',
  },
  {
    slug: 'trucks', label: 'TRUCKS', modelName: 'Volvo FH',
    fuel: 'DIESEL', image: vehicleTrucks,
    gaugeValue: 65, gaugeDisplayNum: 20,
    estimatedImprovement: '~18% a 20%',
    powerGain: '+50 a +90 cv', powerNum: 90, powerUnit: 'cv',
    torqueGain: '+15% a +20%', torqueNum: 20, torqueUnit: '%',
    base: '460–540 cv / ~230 kgf.m',
    titleLine1: 'PUXE MAIS.', titleLine2: 'RENDA MAIS.',
    supportText: 'Mais força útil para carga, subida e operação com ritmo constante.',
    audienceInsight: '',
    commercialCall: '+20% Performance',
  },
  {
    slug: 'agricola', label: 'AGRÍCOLA', modelName: 'Tratores & Agrícola',
    fuel: 'DIESEL AG.', image: vehicleAgricola,
    gaugeValue: 68, gaugeDisplayNum: 25,
    estimatedImprovement: '~20% a 25%',
    powerGain: '+30 a +50 cv', powerNum: 50, powerUnit: 'cv',
    torqueGain: '+15% a +20%', torqueNum: 20, torqueUnit: '%',
    base: '100–200 cv (tratores médios)',
    titleLine1: 'MAIS CAMPO.', titleLine2: 'MAIS RENDIMENTO.',
    supportText: 'Mais rendimento no campo, com força extra para operações pesadas.',
    audienceInsight: '',
    commercialCall: '+25% Performance',
  },
  {
    slug: 'motos', label: 'MOTOS', modelName: 'BMW S 1000 RR',
    fuel: 'GASOLINA', image: vehicleMotos,
    gaugeValue: 58, gaugeDisplayNum: 15,
    estimatedImprovement: '~10% a 15%',
    powerGain: '+10 a +20 cv', powerNum: 20, powerUnit: 'cv',
    torqueGain: '+8% a +15%', torqueNum: 15, torqueUnit: '%',
    base: '~210 cv / 11,3 kgf.m',
    titleLine1: 'RESPOSTA', titleLine2: 'SEM HESITAR.',
    supportText: 'Resposta mais rápida e entrega mais afiada para pilotagem esportiva.',
    audienceInsight: '',
    commercialCall: '+15% Performance',
  },
]

// ── Performance gauge SVG (hero decoration) ───────────────────────────────────
const TICKS = 36

function PerfGauge({ value = 78, label = '+50%', slide = 0 }: {
  value?: number; label?: string; slide?: number
}) {
  const r    = 120
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const dash = arc * (value / 100)

  // scanner head travels tick 0→35 continuously
  const [tickHead, setTickHead] = useState(0)
  // 'filling' → initial arc load; 'live' → microanimations active
  const [phase, setPhase] = useState<'filling' | 'live'>('filling')

  useEffect(() => {
    const id = setInterval(() => setTickHead(h => (h + 1) % TICKS), 75)
    return () => clearInterval(id)
  }, [])

  // on slide change, reset to 'filling'; switch to 'live' after ~2s
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('filling')
    const id = setTimeout(() => setPhase('live'), 2000)
    return () => clearTimeout(id)
  }, [slide])

  const tickOp = (i: number) => {
    const base = i % 3 === 0 ? 0.28 : 0.1
    if (phase === 'filling') return base
    const dist = Math.abs(i - tickHead)
    if (dist === 0) return 0.95
    if (dist === 1) return 0.68
    if (dist === 2) return 0.38
    return base
  }

  // inner ring rotating highlight
  const ringR = 80
  const ringC = 2 * Math.PI * ringR
  const ringArc = ringC * 0.09

  return (
    <svg viewBox="0 0 320 320" width="320" height="320" style={{ overflow: 'visible' }}>
      {/* outer decorative ring */}
      <circle cx="160" cy="160" r="155" fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

      {/* tick marks — scanner effect */}
      {Array.from({ length: TICKS }).map((_, i) => {
        const ang   = (-225 + i * (270 / (TICKS - 1))) * (Math.PI / 180)
        const inner = i % 3 === 0 ? 130 : 135
        return (
          <line key={i}
            x1={160 + inner * Math.cos(ang)} y1={160 + inner * Math.sin(ang)}
            x2={160 + 145 * Math.cos(ang)}   y2={160 + 145 * Math.sin(ang)}
            stroke="white"
            strokeOpacity={tickOp(i)}
            strokeWidth={i % 3 === 0 ? 1.5 : 0.75}
            style={{ transition: 'stroke-opacity 0.12s ease' }}
          />
        )
      })}

      {/* track */}
      <circle cx="160" cy="160" r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={circ * 0.125}
        style={{ transform: 'rotate(-225deg)', transformOrigin: '160px 160px' }}
      />

      {/* glow layer — blurred duplicate, breathes in 'live' phase */}
      <circle cx="160" cy="160" r={r} fill="none"
        stroke={RED} strokeWidth="22"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.125}
        style={{
          transform: 'rotate(-225deg)', transformOrigin: '160px 160px',
          filter: 'blur(9px)',
          opacity: phase === 'live' ? undefined : 0,
          animation: phase === 'live' ? 'gauge-glow-breath 2.8s ease-in-out infinite' : 'none',
        }}
      />

      {/* progress arc */}
      <circle cx="160" cy="160" r={r} fill="none"
        stroke={RED} strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.125}
        style={{
          transform: 'rotate(-225deg)', transformOrigin: '160px 160px',
          filter: `drop-shadow(0 0 10px ${RED})`,
        }}
      />

      {/* center fill */}
      <circle cx="160" cy="160" r="80" fill="rgba(0,0,0,0.6)"
        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {/* inner ring rotating highlight */}
      <circle cx="160" cy="160" r={ringR} fill="none"
        stroke="rgba(255,255,255,0.16)" strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={`${ringArc} ${ringC - ringArc}`}
        style={{
          transformOrigin: '160px 160px',
          animation: 'gauge-ring-spin 5s linear infinite',
        }}
      />

      <text x="160" y="153" textAnchor="middle" dominantBaseline="central"
        fill={RED} fontSize="49" fontWeight="900"
        fontFamily="var(--pm-font-display)" fontStyle="italic">
        {label}
      </text>
      <text x="160" y="188" textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.4)" fontSize="9" letterSpacing="4"
        fontFamily="var(--pm-font-mono)">
        PERFORMANCE
      </text>
      <text x="50"  y="268" fill="rgba(255,255,255,0.35)" fontSize="8"
        fontFamily="var(--pm-font-mono)" letterSpacing="1">0%</text>
      <text x="256" y="268" fill="rgba(255,255,255,0.35)" fontSize="8"
        fontFamily="var(--pm-font-mono)" letterSpacing="1">MAX</text>
    </svg>
  )
}

// ── Count-up animation hook ───────────────────────────────────────────────────
function useCountUp(target: number, slide: number, delay = 500, duration = 1100) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVal(0)
    let raf: number = 0
    const id = setTimeout(() => {
      let start: number | null = null
      const tick = (ts: number) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        setVal(Math.round((1 - (1 - p) ** 3) * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(id); cancelAnimationFrame(raf) }
  }, [target, slide, delay, duration])
  return val
}

// ── NAVBAR V2 ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Navbar({ onLogin: _onLogin, scrolled }: { onLogin: () => void; scrolled: boolean }) {
  const isMobile = useBreakpoint(768)
  const [menuOpen, setMenuOpen] = useState(false)
  const allLinks = ['Serviços', 'Veículos', 'Como Funciona', 'Resultados', 'Sobre', 'Loja']

  const linkStyle: React.CSSProperties = {
    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none', transition: 'color 0.2s',
  }

  const mobileLinkStyle: React.CSSProperties = {
    fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none', padding: '0.75rem 0',
    borderBottom: `1px solid ${BORDER}`, display: 'block',
  }

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: (scrolled || menuOpen) ? 'rgba(8,8,9,0.97)' : 'transparent',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: (scrolled || menuOpen) ? `1px solid ${BORDER}` : '1px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 1.25rem' : '0 3rem', height: '64px',
        transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.5)' : 'none',
      }}>
        <style>{`
          @keyframes nav-cta-drift {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(5px); }
          }
        `}</style>

        <img src={logoUrl} alt="Promax Tuner"
          style={{ height: '22px', width: 'auto', display: 'block' }} />

        {/* Desktop nav */}
        {!isMobile && (
          <>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2.25rem' }}>
              {['Serviços', 'Veículos', 'Como Funciona', 'Resultados', 'Sobre'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                >{l}</a>
              ))}
              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.16)', flexShrink: 0 }} />
              <a href="/loja" style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >Loja</a>
            </nav>
            <div style={{ transform: 'skewX(-12deg)', display: 'inline-flex' }}>
              <button onClick={openWA} style={{
                background: RED, border: 'none', cursor: 'pointer',
                animation: 'nav-cta-drift 3.2s ease-in-out infinite',
                transition: 'filter 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.animationPlayState = 'paused'; e.currentTarget.style.filter = 'brightness(1.22)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.animationPlayState = 'running' }}
              >
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transform: 'skewX(12deg)', padding: '0 1.35rem', height: '38px',
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#fff', fontFamily: 'var(--pm-font-body)',
                }}>
                  Analisar Veículo <ChevronRight size={11} />
                </span>
              </button>
            </div>
          </>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#fff', padding: '0.5rem', minWidth: '44px', minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </header>

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0,
          background: 'rgba(8,8,9,0.98)', zIndex: 49,
          padding: '2rem 1.5rem', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {allLinks.map(l => (
            <a key={l}
              href={l === 'Loja' ? '/loja' : `#${l.toLowerCase().replace(' ', '-')}`}
              style={mobileLinkStyle}
              onClick={() => setMenuOpen(false)}
            >{l}</a>
          ))}
          <button onClick={() => { openWA(); setMenuOpen(false) }} style={{
            marginTop: '2rem', background: RED, border: 'none', cursor: 'pointer',
            padding: '1rem', color: '#fff', fontSize: '0.85rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '6px',
            minHeight: '52px',
          }}>
            Analisar Veículo →
          </button>
        </div>
      )}
    </>
  )
}

// ── HERO V2 — split screen ────────────────────────────────────────────────────
function HeroSection({ onLogin }: { onLogin: () => void }) {
  const isMobile = useBreakpoint(768)
  const isTablet = useBreakpoint(1024)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [gaugeVal, setGaugeVal] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const vehicle = V2_VEHICLES[currentSlide]

  const goToSlide = (i: number) => {
    setCurrentSlide(i)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrentSlide(s => (s + 1) % V2_VEHICLES.length)
    }, 6000)
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide(s => (s + 1) % V2_VEHICLES.length)
    }, 6000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGaugeVal(0)
    const target = vehicle.gaugeValue
    let gaugeInterval: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => {
      let v = 0
      gaugeInterval = setInterval(() => {
        v = Math.min(v + 2, target)
        setGaugeVal(v)
        if (v >= target) clearInterval(gaugeInterval)
      }, 20)
    }, 350)
    return () => { clearTimeout(t); clearInterval(gaugeInterval) }
  }, [currentSlide, vehicle.gaugeValue])

  const powerVal = useCountUp(vehicle.powerNum, currentSlide, 500, 1200)
  const torqueVal = useCountUp(vehicle.torqueNum, currentSlide, 600, 1200)
  const gaugeDisplayVal = vehicle.gaugeValue > 0
    ? Math.round((gaugeVal / vehicle.gaugeValue) * vehicle.gaugeDisplayNum)
    : 0

  return (
    <section id="serviços" style={{
      minHeight: isMobile ? 'auto' : '100vh',
      paddingBottom: isMobile ? '3rem' : 0,
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1fr',
      position: 'relative', overflow: 'hidden',
      maxWidth: '100vw',
    }}>
      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />

      {/* Vehicle images — full hero background, crossfade per slide */}
      {V2_VEHICLES.map((v, i) => (
        v.image ? (
          <div key={v.slug} style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 0.9s ease',
            pointerEvents: 'none',
          }}>
            <img
              src={v.image} alt={v.modelName}
              loading={i === 0 ? 'eager' : 'lazy'}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center center',
              }}
            />
            {/* overlay: protege leitura à esquerda, revela veículo à direita */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(8,8,9,0.88) 0%, rgba(8,8,9,0.55) 40%, rgba(8,8,9,0.15) 70%, transparent 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 65% 55%, rgba(177,40,37,0.05) 0%, transparent 55%)',
            }} />
          </div>
        ) : (
          <div key={v.slug} style={{
            position: 'absolute', inset: 0, zIndex: 1,
            opacity: i === currentSlide ? 1 : 0,
            transition: 'opacity 0.9s ease',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 65% 50%, rgba(40,20,0,0.22) 0%, transparent 65%)',
          }} />
        )
      ))}

      {/* Left: content */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: isMobile ? '96px 1.5rem 3rem' : isTablet ? '100px 3rem 4rem' : '120px 3.5rem 4rem 6rem',
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(to right, rgba(8,8,9,0.98) 0%, rgba(8,8,9,0.65) 100%)',
      }}>
        {/* Category tabs — hidden on mobile, interactive on desktop */}
        <div style={{ display: isMobile ? 'none' : 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {V2_VEHICLES.map((v, i) => (
            <button key={v.slug} onClick={() => goToSlide(i)} style={{
              fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em',
              padding: '8px 12px', minHeight: '32px',
              border: `1px solid ${i === currentSlide ? RED : BORDER}`,
              borderRadius: '999px', cursor: 'pointer',
              background: i === currentSlide ? 'rgba(193,13,25,0.1)' : 'none',
              color: i === currentSlide ? RED : 'hsl(var(--pm-gray-400))',
              fontFamily: 'var(--pm-font-mono)',
              transition: 'all 0.2s ease',
            }}>{v.label}</button>
          ))}
        </div>

        {/* Dynamic headline — keyed so animation re-triggers on slide change */}
        <div key={`title-${currentSlide}`} style={{ marginBottom: '1.25rem' }}>
          <div style={{ overflow: 'hidden', marginBottom: '0.08rem' }}>
            <h1 style={{
              fontFamily: 'var(--pm-font-display)',
              fontWeight: 900, fontStyle: 'italic',
              fontSize: isMobile ? 'clamp(2.8rem, 10vw, 3.75rem)' : 'clamp(3.5rem, 5.5vw, 5.75rem)',
              lineHeight: 0.88, letterSpacing: '-0.02em',
              textTransform: 'uppercase', color: 'hsl(var(--pm-gray-50))',
              textWrap: 'balance' as React.CSSProperties['textWrap'],
              animation: 'v2-slide-up 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s both',
            }}>
              {vehicle.titleLine1}
            </h1>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h1 aria-hidden style={{
              fontFamily: 'var(--pm-font-display)',
              fontWeight: 900, fontStyle: 'italic',
              fontSize: isMobile ? 'clamp(2.8rem, 10vw, 3.75rem)' : 'clamp(3.5rem, 5.5vw, 5.75rem)',
              lineHeight: 0.88, letterSpacing: '-0.02em',
              textTransform: 'uppercase', color: RED,
              animation: 'v2-slide-up 0.65s cubic-bezier(0.16,1,0.3,1) 0.18s both',
            }}>
              {vehicle.titleLine2}
            </h1>
          </div>
        </div>

        {/* Support text — short, single block, clean */}
        <p key={`support-${currentSlide}`} style={{
          fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px',
          color: 'rgba(255,255,255,0.62)', marginBottom: '2rem',
          marginTop: '0.75rem',
          animation: 'v2-fade-in 0.75s ease 0.4s both',
        }}>
          {vehicle.supportText}
        </p>

        {/* KPIs — dynamic per vehicle, count-up */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '2.5rem',
        }}>
          <div style={{ paddingRight: '2rem', minWidth: isMobile ? '80px' : '100px', flexShrink: 0 }}>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic', fontSize: isMobile ? '1.6rem' : '2rem', color: '#fff', lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>+{powerVal} <span style={{ fontSize: '0.85rem', color: 'hsl(var(--pm-gray-400))' }}>{vehicle.powerUnit}</span></p>
            <p style={{
              fontSize: '0.56rem', color: 'hsl(var(--pm-gray-400))',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: 'var(--pm-font-mono)', marginTop: '3px',
            }}>Potência</p>
          </div>
          <div style={{ width: '1px', background: BORDER, marginRight: '2rem', alignSelf: 'stretch', flexShrink: 0 }} />
          <div style={{ paddingRight: '2rem', minWidth: isMobile ? '80px' : '100px', flexShrink: 0 }}>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic', fontSize: isMobile ? '1.6rem' : '2rem', color: '#fff', lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>+{torqueVal} <span style={{ fontSize: '0.85rem', color: 'hsl(var(--pm-gray-400))' }}>{vehicle.torqueUnit}</span></p>
            <p style={{
              fontSize: '0.56rem', color: 'hsl(var(--pm-gray-400))',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: 'var(--pm-font-mono)', marginTop: '3px',
            }}>Torque</p>
          </div>
          <div style={{ width: '1px', background: BORDER, marginRight: '2rem', alignSelf: 'stretch', flexShrink: 0 }} />
          <div style={{ minWidth: isMobile ? '70px' : '90px', flexShrink: 0 }}>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic', fontSize: isMobile ? '1.6rem' : '2rem', color: '#fff', lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>+10%</p>
            <p style={{
              fontSize: '0.56rem', color: 'hsl(var(--pm-gray-400))',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: 'var(--pm-font-mono)', marginTop: '3px',
            }}>Economia*</p>
          </div>
        </div>

        {/* CTA buttons — parallelogram / skewed */}
        <div style={{
          display: 'flex', gap: '0.9rem', alignItems: 'center',
          animation: 'v2-fade-in 0.75s ease 0.76s both',
        }}>
          {/* Primary — red */}
          <div style={{ transform: 'skewX(-12deg)', display: 'inline-flex' }}>
            <button
              onClick={onLogin}
              style={{
                background: RED, border: 'none', cursor: 'pointer',
                transition: 'filter 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.filter = 'brightness(1.2)'
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = ''
                e.currentTarget.style.transform = ''
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                transform: 'skewX(12deg)',
                padding: '0.88rem 1.8rem',
                fontSize: '0.78rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
                fontFamily: 'var(--pm-font-body)',
              }}>
                Quero Mais Performance <ArrowRight size={14} />
              </span>
            </button>
          </div>

          {/* Secondary — outline */}
          <div style={{ transform: 'skewX(-12deg)', display: 'inline-flex' }}>
            <button
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center',
                transform: 'skewX(12deg)',
                padding: '0.88rem 1.5rem',
                fontSize: '0.78rem', fontWeight: 600,
                color: 'hsl(var(--pm-gray-300))',
                fontFamily: 'var(--pm-font-body)',
              }}>
                Entender o Remap
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Right: gauge — hidden on mobile/tablet */}
      <div style={{
        display: (isMobile || isTablet) ? 'none' : 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        position: 'relative', zIndex: 3,
        background: 'linear-gradient(to left, rgba(8,8,9,0.72) 0%, rgba(8,8,9,0.08) 100%)',
        paddingTop: '95px',
      }}>
        {/* Red glow behind gauge */}
        <div style={{
          position: 'absolute', top: '70px',
          left: '50%', transform: 'translateX(-50%)',
          width: '360px', height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsl(var(--pm-red-500)/0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', marginTop: '20px' }}>
          <PerfGauge value={gaugeVal} label={`+${gaugeDisplayVal}%`} slide={currentSlide} />

          {/* POTÊNCIA chip — count-up */}
          <div style={{
            position: 'absolute', top: '10px', right: '-32px',
            background: 'rgba(5,7,11,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${BORDER}`, borderRadius: '8px',
            padding: '0.75rem 1rem', fontFamily: 'var(--pm-font-mono)',
            animation: 'v2-float 3s ease-in-out infinite',
          }}>
            <p style={{ fontSize: '0.5rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.15em', marginBottom: '2px' }}>POTÊNCIA</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 900, color: RED, lineHeight: 1, fontFamily: 'var(--pm-font-display)', fontStyle: 'italic' }}>
              +{powerVal} <span style={{ fontSize: '0.7rem' }}>{vehicle.powerUnit}</span>
            </p>
          </div>

          {/* TORQUE chip — count-up */}
          <div style={{
            position: 'absolute', bottom: '50px', left: '-42px',
            background: 'rgba(5,7,11,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${BORDER}`, borderRadius: '8px',
            padding: '0.75rem 1rem', fontFamily: 'var(--pm-font-mono)',
            animation: 'v2-float 3.5s ease-in-out 0.5s infinite',
          }}>
            <p style={{ fontSize: '0.5rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.15em', marginBottom: '2px' }}>TORQUE</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--pm-font-display)', fontStyle: 'italic' }}>
              +{torqueVal} <span style={{ fontSize: '0.7rem', color: 'hsl(var(--pm-gray-400))' }}>{vehicle.torqueUnit}</span>
            </p>
          </div>
        </div>
      </div>

      {/* BASE card — hidden on mobile */}
      <div key={`base-${currentSlide}`} style={{
        display: (isMobile || isTablet) ? 'none' : 'block',
        position: 'absolute', bottom: '40px', right: '56px',
        background: 'rgba(5,7,11,0.84)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderLeft: `2px solid ${RED}`,
        borderRadius: '10px',
        padding: '0.85rem 1.35rem',
        zIndex: 5,
        animation: 'v2-fade-in 0.5s ease 0.25s both',
      }}>
        <p style={{
          fontSize: '0.46rem', color: RED, letterSpacing: '0.28em',
          fontFamily: 'var(--pm-font-mono)', fontWeight: 700,
          textTransform: 'uppercase', marginBottom: '0.28rem',
        }}>BASE •</p>
        <p style={{
          fontFamily: 'var(--pm-font-display)', fontWeight: 900,
          fontStyle: 'italic', fontSize: '0.88rem', color: '#fff',
          textTransform: 'uppercase', lineHeight: 1.2, letterSpacing: '0.03em',
        }}>
          {vehicle.fuel} — {vehicle.modelName}
        </p>
        <p style={{
          fontSize: '0.58rem', color: 'hsl(var(--pm-gray-400))',
          marginTop: '0.18rem', fontFamily: 'var(--pm-font-mono)',
        }}>{vehicle.base}</p>
      </div>

      {/* Slider navigation — hidden on mobile */}
      <div style={{
        display: isMobile ? 'none' : 'flex',
        position: 'absolute', bottom: '28px',
        left: '50%', transform: 'translateX(-50%)',
        alignItems: 'center', gap: '0.6rem',
        zIndex: 4,
      }}>
        <button
          onClick={() => goToSlide((currentSlide - 1 + V2_VEHICLES.length) % V2_VEHICLES.length)}
          style={{
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.14)',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
          }}
        >
          <ChevronLeft size={13} color="white" />
        </button>

        {V2_VEHICLES.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            style={{
              width: '42px', height: '3px',
              position: 'relative', overflow: 'hidden',
              background: 'rgba(255,255,255,0.16)',
              border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {i < currentSlide && (
              <span style={{ position: 'absolute', inset: 0, background: 'rgba(193,13,25,0.55)' }} />
            )}
            {i === currentSlide && (
              <span
                key={`fill-${currentSlide}`}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  background: RED,
                  transformOrigin: 'left center',
                  animation: 'v2-bar-fill 6s linear forwards',
                }}
              />
            )}
          </button>
        ))}

        <button
          onClick={() => goToSlide((currentSlide + 1) % V2_VEHICLES.length)}
          style={{
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.14)',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
          }}
        >
          <ChevronRight size={13} color="white" />
        </button>
      </div>

      <style>{`
        @keyframes v2-bar-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes v2-slide-up {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes v2-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes v2-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes v2-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes v2-fade-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gauge-glow-breath {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.55; }
        }
        @keyframes gauge-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .v2-observe {
          opacity: 1;
          transform: translateY(0);
        }
        .v2-observe.v2-in {
          animation: v2-fade-up 0.65s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-observe.v2-in { animation: none; }
          .lp-observe.animate-in { animation: none; }
        }
        .v2-stagger .v2-observe:nth-child(1) { animation-delay: 0.00s; }
        .v2-stagger .v2-observe:nth-child(2) { animation-delay: 0.07s; }
        .v2-stagger .v2-observe:nth-child(3) { animation-delay: 0.14s; }
        .v2-stagger .v2-observe:nth-child(4) { animation-delay: 0.21s; }
        .v2-stagger .v2-observe:nth-child(5) { animation-delay: 0.28s; }
        .v2-stagger .v2-observe:nth-child(6) { animation-delay: 0.35s; }
      `}</style>
    </section>
  )
}

// ── MARQUEE STATS BAR ─────────────────────────────────────────────────────────
function MarqueeBar() {
  const items = [
    '✦ +20 CV DE POTÊNCIA',
    '✦ +5 KGF.M DE TORQUE',
    '✦ CALIBRAÇÃO 100% CUSTOM',
    '✦ +15 MIL VEÍCULOS ATENDIDOS',
    '✦ +10 ANOS DE EXPERIÊNCIA',
    '✦ +50 MARCAS HOMOLOGADAS',
    '✦ SEGURANÇA TÉCNICA TOTAL',
    '✦ ATÉ 10% DE ECONOMIA',
  ]
  const full = [...items, ...items]

  return (
    <div style={{
      background: RED, padding: '0.9rem 0', overflow: 'hidden',
      borderBlock: '1px solid hsl(var(--pm-red-600))',
    }}>
      <div style={{
        display: 'flex', gap: '0',
        animation: 'v2-marquee 30s linear infinite',
        width: 'max-content',
      }}>
        {full.map((t, i) => (
          <span key={i} style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
            color: '#fff', whiteSpace: 'nowrap', padding: '0 3rem',
            fontFamily: 'var(--pm-font-mono)',
          }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── NUMBERS — big impact ──────────────────────────────────────────────────────
function NumbersSection() {
  const isMobile = useBreakpoint(640)
  const nums = [
    { value: '+15mil',   label: 'Veículos Recalibrados', sub: 'desde 2014' },
    { value: '+10anos',  label: 'de Experiência',        sub: 'em performance' },
    { value: '+50marcas', label: 'Homologadas',          sub: 'e centenas de modelos' },
    { value: '100%',     label: 'Personalizado',         sub: 'cada mapeamento' },
  ]

  return (
    <section style={{
      background: DARK, padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,3rem)', position: 'relative', overflow: 'hidden',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Ghost text */}
      <div style={{
        position: 'absolute', bottom: '-8%', right: '-2%',
        fontSize: '22vw', fontFamily: 'var(--pm-font-display)', fontWeight: 900,
        fontStyle: 'italic', color: 'rgba(255,255,255,0.025)',
        userSelect: 'none', pointerEvents: 'none', lineHeight: 1,
        textTransform: 'uppercase',
      }}>POWER</div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="v2-observe" style={{ marginBottom: '5rem' }}>
          {/* Eyebrow removed — section heading is self-evident */}
          <Display size="clamp(2.5rem,4vw,3.5rem)">
            Resultado que se <Accent>mede.</Accent>
          </Display>
        </div>

        <div className="v2-stagger" style={{
          display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '0', borderTop: `1px solid ${BORDER}`,
        }}>
          {nums.map((n, i) => (
            <div key={n.label} className="v2-observe" style={{
              padding: isMobile ? '1.75rem 1.25rem' : '2.5rem 2rem',
              borderRight: isMobile ? (i % 2 === 0 ? `1px solid ${BORDER}` : 'none') : (i < 3 ? `1px solid ${BORDER}` : 'none'),
              borderBottom: isMobile && i < 2 ? `1px solid ${BORDER}` : 'none',
            }}>
              <p style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic',
                fontSize: 'clamp(2.8rem, 4.5vw, 4.5rem)', color: RED, lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {n.value}
              </p>
              <p style={{
                fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: '#fff', marginTop: '0.5rem',
                fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
              }}>
                {n.label}
              </p>
              <p style={{
                fontSize: '0.7rem', color: 'hsl(var(--pm-gray-500))',
                marginTop: '0.25rem', fontFamily: 'var(--pm-font-mono)',
                letterSpacing: '0.08em',
              }}>
                {n.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── COMO FUNCIONA — horizontal timeline ──────────────────────────────────────
const HW_THRESHOLDS = [0.16, 0.34, 0.52, 0.70, 0.88]

function HowItWorks() {
  const isMobile = useBreakpoint(768)
  const steps = [
    { n: '01', title: 'Diagnóstico',     desc: 'Entendemos veículo, objetivo e sintomas.' },
    { n: '02', title: 'Leitura ECU',     desc: 'O arquivo original é lido e analisado.' },
    { n: '03', title: 'Calibração',      desc: 'Mapa personalizado conforme objetivo.' },
    { n: '04', title: 'Validação',       desc: 'Parâmetros, consistência e segurança.' },
    { n: '05', title: 'Entrega',         desc: 'Arquivo final pronto para aplicação.' },
  ]

  const sectionRef   = useRef<HTMLElement>(null)
  const timelineRef  = useRef<HTMLDivElement>(null)
  const [progress,   setProgress]  = useState(0)
  const [active,     setActive]    = useState<boolean[]>(Array(5).fill(false))
  const [pulse,      setPulse]     = useState<boolean[]>(Array(5).fill(false))
  const activatedRef = useRef<boolean[]>(Array(5).fill(false))

  useEffect(() => {
    const handle = () => {
      if (!timelineRef.current) return
      const rect  = timelineRef.current.getBoundingClientRect()
      // progress = 0 when timeline enters viewport bottom (rect.top = window.innerHeight)
      // progress = 1 when timeline is 20% from bottom of viewport (rect.top = window.innerHeight * 0.2)
      const start = window.innerHeight
      const end   = window.innerHeight * 0.2
      const pct   = Math.max(0, Math.min(1, (start - rect.top) / (start - end)))
      setProgress(pct)
      HW_THRESHOLDS.forEach((t, i) => {
        if (pct >= t && !activatedRef.current[i]) {
          activatedRef.current[i] = true
          setActive(prev => { const n = [...prev]; n[i] = true; return n })
          setPulse(prev  => { const n = [...prev]; n[i] = true; return n })
          setTimeout(() => setPulse(prev => { const n = [...prev]; n[i] = false; return n }), 580)
        }
      })
    }
    window.addEventListener('scroll', handle, { passive: true })
    handle()
    return () => window.removeEventListener('scroll', handle)
  }, [])

  // SVG viewBox coords: 0 0 1000 56
  // 5 equal columns → circle centers at x = 100, 300, 500, 700, 900
  const LX1 = 100, LX2 = 900, LY = 28
  const tipX  = LX1 + (LX2 - LX1) * Math.min(progress, 1)
  const TAIL  = 180
  const tailX = Math.max(LX1, tipX - TAIL)
  const showTip = progress > 0.01 && progress < 1.005

  return (
    <section ref={sectionRef} id="como-funciona" style={{
      background: 'hsl(222 8% 6%)', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,3rem)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="v2-observe" style={{ marginBottom: '5rem', textAlign: 'center' }}>
          {/* Eyebrow removed */}
          <Display center size="clamp(2.5rem, 4.5vw, 4rem)">
            Como funciona a <Accent>Calibração</Accent>
          </Display>
          <p style={{
            color: 'hsl(var(--pm-gray-400))', marginTop: '1rem', fontSize: '0.875rem',
            maxWidth: '500px', margin: '1rem auto 0', lineHeight: 1.7,
          }}>
            Do diagnóstico à entrega, cada etapa garante precisão, rastreabilidade e segurança técnica total.
          </p>
        </div>

        {/* Timeline — horizontal desktop, vertical mobile */}
        <div ref={timelineRef} style={{ position: 'relative' }}>

          {/* Meteor SVG — desktop only */}
          <svg
            width="100%" height="56"
            viewBox="0 0 1000 56"
            preserveAspectRatio="none"
            style={{ display: isMobile ? 'none' : undefined, position: 'absolute', top: 0, left: 0, overflow: 'visible', zIndex: 1, pointerEvents: 'none' }}
          >
            <defs>
              {/* glow filter for tail */}
              <filter id="hw-glow" x="-60%" y="-300%" width="220%" height="700%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* bloom for tip orb */}
              <filter id="hw-bloom" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur stdDeviation="9"/>
              </filter>
              {/* tail gradient — transparent → red, tracking tip position */}
              <linearGradient
                id="hw-tail-grad"
                gradientUnits="userSpaceOnUse"
                x1={tailX} y1={LY} x2={tipX} y2={LY}
              >
                <stop offset="0%"   stopColor="#c10d19" stopOpacity="0"/>
                <stop offset="70%"  stopColor="#c10d19" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#ff3348" stopOpacity="1"/>
              </linearGradient>
            </defs>

            {/* A) base gray line */}
            <line
              x1={LX1} y1={LY} x2={LX2} y2={LY}
              stroke="rgba(255,255,255,0.09)" strokeWidth="1.5"
            />

            {/* B) red progress fill */}
            {progress > 0.01 && (
              <line
                x1={LX1} y1={LY} x2={tipX} y2={LY}
                stroke="#c10d19" strokeWidth="2" strokeLinecap="round"
              />
            )}

            {/* C) calda luminosa — gradient tail with glow */}
            {progress > 0.01 && (
              <line
                x1={tailX} y1={LY} x2={tipX} y2={LY}
                stroke="url(#hw-tail-grad)" strokeWidth="5" strokeLinecap="round"
                filter="url(#hw-glow)"
              />
            )}

            {/* D) ponta brilhante — bloom + bright core */}
            {showTip && (
              <>
                <circle cx={tipX} cy={LY} r="16" fill="#c10d19" opacity="0.20" filter="url(#hw-bloom)"/>
                <circle cx={tipX} cy={LY} r="4.5" fill="#ff3348" opacity="0.95"/>
              </>
            )}
          </svg>

          {/* Step grid */}
          {/* Mobile vertical connector */}
          {isMobile && (
            <div style={{
              position: 'absolute', left: '27px', top: '28px', bottom: '28px',
              width: '2px', background: 'rgba(255,255,255,0.08)', zIndex: 0,
            }}>
              <div style={{
                width: '100%',
                height: `${Math.min(progress * 100, 100)}%`,
                background: 'linear-gradient(to bottom, #c10d19, #ff3348)',
                transition: 'height 0.3s ease',
              }} />
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
            gap: isMobile ? '0' : '1.5rem',
          }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: isMobile ? 'flex-start' : 'center',
                textAlign: isMobile ? 'left' : 'center',
                position: 'relative',
                gap: isMobile ? '1rem' : 0,
                paddingBottom: isMobile ? '2rem' : 0,
                paddingLeft: isMobile ? '0' : 0,
              }}>
                {/* Circle */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                  background: DARK,
                  border: `2px solid ${active[i] ? '#c10d19' : 'rgba(255,255,255,0.14)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: isMobile ? 0 : '1.5rem', position: 'relative', zIndex: 2,
                  boxShadow: active[i]
                    ? '0 0 24px rgba(193,13,25,0.55), 0 0 8px rgba(193,13,25,0.25)'
                    : 'none',
                  transform: pulse[i] ? 'scale(1.16)' : 'scale(1)',
                  transition: 'border-color 0.35s ease, box-shadow 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <span style={{
                    fontFamily: 'var(--pm-font-mono)', fontWeight: 700,
                    fontSize: '0.75rem',
                    color: active[i] ? '#c10d19' : 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.05em',
                    transition: 'color 0.35s ease',
                  }}>{s.n}</span>

                  {/* Check badge — only on last step when completed */}
                  {i === 4 && active[4] && (
                    <div style={{
                      position: 'absolute', top: '-7px', right: '-7px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#c10d19',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'hw-check-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
                    }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>

                <p style={{
                  fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                  fontSize: '0.95rem', textTransform: 'uppercase', fontStyle: 'italic',
                  color: '#fff', marginBottom: '0.5rem', letterSpacing: '0.02em',
                }}>
                  {s.title}
                </p>
                <p style={{
                  fontSize: '0.78rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6,
                }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hw-check-in {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  )
}

// ── VEÍCULOS ──────────────────────────────────────────────────────────────────
function VehicleCard({ label, desc, img, slug }: { label: string; desc: string; img: string; slug: string }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  return (
    <div
      className="v2-observe"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/veiculos/${slug}`)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: '14px',
        height: '240px', cursor: 'pointer',
        border: `1px solid ${hovered ? 'rgba(193,13,25,0.40)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered
          ? '0 0 0 1px rgba(193,13,25,0.12), 0 16px 48px rgba(193,13,25,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'border-color 0.32s ease, box-shadow 0.36s ease, transform 0.32s cubic-bezier(0.16,1,0.3,1)',
        background: 'rgba(8,10,16,0.40)',
      }}
    >
      {/* Photo — muted silhouette */}
      <img src={img} alt={label} loading="lazy" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover',
        opacity: hovered ? 1.0 : 0.78,
        filter: 'grayscale(15%)',
        transform: hovered ? 'scale(1.20)' : 'scale(1.15)',
        transformOrigin: 'center center',
        transition: 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
      }} />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(5,7,11,0.02) 0%, rgba(5,7,11,0.55) 55%, rgba(5,7,11,0.88) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top sheen — glass edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: hovered
          ? 'linear-gradient(90deg, transparent 5%, rgba(193,13,25,0.55) 50%, transparent 95%)'
          : 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.10) 50%, transparent 95%)',
        transition: 'background 0.36s ease',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100%', padding: '1.75rem 1.75rem 1.75rem 2rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        <p style={{
          fontFamily: 'var(--pm-font-mono)', fontSize: '0.56rem', fontWeight: 700,
          color: 'rgba(193,13,25,0.75)', letterSpacing: '0.22em',
          textTransform: 'uppercase', marginBottom: '0.45rem',
        }}>
          REPROGRAMAÇÃO
        </p>
        <p style={{
          fontFamily: 'var(--pm-font-display)', fontWeight: 900,
          fontSize: '1.5rem', textTransform: 'uppercase', fontStyle: 'italic',
          color: '#fff', marginBottom: '0.3rem', lineHeight: 0.95,
          letterSpacing: '-0.01em',
        }}>
          {label}
        </p>
        <p style={{
          fontSize: '0.70rem', color: 'rgba(255,255,255,0.38)',
          marginBottom: '1rem', lineHeight: 1.5,
        }}>
          {desc}
        </p>
        <span style={{
          fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.14em',
          display: 'flex', alignItems: 'center', gap: '5px',
          color: hovered ? '#B12825' : 'rgba(193,13,25,0.80)',
          transition: 'color 0.2s ease',
          fontFamily: 'var(--pm-font-mono)',
        }}>
          VER SOLUÇÕES <ArrowRight size={9} />
        </span>
      </div>
    </div>
  )
}

function VehiclesSection() {
  const isMobile = useBreakpoint(640)
  const isTablet = useBreakpoint(900)
  const cats = [
    { slug: 'carros-e-suvs', label: 'Carros & SUVs', desc: 'Hatch, sedan, SUV e esportivos', img: catCarros },
    { slug: 'pickups',  label: 'Pickups',        desc: 'Leves e pesadas',                  img: catPickups  },
    { slug: 'trucks',   label: 'Trucks',         desc: 'Caminhões e frotas',               img: catTrucks   },
    { slug: 'agricola', label: 'Agrícola',       desc: 'Tratores e colheitadeiras',        img: catAgricola },
    { slug: 'maquinas', label: 'Máquinas',       desc: 'Equipamentos industriais',         img: catMaquinas },
    { slug: 'motos',    label: 'Motos',          desc: 'Street, trail e esportivas',       img: catMotos    },
  ]

  return (
    <section id="veículos" style={{
      background: DARK, padding: '7rem 3rem',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: '3.5rem',
        }}>
          <div className="v2-observe">
            <Eyebrow>Soluções por Aplicação</Eyebrow>
            <Display size="clamp(2.5rem, 4.5vw, 3.75rem)">
              Performance para <Accent>todos</Accent><br />os tipos de máquinas
            </Display>
          </div>
          <p className="v2-observe" style={{
            fontSize: '0.8rem', color: 'hsl(var(--pm-gray-500))',
            maxWidth: '220px', textAlign: 'right', lineHeight: 1.6,
          }}>
            Remapeamento testado e validado para diversas plataformas
          </p>
        </div>

        <div className="v2-stagger" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: '1.25rem',
        }}>
          {cats.map(c => <VehicleCard key={c.label} {...c} />)}
        </div>
      </div>
    </section>
  )
}

// ── RESULTADOS ────────────────────────────────────────────────────────────────
const RS_BARS = [
  { label: 'Potência',   num: 40, w: 62,  delay: 0   },
  { label: 'Torque',     num: 35, w: 56,  delay: 160 },
  { label: 'Resposta',   num: 70, w: 76,  delay: 320 },
  { label: 'Eficiência', num: 14, w: 44,  delay: 480 },
]
const RS_CURVE = [30, 45, 55, 60, 70, 80, 85, 90, 95, 100, 98, 96]

function ResultsSection() {
  const isMobile = useBreakpoint(900)
  const sectionRef   = useRef<HTMLElement>(null)
  const [triggered, setTriggered] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const handle = () => {
      if (triggeredRef.current || !sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.84) {
        triggeredRef.current = true
        setTriggered(true)
      }
    }
    window.addEventListener('scroll', handle, { passive: true })
    handle()
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const sk = triggered ? 1 : 0
  const n0     = useCountUp(triggered ? RS_BARS[0].num : 0, sk, RS_BARS[0].delay + 120, 1400)
  const n1     = useCountUp(triggered ? RS_BARS[1].num : 0, sk, RS_BARS[1].delay + 120, 1400)
  const n2     = useCountUp(triggered ? RS_BARS[2].num : 0, sk, RS_BARS[2].delay + 120, 1400)
  const n3     = useCountUp(triggered ? RS_BARS[3].num : 0, sk, RS_BARS[3].delay + 120, 1400)
  const nCells  = useCountUp(triggered ? 1247 : 0, sk, 180, 1600)
  const nTiming = useCountUp(triggered ? 12   : 0, sk, 280, 1400)
  const barNums = [n0, n1, n2, n3]

  return (
    <section ref={sectionRef} id="resultados" style={{
      background: 'hsl(222 8% 6%)', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,3rem)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2rem' : '6rem', alignItems: 'center',
      }}>

        {/* Right panel: diagnostic mockup */}
        <div className="v2-observe" style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: '16px', padding: '2rem', fontFamily: 'var(--pm-font-mono)',
          order: 1,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.45)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: RED, letterSpacing: '0.2em' }}>PROMAX ECU ANALYTICS</p>
            <span style={{
              fontSize: '0.6rem', padding: '3px 10px', borderRadius: '4px',
              background: 'hsl(var(--pm-green-400)/0.12)',
              color: 'hsl(var(--pm-green-400))', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'hsl(var(--pm-green-400))', display: 'inline-block',
                animation: triggered ? 'rs-dot 1.8s ease-in-out infinite' : 'none',
              }} />
              MAP_VALIDATED
            </span>
          </div>

          <p style={{
            fontFamily: 'var(--pm-font-display)', fontWeight: 900,
            fontStyle: 'italic', fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem',
          }}>
            ECU_CALIBRATION_LOG
          </p>

          {/* KPI row — ECU-relevant metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>CELLS_MODIFIED</p>
              <p style={{
                fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1,
                fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
              }}>
                {nCells.toLocaleString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', marginTop: '2px' }}>de 4.096 células</p>
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>TIMING_ADVANCE</p>
              <p style={{
                fontSize: '2.2rem', fontWeight: 900, color: RED, lineHeight: 1,
                fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
              }}>
                +{nTiming}<span style={{ fontSize: '1.1rem', color: 'rgba(193,13,25,0.6)', marginLeft: '2px' }}>°</span>
              </p>
              <p style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', marginTop: '2px' }}>avanço de ignição</p>
            </div>
          </div>

          {/* Power delta curve — animated bars */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em' }}>POWER_DELTA_OVERLAY</p>
              <p style={{ fontSize: '0.52rem', color: 'rgba(193,13,25,0.7)', letterSpacing: '0.08em' }}>antes → depois</p>
            </div>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '52px' }}>
              {RS_CURVE.map((h, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: '2px 2px 0 0',
                  background: `linear-gradient(to top, #c10d19, rgba(255,80,70,0.65))`,
                  height: triggered ? `${h}%` : '0%',
                  opacity: 0.55 + i * 0.035,
                  boxShadow: triggered ? '0 0 4px rgba(193,13,25,0.4)' : 'none',
                  transition: `height 0.75s cubic-bezier(0.16,1,0.3,1) ${i * 50 + 280}ms, box-shadow 0.4s ease ${i * 50 + 900}ms`,
                }} />
              ))}
            </div>
            {/* RPM axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {['1k', '2k', '3k', '4k', '5k', '6k'].map(r => (
                <span key={r} style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>{r}</span>
              ))}
            </div>
          </div>

          {/* Stage / validation badge */}
          <div style={{
            marginTop: '1.5rem', padding: '0.85rem 1rem',
            background: 'hsl(var(--pm-red-500)/0.08)', borderRadius: '8px',
            border: `1px solid hsl(var(--pm-red-500)/0.22)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'box-shadow 0.8s ease',
            boxShadow: triggered ? '0 0 24px rgba(193,13,25,0.10) inset' : 'none',
          }}>
            <div>
              <p style={{ fontSize: '0.52rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.15em', marginBottom: '2px' }}>MAPA_TIPO</p>
              <p style={{
                fontSize: '1.4rem', fontWeight: 900, color: RED,
                fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
                textShadow: triggered ? '0 0 20px rgba(193,13,25,0.5)' : 'none',
                transition: 'text-shadow 1s ease 0.6s', lineHeight: 1,
              }}>STAGE 2</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.52rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.08em', marginBottom: '2px' }}>CHECKSUM</p>
              <p style={{ fontSize: '0.65rem', color: 'hsl(var(--pm-green-400))', letterSpacing: '0.05em', fontWeight: 700 }}>4F8A·2D ✓</p>
              <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', marginTop: '2px' }}>ECU HOMOLOGADA</p>
            </div>
          </div>
        </div>

        {/* Left: text + animated bars */}
        <div className="v2-observe" style={{ order: 2 }}>
          {/* Eyebrow removed */}
          <Display size="clamp(2rem, 3.5vw, 3.25rem)">
            Mais que potência:<br /><Accent>comportamento</Accent><br />transformado
          </Display>
          <p style={{
            color: 'hsl(var(--pm-gray-400))', fontSize: '0.875rem', lineHeight: 1.7,
            marginTop: '1.5rem', marginBottom: '2.5rem',
          }}>
            A calibração certa muda a forma como o veículo responde em cada troca,
            em cada retomada. O foco é o equilíbrio perfeito entre performance, segurança e aplicação real.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {RS_BARS.map((b, i) => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem', alignItems: 'baseline' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: 'hsl(var(--pm-gray-300))',
                    fontFamily: 'var(--pm-font-mono)',
                  }}>
                    {b.label}
                  </span>
                  <span style={{
                    fontSize: '1rem', fontWeight: 900, color: RED,
                    fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
                    letterSpacing: '-0.01em', lineHeight: 1,
                  }}>
                    +{barNums[i]}%
                  </span>
                </div>

                {/* Track */}
                <div style={{
                  height: '5px', borderRadius: '999px', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)',
                  position: 'relative',
                }}>
                  {/* Glow bloom behind fill */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: triggered ? `${b.w}%` : '0%',
                    background: 'rgba(193,13,25,0.25)',
                    filter: 'blur(6px)',
                    borderRadius: '999px',
                    transition: `width 1.5s cubic-bezier(0.16,1,0.3,1) ${b.delay}ms`,
                  }} />
                  {/* Main fill */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: triggered ? `${b.w}%` : '0%',
                    background: 'linear-gradient(to right, #c10d19 0%, #ff3040 100%)',
                    borderRadius: '999px',
                    boxShadow: triggered ? '0 0 8px rgba(193,13,25,0.7)' : 'none',
                    transition: `width 1.4s cubic-bezier(0.16,1,0.3,1) ${b.delay}ms, box-shadow 0.6s ease ${b.delay + 700}ms`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rs-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.25; transform: scale(0.65); }
        }
      `}</style>
    </section>
  )
}

// ── LOJA ──────────────────────────────────────────────────────────────────────
function LojaSection() {
  const isMobile = useBreakpoint(640)
  const categories = [
    { icon: Zap,         title: 'Pro Booster',        desc: 'Módulos de potência com bluetooth e app dedicado.', price: 'A partir de R$ 890', badge: 'MAIS VENDIDO' },
    { icon: Cpu,         title: 'Piggy Back',          desc: 'Módulos de interceptação para ajuste de sinal.', price: 'A partir de R$ 1.200', badge: 'TÉCNICO' },
    { icon: Wrench,      title: 'Filtros de Ar',       desc: 'Filtros de alto fluxo para eficiência da admissão.', price: 'A partir de R$ 280', badge: 'ACESSÓRIO' },
    { icon: FlameKindling, title: 'Downpipe',          desc: 'Tubulações para reduzir restrição e liberar performance.', price: 'A partir de R$ 1.800', badge: 'PERFORMANCE' },
    { icon: Fuel,        title: 'Filtros Combustível', desc: 'Filtros de alta precisão (5 micras) para proteção do motor.', price: 'A partir de R$ 195', badge: 'PROTEÇÃO' },
    { icon: Settings2,   title: 'Man. e Acessórios',   desc: 'Peças de reposição e acessórios para módulos Promax.', price: 'A partir de R$ 60', badge: 'REPOSIÇÃO' },
  ]

  return (
    <section id="loja" style={{ background: DARK, padding: '7rem 3rem', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: isMobile ? 'flex-start' : 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          gap: isMobile ? '1rem' : 0,
          marginBottom: '3.5rem',
        }}>
          <div className="v2-observe">
            <Eyebrow>Loja Virtual</Eyebrow>
            <Display size="clamp(2.5rem, 4.5vw, 3.75rem)">
              Produtos <Accent>Promax</Accent><br />para sua máquina
            </Display>
          </div>
          <a href="/loja" className="v2-observe" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: RED, fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
            flexShrink: 0,
          }}>
            Ver catálogo completo <ArrowRight size={13} />
          </a>
        </div>

        <div className="v2-stagger" style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1px',
          border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden',
        }}>
          {categories.map((c, i) => (
            <a key={c.title} href="/loja" className="v2-observe" style={{
              background: i % 2 === 0 ? CARD : 'hsl(222 6% 10%)',
              padding: '2rem', position: 'relative', overflow: 'hidden',
              cursor: 'pointer', borderRight: i % 3 < 2 ? `1px solid ${BORDER}` : 'none',
              borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none',
              transition: 'background 0.2s ease', textDecoration: 'none', display: 'block',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(222 8% 13%)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? CARD : 'hsl(222 6% 10%)')}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: '2rem', width: '40px',
                height: '2px', background: RED,
              }} />

              <span style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.15em',
                padding: '3px 8px', borderRadius: '4px',
                background: 'hsl(var(--pm-red-500)/0.1)', color: RED,
                fontFamily: 'var(--pm-font-mono)',
              }}>{c.badge}</span>

              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: 'hsl(var(--pm-red-500)/0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem', marginTop: '0.5rem',
              }}>
                <c.icon size={20} style={{ color: RED }} />
              </div>

              <h3 style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                fontSize: '1rem', textTransform: 'uppercase', fontStyle: 'italic',
                color: '#fff', marginBottom: '0.4rem',
              }}>{c.title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {c.desc}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{c.price}</span>
                <span style={{ fontSize: '0.6rem', color: RED, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  VER <ArrowRight size={10} />
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="v2-observe" style={{
          marginTop: '2rem', padding: '1.5rem', borderRadius: '12px',
          border: `1px solid hsl(var(--pm-red-500)/0.2)`,
          background: 'hsl(var(--pm-red-500)/0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1rem' : 0,
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 800,
              fontSize: '1.1rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff',
            }}>
              539 produtos no catálogo
            </p>
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.2rem' }}>
              Preços especiais para franqueados parceiros
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
            <a href="/loja" style={{ flex: isMobile ? 1 : 'none' }}>
            <Button variant="outline" style={{ borderColor: BORDER, fontSize: '0.72rem', width: isMobile ? '100%' : 'auto' }}>
              <ShoppingBag size={13} style={{ marginRight: '6px' }} /> Ver Catálogo
            </Button>
            </a>
            <Button style={{ background: RED, fontSize: '0.72rem', fontWeight: 700, flex: isMobile ? 1 : 'none' }}>
              Seja Parceiro <ArrowRight size={13} style={{ marginLeft: '4px' }} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── SOBRE / FEATURES ──────────────────────────────────────────────────────────
function AboutSection() {
  const isMobile = useBreakpoint(768)
  const features = [
    { icon: Settings2,   title: 'Calibração sob Medida',  desc: 'Mapas ajustados exclusivamente para o veículo e objetivo do cliente.' },
    { icon: ShieldCheck, title: 'Foco em Segurança',      desc: 'Ganhos reais respeitando os limites mecânicos e térmicos.' },
    { icon: Headphones,  title: 'Atendimento Consultivo', desc: 'Técnica antes da venda. Transparência total.' },
    { icon: LayoutGrid,  title: 'Ampla Aplicação',        desc: 'Soluções para veículos leves, pesados, agrícolas e motos.' },
    { icon: Cpu,         title: 'Tecnologia Aplicada',    desc: 'Processos digitais, rastreáveis e orientados por dados.' },
    { icon: Star,        title: 'Experiência Premium',    desc: 'Jornada técnica compatível com o alto nível da sua máquina.' },
  ]

  return (
    <section id="sobre" style={{
      background: 'hsl(222 8% 6%)', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,3rem)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Two-column header */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '1.5rem' : '4rem', alignItems: 'end', marginBottom: '5rem',
        }}>
          <div className="v2-observe">
            <Eyebrow>Autoridade Técnica</Eyebrow>
            <Display size="clamp(2.5rem, 4.5vw, 4rem)">
              Performance não é chute.<br /><Accent>É Calibração.</Accent>
            </Display>
          </div>
          <p className="v2-observe" style={{
            color: 'hsl(var(--pm-gray-400))', fontSize: '0.9rem', lineHeight: 1.8,
            alignSelf: 'end',
          }}>
            A Promax Tuner combina conhecimento técnico, método, leitura de dados e foco em resultado
            real para entregar uma experiência de performance confiável.
          </p>
        </div>

        {/* Features: 2-column table-like layout */}
        <div className="v2-stagger" style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0',
          border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden',
        }}>
          {features.map((f, i) => (
            <div key={f.title} className="v2-observe" style={{
              padding: '1.75rem 2rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
              borderRight: i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
              borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none',
              background: i % 4 < 2 ? 'transparent' : 'hsl(222 6% 10%)',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
                background: 'hsl(var(--pm-red-500)/0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <f.icon size={18} style={{ color: RED }} />
              </div>
              <div>
                <p style={{
                  fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                  fontSize: '0.95rem', textTransform: 'uppercase', fontStyle: 'italic',
                  color: '#fff', marginBottom: '0.35rem',
                }}>
                  {f.title}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── DEPOIMENTOS (nova seção) ──────────────────────────────────────────────────
function TestimonialsSection() {
  const isMobile = useBreakpoint(768)
  const reviews = [
    {
      name: 'Rafael M.',
      vehicle: 'Hilux 2.8 TDI',
      text: 'Diferença absurda na retomada. Calibração sob medida, o técnico explicou tudo antes de fazer. Recomendo sem hesitar.',
      gain: '+18 cv',
    },
    {
      name: 'Carlos E.',
      vehicle: 'S10 High Country',
      text: 'Já fiz remap em outros lugares, mas o nível técnico da Promax é outro patamar. Resultado consistente e seguro.',
      gain: '+22 cv',
    },
    {
      name: 'Thiago R.',
      vehicle: 'Corolla Altis GR',
      text: 'Serviço profissional do início ao fim. Entrega rápida, arquivo de qualidade e suporte pós-entrega impecável.',
      gain: '+15 cv',
    },
  ]

  return (
    <section style={{
      background: DARK, padding: '7rem 3rem', borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="v2-observe" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          {/* Eyebrow removed */}
          <Display center size="clamp(2.5rem, 4vw, 3.5rem)">
            Resultados que <Accent>falam</Accent> por si
          </Display>
        </div>

        <div className="v2-stagger" style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.25rem',
        }}>
          {reviews.map((r) => (
            <div key={r.name} className="v2-observe" style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px',
              padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}>
              {/* Stars */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} style={{ color: RED, fill: RED }} />
                ))}
              </div>

              <p style={{
                fontSize: '0.875rem', color: 'hsl(var(--pm-gray-200))',
                lineHeight: 1.75, fontStyle: 'italic', flex: 1,
              }}>
                "{r.text}"
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{r.name}</p>
                  <p style={{
                    fontSize: '0.65rem', color: 'hsl(var(--pm-gray-400))',
                    fontFamily: 'var(--pm-font-mono)', letterSpacing: '0.08em',
                  }}>{r.vehicle}</p>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: '6px',
                  background: 'hsl(var(--pm-red-500)/0.12)',
                  border: `1px solid hsl(var(--pm-red-500)/0.25)`,
                }}>
                  <p style={{
                    fontFamily: 'var(--pm-font-display)', fontWeight: 900,
                    fontStyle: 'italic', fontSize: '1.2rem', color: RED, lineHeight: 1,
                  }}>{r.gain}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA FINAL ─────────────────────────────────────────────────────────────────
function CTASection({ onLogin }: { onLogin: () => void }) {
  const isMobile = useBreakpoint(640)
  return (
    <section id="contato" style={{
      background: 'hsl(222 8% 5%)', padding: '8rem 3rem',
      position: 'relative', overflow: 'hidden',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Red glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '200px',
        background: `radial-gradient(ellipse at center top, hsl(var(--pm-red-500)/0.12) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div className="v2-observe">
          <Eyebrow>Pronto para calibrar?</Eyebrow>
          <h2 style={{
            fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic',
            fontSize: 'clamp(3rem, 6vw, 5.5rem)', lineHeight: 0.9,
            letterSpacing: '-0.02em', textTransform: 'uppercase',
            marginBottom: '2rem',
          }}>
            <span style={{ color: '#fff' }}>Seu veículo pode</span><br />
            <span style={{ color: RED }}>entregar mais.</span><br />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>A gente sabe como.</span>
          </h2>
          <p style={{
            color: 'hsl(var(--pm-gray-400))', fontSize: '1rem', lineHeight: 1.75,
            marginBottom: '3rem', maxWidth: '480px', margin: '0 auto 3rem',
          }}>
            Solicite uma análise técnica e descubra o potencial real da sua máquina
            com segurança, método e performance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '5rem' }}>
            <Button onClick={onLogin} size="lg" style={{
              background: RED, fontWeight: 700, fontSize: '0.85rem',
              letterSpacing: '0.06em', height: '54px', paddingInline: '2.5rem',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Seja um Parceiro Tuner <ArrowRight size={16} />
            </Button>
            <button onClick={openWA} style={{
              height: '54px', paddingInline: '2rem', borderRadius: '6px',
              border: `1px solid ${BORDER}`, background: 'transparent',
              color: '#fff', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--pm-font-body)',
              transition: 'border-color 0.2s, color 0.2s',
            }}>
              <Phone size={15} style={{ color: RED }} /> Falar com Especialista
            </button>
          </div>
        </div>

        {/* Contact strip */}
        <div className="v2-observe" style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '0', border: `1px solid ${BORDER}`, borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {[
            { icon: Mail,   label: 'E-MAIL',        value: 'contato@promaxtuner.com.br' },
            { icon: Phone,  label: 'WHATSAPP',       value: '+55 (45) 99998-5254' },
            { icon: MapPin, label: 'UNIDADE MATRIZ', value: 'Cascavel, PR' },
          ].map((c, i) => (
            <div key={c.label} style={{
              padding: '1.5rem', textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
              background: i === 1 ? 'hsl(222 6% 10%)' : 'transparent',
            }}>
              <c.icon size={16} style={{ color: RED, margin: '0 auto 0.5rem', display: 'block' }} />
              <p style={{
                fontSize: '0.55rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.2em',
                marginBottom: '0.35rem', fontFamily: 'var(--pm-font-mono)',
              }}>{c.label}</p>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  const isMobile = useBreakpoint(640)
  return (
    <footer style={{ background: '#000', padding: isMobile ? '2rem 1.25rem 1.5rem' : '3rem 3rem 1.5rem', borderTop: `1px solid hsl(var(--pm-gray-800))` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr',
          gap: isMobile ? '2rem' : '3rem', marginBottom: '3rem',
        }}>
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <img src={logoUrl} alt="Promax Tuner" style={{ height: '36px', width: 'auto', display: 'block', opacity: 0.92 }} />
            </div>
            <p style={{
              fontSize: '0.75rem', color: 'hsl(var(--pm-gray-500))',
              lineHeight: 1.8, maxWidth: '280px',
            }}>
              Desempenho real. Resultados reais.<br />
              Excelência técnica em remapeamento e performance automotiva.
            </p>
          </div>

          <div>
            <p style={{ fontSize: '0.6rem', color: RED, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--pm-font-mono)' }}>
              PERFORMANCE
            </p>
            {[
              { label: 'Stage 1 & 2', href: '#serviços' },
              { label: 'Custom Tuning', href: '#serviços' },
              { label: 'Tabela ECU', href: '/veiculos/carros-e-suvs' },
              { label: 'Solicitar Orçamento', href: `https://wa.me/5545999985254` },
            ].map((l) => (
              <a key={l.label} href={l.href} style={{ fontSize: '0.78rem', color: 'hsl(var(--pm-gray-500))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.7rem', display: 'block', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = RED)}
                onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--pm-gray-500))')}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div>
            <p style={{ fontSize: '0.6rem', color: RED, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--pm-font-mono)' }}>
              NAVEGAÇÃO
            </p>
            {[
              { label: 'Serviços', href: '#serviços' },
              { label: 'Veículos', href: '#veículos' },
              { label: 'Como Funciona', href: '#como-funciona' },
              { label: 'Loja Virtual', href: '/loja' },
              { label: 'Contato', href: '#contato' },
            ].map((l) => (
              <a key={l.label} href={l.href} style={{ fontSize: '0.78rem', color: 'hsl(var(--pm-gray-500))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.7rem', display: 'block', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--pm-gray-500))')}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: `1px solid hsl(var(--pm-gray-900))`, paddingTop: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            © 2026 PROMAX TUNER. TODOS OS DIREITOS RESERVADOS.
          </p>
          <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            POWERED BY <strong style={{ color: 'hsl(var(--pm-gray-400))' }}>PROMAX GROUP</strong>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function LandingV2() {
  const { playAndNavigate } = useTunerSplash()
  const login = () => playAndNavigate({ href: '/login', variant: 'auth', minDuration: 1700, navigationDelay: 920 })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('v2-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.v2-observe').forEach(el => observer.observe(el))

    // Hash scroll: handle /#section navigation from loja or external links
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <div style={{ background: DARK, minHeight: '100vh' }}>
      <Navbar onLogin={login} scrolled={scrolled} />
      <HeroSection onLogin={login} />
      <MarqueeBar />
      <NumbersSection />
      <HowItWorks />
      <VehiclesSection />
      <ResultsSection />
      <LojaSection />
      <TestimonialsSection />
      <AboutSection />
      <CTASection onLogin={login} />
      <Footer />
    </div>
  )
}
