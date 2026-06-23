import { useEffect, useRef, useState } from 'react'
import logoUrl from '@/assets/tuner-logo.svg'
import { useTunerSplash } from '@/components/branding/TunerSplashProvider'
import {
  ChevronRight, ChevronLeft, Gauge, TrendingUp, Activity, Fuel,
  LayoutGrid, ShieldCheck, Settings2, Headphones,
  Wrench, Cpu, FlameKindling, ShoppingBag, ArrowRight,
  Star, Phone, Mail, MapPin, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import '../landing.css'

const RED = 'hsl(var(--pm-red-500))'
const DARK = 'hsl(var(--pm-gray-950))'
const CARD_BG = 'hsl(var(--pm-gray-900))'
const BORDER = 'hsl(var(--pm-gray-700))'

const SLIDES = [
  {
    id: 0,
    label: 'CARROS & SUVs',
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(139,0,0,0.18) 0%, transparent 60%), linear-gradient(110deg, #080808 0%, #120404 40%, #1a0505 100%)',
  },
  {
    id: 1,
    label: 'PICKUPS',
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(80,0,0,0.22) 0%, transparent 60%), linear-gradient(110deg, #06080c 0%, #0c0f14 40%, #121620 100%)',
  },
  {
    id: 2,
    label: 'TRUCKS',
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(100,0,0,0.18) 0%, transparent 60%), linear-gradient(110deg, #080808 0%, #0a1010 40%, #0c1515 100%)',
  },
  {
    id: 3,
    label: 'AGRÍCOLA',
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(80,20,0,0.20) 0%, transparent 60%), linear-gradient(110deg, #080808 0%, #100a04 40%, #181008 100%)',
  },
  {
    id: 4,
    label: 'MOTOS',
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(100,0,20,0.18) 0%, transparent 60%), linear-gradient(110deg, #060608 0%, #0a0610 40%, #100818 100%)',
  },
]

type VehicleData = {
  category: string
  name: string
  commercialCall: string
  base: string
  powerGain: string
  torqueGain: string
  estimatedImprovement: string
  gaugeValue: number
}

const VEHICLE_DATA: VehicleData[] = [
  {
    category: 'CARROS & SUVs',
    name: 'Hatch · Sedã · SUV',
    commercialCall: 'Mais resposta em cada troca',
    base: 'Gasolina · Turbo · Flex',
    powerGain: '+18 cv',
    torqueGain: '+4 kgf.m',
    estimatedImprovement: '+22%',
    gaugeValue: 72,
  },
  {
    category: 'PICKUPS',
    name: 'Hilux · S10 · Ranger',
    commercialCall: 'Tração e torque para o trabalho',
    base: 'Diesel · Turbo Diesel',
    powerGain: '+25 cv',
    torqueGain: '+6 kgf.m',
    estimatedImprovement: '+28%',
    gaugeValue: 85,
  },
  {
    category: 'TRUCKS',
    name: 'Scania · Volvo · Mercedes',
    commercialCall: 'Eficiência na carga pesada',
    base: 'Euro V · Euro VI Diesel',
    powerGain: '+35 cv',
    torqueGain: '+12 kgf.m',
    estimatedImprovement: '+18%',
    gaugeValue: 78,
  },
  {
    category: 'AGRÍCOLA',
    name: 'Trator · Colheitadeira · Pulverizador',
    commercialCall: 'Mais força no campo',
    base: 'Diesel Agrícola · FPT · Cummins',
    powerGain: '+22 cv',
    torqueGain: '+8 kgf.m',
    estimatedImprovement: '+20%',
    gaugeValue: 68,
  },
  {
    category: 'MOTOS',
    name: 'Sport · Naked · Adventure',
    commercialCall: 'Aceleração afiada e direta',
    base: 'Gasolina · Injeção Eletrônica',
    powerGain: '+8 cv',
    torqueGain: '+1.5 kgf.m',
    estimatedImprovement: '+15%',
    gaugeValue: 60,
  },
]

function HeroGauge({ vehicle }: { vehicle: VehicleData }) {
  const R = 105
  const C = 2 * Math.PI * R
  const arcLen = C * (240 / 360)
  const gap = C - arcLen
  const progress = arcLen * (vehicle.gaugeValue / 100)
  const [offset, setOffset] = useState(arcLen)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(arcLen)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOffset(arcLen - progress))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ animation: 'lp-fadeIn 0.5s ease-out' }}>
      <svg
        viewBox="0 0 300 280"
        style={{ width: '100%', maxWidth: '300px', overflow: 'visible', display: 'block', margin: '0 auto' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-gauge-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c10d19" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff3040" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx="150" cy="145" r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="12"
          strokeDasharray={`${arcLen.toFixed(1)} ${gap.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(150, 150, 145)"
        />

        {/* Progress arc */}
        <circle
          cx="150" cy="145" r={R}
          fill="none"
          stroke="url(#hero-gauge-grad)"
          strokeWidth="12"
          strokeDasharray={`${arcLen.toFixed(1)} ${gap.toFixed(1)}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(150, 150, 145)"
          style={{ transition: 'stroke-dashoffset 0.95s cubic-bezier(0.34,1.56,0.64,1)' }}
        />

        {/* Center value */}
        <text x="150" y="133"
          textAnchor="middle" fill="#ffffff"
          fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="900" fontStyle="italic" fontSize="40"
        >
          {vehicle.estimatedImprovement}
        </text>
        <text x="150" y="156"
          textAnchor="middle" fill="rgba(255,255,255,0.4)"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="8" letterSpacing="3"
        >
          PERFORMANCE
        </text>

        {/* Left — TORQUE */}
        <text x="26" y="210" textAnchor="middle"
          fill="#c10d19" fontFamily="'JetBrains Mono', monospace"
          fontSize="7" letterSpacing="1.5" fontWeight="bold"
        >
          TORQUE
        </text>
        <text x="26" y="228" textAnchor="middle"
          fill="#ffffff" fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="900" fontStyle="italic" fontSize="16"
        >
          {vehicle.torqueGain}
        </text>

        {/* Right — POTÊNCIA */}
        <text x="274" y="210" textAnchor="middle"
          fill="#c10d19" fontFamily="'JetBrains Mono', monospace"
          fontSize="7" letterSpacing="1.5" fontWeight="bold"
        >
          POTÊNCIA
        </text>
        <text x="274" y="228" textAnchor="middle"
          fill="#ffffff" fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="900" fontStyle="italic" fontSize="16"
        >
          {vehicle.powerGain}
        </text>
      </svg>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: RED, fontSize: '0.65rem', letterSpacing: '0.22em',
      fontWeight: 700, fontFamily: 'var(--pm-font-mono)',
      textTransform: 'uppercase', marginBottom: '0.75rem',
    }}>
      {children}
    </p>
  )
}

function BigHeadline({ children, size = '4.5rem', center = false }: {
  children: React.ReactNode
  size?: string
  center?: boolean
}) {
  return (
    <h2 style={{
      fontFamily: 'var(--pm-font-display)',
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: size,
      lineHeight: 0.93,
      letterSpacing: '-0.01em',
      textTransform: 'uppercase',
      color: 'hsl(var(--pm-gray-50))',
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </h2>
  )
}

function Red({ children }: { children: React.ReactNode }) {
  return <span style={{ color: RED }}>{children}</span>
}

// ─── NAVBAR ────────────────────────────────────────────────────────────────────
function Navbar({ onLogin, scrolled }: { onLogin: () => void; scrolled: boolean }) {
  const links = ['Serviços', 'Veículos', 'Como Funciona', 'Resultados', 'Sobre', 'Loja']

  return (
    <header
      className={`lp-nav${scrolled ? ' scrolled' : ''}`}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2.5rem', height: '60px',
      }}
    >
      {/* Logo */}
      <img
        src={logoUrl}
        alt="Injediesel System"
        style={{ height: '22px', width: 'auto', display: 'block' }}
      />

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: '2rem' }}>
        {links.map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(' ', '-')}`}
            className="lp-nav-link"
          >
            {l}
          </a>
        ))}
      </nav>

      <Button
        onClick={onLogin}
        className="lp-ripple lp-cta-btn uppercase"
        style={{ background: RED, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}
      >
        Analisar Veículo <ChevronRight size={14} />
      </Button>
    </header>
  )
}

// ─── HERO ──────────────────────────────────────────────────────────────────────
function HeroSection({
  onLogin, currentSlide, onPrev, onNext, onDot,
}: {
  onLogin: () => void
  currentSlide: number
  onPrev: () => void
  onNext: () => void
  onDot: (i: number) => void
}) {
  const vehicle = VEHICLE_DATA[currentSlide]

  return (
    <section
      id="serviços"
      style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '100px 2.5rem 3rem',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Carousel background slides */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={`lp-slide${i === currentSlide ? ' active' : ''}`}
          style={{ background: s.bg }}
        />
      ))}

      {/* Permanent dark overlay for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)',
        zIndex: 1,
      }} />

      {/* Watermark */}
      <div style={{
        position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)',
        fontSize: '22vw', fontFamily: 'var(--pm-font-display)', fontWeight: 900,
        fontStyle: 'italic', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.04)', userSelect: 'none', pointerEvents: 'none',
        lineHeight: 1, zIndex: 1,
      }}>
        ECU
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto', width: '100%',
        display: 'grid', gridTemplateColumns: '1fr 340px',
        gap: '4rem', alignItems: 'center', position: 'relative', zIndex: 2,
      }}>
        {/* Left */}
        <div>
          <Label>Remapeamento de Alta Performance</Label>

          {/* Animated headline */}
          <h2 style={{
            fontFamily: 'var(--pm-font-display)',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 'clamp(3.5rem, 7vw, 6.5rem)',
            lineHeight: 0.93,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}>
            <span className="lp-hero-word lp-hw-1" style={{ color: 'hsl(var(--pm-gray-50))' }}>
              Redefina{' '}
            </span>
            <span className="lp-hero-word lp-hw-2" style={{ color: 'hsl(var(--pm-gray-50))' }}>
              o{' '}
            </span>
            <br />
            <span className="lp-hero-word lp-hw-3" style={{ color: RED }}>
              Poder.
            </span>
          </h2>

          <p
            className="lp-hero-subtitle"
            style={{
              fontSize: '1rem', lineHeight: 1.7,
              marginTop: '1.5rem', maxWidth: '440px',
            }}
          >
            Reprogramação de ECU desenvolvida para extrair respostas mais rápidas,
            torque mais presente e uma condução muito mais viva.
          </p>

          <div
            className="lp-hero-cta"
            style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', alignItems: 'center' }}
          >
            <Button
              onClick={onLogin}
              size="lg"
              className="lp-ripple lp-cta-btn uppercase"
              style={{
                background: RED, fontWeight: 700, fontSize: '0.85rem',
                letterSpacing: '0.05em', height: '52px', paddingInline: '2rem',
              }}
            >
              Quero Mais Performance <ArrowRight size={16} />
            </Button>
            <button
              style={{
                color: 'hsl(var(--pm-gray-200))', fontSize: '0.875rem',
                fontWeight: 600, background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px',
              }}
            >
              Entender o Remap
            </button>
          </div>

          {/* Vehicle info — animated per slide */}
          <div
            key={`vinfo-${currentSlide}`}
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255,255,255,0.09)',
              animation: 'lp-fadeIn 0.45s ease-out',
            }}
          >
            <p style={{
              fontSize: '0.55rem', color: RED,
              letterSpacing: '0.22em', fontFamily: 'var(--pm-font-mono)',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem',
            }}>
              {vehicle.category}
            </p>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic', fontSize: '1.35rem', color: '#fff',
              textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.35rem',
            }}>
              {vehicle.name}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-300))', lineHeight: 1.5 }}>
              {vehicle.commercialCall}
            </p>
            <p style={{
              fontSize: '0.6rem', color: 'hsl(var(--pm-gray-500))', marginTop: '0.2rem',
              fontFamily: 'var(--pm-font-mono)', letterSpacing: '0.08em',
            }}>
              {vehicle.base}
            </p>
          </div>
        </div>

        {/* Performance gauge */}
        <HeroGauge key={currentSlide} vehicle={vehicle} />
      </div>

      {/* Bottom glass cards */}
      <div
        key={`bcards-${currentSlide}`}
        style={{
          position: 'absolute', bottom: '80px',
          left: '0', right: '0',
          display: 'flex', justifyContent: 'center',
          gap: '0.6rem', zIndex: 3,
          padding: '0 2.5rem',
          animation: 'lp-fadeIn 0.5s ease-out 0.15s both',
        }}
      >
        {([
          { label: 'Base',        value: vehicle.base,               wide: true  },
          { label: 'Potência',    value: vehicle.powerGain,          wide: false },
          { label: 'Torque',      value: vehicle.torqueGain,         wide: false },
          { label: 'Performance', value: vehicle.estimatedImprovement, wide: false },
        ] as { label: string; value: string; wide: boolean }[]).map((card) => (
          <div
            key={card.label}
            style={{
              flex: card.wide ? '1.8' : '1',
              minWidth: 0,
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              width: '30%', height: '2px', background: RED,
            }} />
            <p style={{
              fontSize: '0.52rem', color: RED,
              letterSpacing: '0.18em', fontFamily: 'var(--pm-font-mono)',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem',
            }}>
              {card.label}
            </p>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic',
              fontSize: card.wide ? '0.85rem' : '1.1rem',
              color: '#fff', lineHeight: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Carousel controls */}
      <div style={{
        position: 'absolute', bottom: '2rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 3,
      }}>
        <button className="lp-arrow" onClick={onPrev} aria-label="Slide anterior">
          <ChevronLeft size={16} />
        </button>

        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`lp-dot${i === currentSlide ? ' active' : ''}`}
            onClick={() => onDot(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}

        <button className="lp-arrow" onClick={onNext} aria-label="Próximo slide">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Current slide label */}
      <div style={{
        position: 'absolute', bottom: '2.1rem', right: '2.5rem',
        fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--pm-font-mono)', zIndex: 3,
      }}>
        {String(currentSlide + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} — {SLIDES[currentSlide].label}
      </div>
    </section>
  )
}

// ─── STATS BAR ─────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { icon: TrendingUp,    label: 'Mais Potência',    value: '+20 cv*',      note: 'ganhos sob medida' },
    { icon: Activity,      label: 'Mais Torque',      value: '+5 kgf.m*',    note: 'força em baixa e retomada' },
    { icon: Gauge,         label: 'Resposta Aprox.',  value: '+Agilidade',   note: 'aceleração mais pronta' },
    { icon: Fuel,          label: 'Economia Otimiz.', value: 'até 10%*',     note: 'em uso adequado e calibrado' },
    { icon: Settings2,     label: 'Mapeamento',       value: '100% custom',  note: 'calibrações para cada aplicação' },
    { icon: ShieldCheck,   label: 'Segurança Téc.',   value: 'Controle',     note: 'performance com responsabilidade' },
  ]

  return (
    <section style={{ background: 'hsl(222 8% 5%)', borderBlock: `1px solid ${BORDER}`, padding: '2.5rem' }}>
      <div
        className="lp-stagger"
        style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem',
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="lp-observe" style={{ textAlign: 'center' }}>
            <s.icon size={18} style={{ color: RED, margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{
              fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: RED, fontFamily: 'var(--pm-font-mono)', marginBottom: '0.25rem',
            }}>
              {s.label}
            </p>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', lineHeight: 1,
            }}>
              {s.value}
            </p>
            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.2rem' }}>
              {s.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── COMO FUNCIONA ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Diagnóstico',     desc: 'Entendemos veículo, objetivo, aplicação e sintomas.' },
    { n: '02', title: 'Leitura ECU/TCU', desc: 'O arquivo original é lido e analisado tecnicamente.' },
    { n: '03', title: 'Calibração',      desc: 'Criamos um mapa personalizado conforme objetivo e limites.' },
    { n: '04', title: 'Validação',       desc: 'Conferimos parâmetros, consistência e segurança da calibração.' },
    { n: '05', title: 'Entrega',         desc: 'O arquivo final é entregue pronto para aplicação.' },
  ]

  return (
    <section id="como-funciona" style={{ background: DARK, padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="lp-observe" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Label>Processo Técnico</Label>
          <BigHeadline center size="clamp(2.5rem, 5vw, 4rem)">
            Como funciona a <Red>Calibração</Red>
          </BigHeadline>
          <p style={{ color: 'hsl(var(--pm-gray-400))', marginTop: '1rem', fontSize: '0.9rem' }}>
            Do diagnóstico à entrega, cada etapa é pensada para garantir precisão, rastreabilidade e segurança técnica total.
          </p>
        </div>
        <div className="lp-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
          {steps.map((s) => (
            <div
              key={s.n}
              className="lp-observe"
              style={{
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderLeft: `3px solid ${RED}`,
                borderRadius: '12px', padding: '1.5rem 1.25rem',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'hsl(var(--pm-red-500) / 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <Cpu size={18} style={{ color: RED }} />
              </div>
              <p style={{
                fontSize: '0.6rem', color: RED, fontFamily: 'var(--pm-font-mono)',
                letterSpacing: '0.2em', marginBottom: '0.5rem', fontWeight: 700,
              }}>
                PASSO {s.n}
              </p>
              <p style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                fontSize: '1.05rem', textTransform: 'uppercase', color: '#fff',
                marginBottom: '0.5rem',
              }}>
                {s.title}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── VEÍCULOS ──────────────────────────────────────────────────────────────────
function VehiclesSection() {
  const vehicles = [
    { label: 'Carros',   bg: 'hsl(222 8% 13%)' },
    { label: 'Pickups',  bg: 'hsl(222 8% 11%)' },
    { label: 'Trucks',   bg: 'hsl(222 8% 9%)' },
    { label: 'Agrícola', bg: 'hsl(222 8% 12%)' },
    { label: 'Máquinas', bg: 'hsl(222 8% 10%)' },
    { label: 'Motos',    bg: 'hsl(222 8% 8%)' },
  ]

  return (
    <section id="veículos" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="lp-observe" style={{ marginBottom: '3rem' }}>
          <Label>Soluções por Aplicação</Label>
          <BigHeadline size="clamp(2.5rem, 5vw, 4rem)">
            Performance para <Red>todos os tipos</Red> de máquinas
          </BigHeadline>
        </div>
        <div
          className="lp-stagger"
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 180px)', gap: '1rem',
          }}
        >
          {vehicles.map((v, i) => (
            <div
              key={v.label}
              className="lp-observe lp-vehicle-card"
              style={{
                background: v.bg,
                border: `1px solid ${BORDER}`,
                borderRadius: '12px', padding: '1.5rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                ...(i === 0 ? { gridRow: 'span 2' } : {}),
              }}
            >
              <div style={{
                position: 'absolute', top: '1rem', left: '1rem',
                width: '4px', height: '24px', background: RED, borderRadius: '2px',
              }} />
              <p style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 900,
                fontSize: '1.5rem', textTransform: 'uppercase',
                fontStyle: 'italic', color: '#fff', marginBottom: '0.5rem',
              }}>
                {v.label}
              </p>
              <p style={{
                fontSize: '0.65rem', color: RED, fontWeight: 700,
                letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                VER SOLUÇÕES <ArrowRight size={10} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── LOJA VIRTUAL ──────────────────────────────────────────────────────────────
function LojaSection() {
  const categories = [
    {
      icon: Zap,
      title: 'Pro Booster',
      desc: 'Módulos de potência com bluetooth e app dedicado. Diversos modos de condução.',
      price: 'A partir de R$ 890',
      badge: 'MAIS VENDIDO',
    },
    {
      icon: Cpu,
      title: 'Piggy Back',
      desc: 'Módulos de interceptação para ajuste de sinal do sensor de pressão.',
      price: 'A partir de R$ 1.200',
      badge: 'TÉCNICO',
    },
    {
      icon: Wrench,
      title: 'Filtros de Ar',
      desc: 'Filtros de alto fluxo para aumentar a eficiência da admissão de ar.',
      price: 'A partir de R$ 280',
      badge: 'ACESSÓRIO',
    },
    {
      icon: FlameKindling,
      title: 'Downpipe',
      desc: 'Tubulações de escapamento para reduzir restrição e liberar performance.',
      price: 'A partir de R$ 1.800',
      badge: 'PERFORMANCE',
    },
    {
      icon: Fuel,
      title: 'Filtros de Combustível',
      desc: 'Filtros de alta precisão (5 micras) para proteção e eficiência do motor.',
      price: 'A partir de R$ 195',
      badge: 'PROTEÇÃO',
    },
    {
      icon: Settings2,
      title: 'Man. e Acessórios',
      desc: 'Peças de reposição e acessórios para manutenção dos módulos Injediesel.',
      price: 'A partir de R$ 60',
      badge: 'REPOSIÇÃO',
    },
  ]

  return (
    <section id="loja" style={{ background: DARK, padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div className="lp-observe">
            <Label>Loja Virtual</Label>
            <BigHeadline size="clamp(2.5rem, 5vw, 4rem)">
              Produtos <Red>Injediesel</Red><br />para sua máquina
            </BigHeadline>
          </div>
          <a
            href="/appmax"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: RED, fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Ver catálogo completo <ArrowRight size={14} />
          </a>
        </div>

        <div className="lp-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {categories.map((c) => (
            <div
              key={c.title}
              className="lp-observe lp-product-card"
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: '12px', padding: '1.5rem',
                position: 'relative', overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <span style={{
                position: 'absolute', top: '1rem', right: '1rem',
                fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.15em',
                padding: '3px 8px', borderRadius: '4px',
                background: 'hsl(var(--pm-red-500) / 0.12)',
                color: RED, fontFamily: 'var(--pm-font-mono)',
              }}>
                {c.badge}
              </span>

              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: 'hsl(var(--pm-red-500) / 0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <c.icon size={22} style={{ color: RED }} />
              </div>

              <h3 style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                fontSize: '1.1rem', textTransform: 'uppercase', fontStyle: 'italic',
                color: '#fff', marginBottom: '0.5rem',
              }}>
                {c.title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {c.desc}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{c.price}</span>
                <span style={{ fontSize: '0.65rem', color: RED, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  VER PRODUTOS <ArrowRight size={10} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '2.5rem', padding: '2rem', borderRadius: '12px',
          background: 'hsl(var(--pm-red-500) / 0.06)',
          border: `1px solid hsl(var(--pm-red-500) / 0.2)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 800,
              fontSize: '1.2rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff',
            }}>
              539 produtos disponíveis no catálogo completo
            </p>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.25rem' }}>
              Preços especiais para franqueados parceiros Injediesel System
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            <Button variant="outline" className="lp-ripple" style={{ borderColor: BORDER, fontSize: '0.75rem' }}>
              <ShoppingBag size={14} className="mr-2" /> Ver Catálogo
            </Button>
            <Button className="lp-ripple lp-cta-btn" style={{ background: RED, fontSize: '0.75rem', fontWeight: 700 }}>
              Seja Parceiro <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── RESULTADOS ────────────────────────────────────────────────────────────────
function ResultsSection() {
  const bars = [
    { label: 'Potência',   pct: '+40%', before: 'ORIGINAL',   after: 'OTIMIZADA' },
    { label: 'Torque',     pct: '+35%', before: 'LIMITADO',   after: 'MAIS PRESENTE' },
    { label: 'Resposta',   pct: '+70%', before: 'LENTA',      after: 'MAIS DIRETA' },
    { label: 'Eficiência', pct: '+14%', before: 'PADRÃO',     after: 'OTIMIZADO' },
  ]

  return (
    <section id="resultados" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5rem', alignItems: 'center',
      }}>
        <div className="lp-observe">
          <Label>Resultado Mensurável</Label>
          <BigHeadline size="clamp(2rem, 4vw, 3.5rem)">
            Mais que potência:<br /><Red>Comportamento</Red><br />transformado
          </BigHeadline>
          <p style={{
            color: 'hsl(var(--pm-gray-400))', fontSize: '0.875rem',
            lineHeight: 1.7, marginTop: '1.5rem', marginBottom: '2.5rem',
          }}>
            A calibração certa muda a forma como o veículo responde em cada troca, em cada retomada.
            O foco é entregar o equilíbrio perfeito entre performance, segurança e aplicação real.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {bars.map((b) => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--pm-gray-300))' }}>
                    {b.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: RED }}>
                    {b.pct} DE EVOLUÇÃO*
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                  <div style={{ flex: 1, background: 'hsl(var(--pm-gray-700))', borderRadius: '3px' }}>
                    <div style={{ width: '40%', height: '100%', background: 'hsl(var(--pm-gray-500))', borderRadius: '3px' }} />
                  </div>
                  <div style={{ flex: 1, background: 'hsl(var(--pm-gray-700))', borderRadius: '3px' }}>
                    <div style={{ width: '100%', height: '100%', background: RED, borderRadius: '3px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span style={{ fontSize: '0.55rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.1em' }}>{b.before}</span>
                  <span style={{ fontSize: '0.55rem', color: RED, letterSpacing: '0.1em' }}>{b.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="lp-observe"
          style={{
            background: 'hsl(var(--pm-gray-900))', border: `1px solid ${BORDER}`,
            borderRadius: '16px', padding: '2rem', fontFamily: 'var(--pm-font-mono)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <p style={{ fontSize: '0.65rem', color: RED, letterSpacing: '0.2em' }}>INJEDIESEL DATA ANALYTICS</p>
            <span style={{
              fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px',
              background: 'hsl(var(--pm-green-400) / 0.12)',
              color: 'hsl(var(--pm-green-400))', letterSpacing: '0.1em',
            }}>SYSTEM_STABLE</span>
          </div>
          <p style={{
            fontFamily: 'var(--pm-font-display)', fontWeight: 900,
            fontStyle: 'italic', fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem',
          }}>
            DIAGNOSTIC_REPORT
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>ENGINE_LOAD</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>92%</p>
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>PEAK_BOOST</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 900, color: RED, lineHeight: 1 }}>2.4 BAR</p>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>TORQUE_CURVE_PREVIEW</p>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '48px' }}>
              {[30, 45, 55, 60, 70, 80, 85, 90, 95, 100, 98, 96].map((h, i) => (
                <div key={i} style={{ flex: 1, background: RED, borderRadius: '2px', height: `${h}%`, opacity: 0.7 + i * 0.025 }} />
              ))}
            </div>
          </div>
          <div style={{
            marginTop: '1.5rem', textAlign: 'center', padding: '1rem',
            background: 'hsl(var(--pm-red-500) / 0.1)', borderRadius: '8px',
            border: `1px solid hsl(var(--pm-red-500) / 0.3)`,
          }}>
            <p style={{
              fontSize: '2rem', fontWeight: 900, color: RED,
              fontFamily: 'var(--pm-font-display)', fontStyle: 'italic',
            }}>+100%</p>
            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.15em' }}>CUSTOM TUNING</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── NÚMEROS ───────────────────────────────────────────────────────────────────
function NumbersSection() {
  const nums = [
    { value: '+15 mil',   label: 'Veículos Recalibrados' },
    { value: '+10 anos',  label: 'de Experiência em Performance' },
    { value: '+50 marcas', label: 'e centenas de modelos' },
    { value: '100%',      label: 'Mapeamento Personalizado' },
  ]

  return (
    <section style={{ background: DARK, padding: '5rem 2.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        fontSize: '18vw', fontFamily: 'var(--pm-font-display)', fontWeight: 900,
        fontStyle: 'italic', textTransform: 'uppercase',
        color: 'hsl(var(--pm-gray-800) / 0.25)', userSelect: 'none', pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        MAXIMA
      </div>
      <div
        className="lp-stagger"
        style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem', position: 'relative',
        }}
      >
        {nums.map((n) => (
          <div key={n.label} className="lp-observe" style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#fff', lineHeight: 1,
            }}>
              {n.value}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.5rem', lineHeight: 1.4 }}>
              {n.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── SOBRE / FEATURES ──────────────────────────────────────────────────────────
function AboutSection() {
  const features = [
    { icon: Settings2,   title: 'Calibração sob Medida',  desc: 'Mapas ajustados exclusivamente para o veículo e objetivo do cliente.' },
    { icon: ShieldCheck, title: 'Foco em Segurança',      desc: 'Ganhos reais respeitando rigorosamente os limites mecânicos e térmicos.' },
    { icon: Headphones,  title: 'Atendimento Consultivo', desc: 'Análise antes da promessa. Técnica antes da venda. Transparência total.' },
    { icon: LayoutGrid,  title: 'Ampla Aplicação',        desc: 'Soluções testadas para veículos leves, pesados, máquinas agrícolas e motos.' },
    { icon: Cpu,         title: 'Tecnologia Aplicada',    desc: 'Processos digitais, rastreáveis e orientados por dados de telemetria.' },
    { icon: Star,        title: 'Experiência Premium',    desc: 'Uma jornada técnica e visual compatível com o alto nível da sua máquina.' },
  ]

  return (
    <section id="sobre" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="lp-observe" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Label>Autoridade Técnica</Label>
          <BigHeadline center size="clamp(2.5rem, 5vw, 4rem)">
            Performance não é chute.<br /><Red>É Calibração.</Red>
          </BigHeadline>
          <p style={{
            color: 'hsl(var(--pm-gray-400))', marginTop: '1rem', fontSize: '0.875rem',
            maxWidth: '520px', margin: '1rem auto 0',
          }}>
            A Injediesel System combina conhecimento técnico, método, leitura de dados e foco em resultado
            real para entregar uma experiência de performance confiável.
          </p>
        </div>
        <div className="lp-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="lp-observe"
              style={{
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderLeft: `3px solid ${RED}`,
                borderRadius: '12px', padding: '1.75rem',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                background: 'hsl(var(--pm-red-500) / 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <f.icon size={20} style={{ color: RED }} />
              </div>
              <p style={{
                fontSize: '0.6rem', color: RED, fontFamily: 'var(--pm-font-mono)',
                letterSpacing: '0.2em', marginBottom: '0.5rem', fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                FEATURE
              </p>
              <p style={{
                fontFamily: 'var(--pm-font-display)', fontWeight: 800,
                fontSize: '1rem', textTransform: 'uppercase', fontStyle: 'italic',
                color: '#fff', marginBottom: '0.5rem',
              }}>
                {f.title}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA / CONTATO ─────────────────────────────────────────────────────────────
function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="contato" style={{ background: RED, padding: '6rem 2.5rem' }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 360px',
        gap: '4rem', alignItems: 'center',
      }}>
        <div className="lp-observe">
          <BigHeadline size="clamp(2.5rem, 5vw, 4.5rem)">
            <span style={{ color: '#fff' }}>Seu veículo pode</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.55)' }}>entregar mais.</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.4)' }}>A gente sabe</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.3)' }}>como desbloquear.</span>
          </BigHeadline>
          <p style={{
            color: 'hsl(0 0% 100% / 0.75)', fontSize: '0.9rem',
            lineHeight: 1.7, marginTop: '1.5rem', maxWidth: '420px',
          }}>
            Solicite uma análise técnica e descubra o potencial real da sua máquina
            com segurança, método e performance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', alignItems: 'center' }}>
            <Button
              onClick={onLogin}
              className="lp-ripple uppercase"
              style={{
                background: '#000', color: '#fff', fontWeight: 700,
                fontSize: '0.8rem', letterSpacing: '0.08em',
                height: '48px', paddingInline: '1.5rem',
              }}
            >
              Seja um Parceiro Tuner <ArrowRight size={14} />
            </Button>
            <button style={{
              color: '#fff', fontSize: '0.8rem', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '6px', fontWeight: 600,
            }}>
              <Phone size={14} /> Falar com Especialista
            </button>
          </div>
        </div>

        <div
          className="lp-observe"
          style={{
            background: 'hsl(222 8% 8%)', borderRadius: '16px',
            padding: '2rem', fontFamily: 'var(--pm-font-mono)',
          }}
        >
          <p style={{ fontSize: '0.6rem', color: RED, letterSpacing: '0.25em', marginBottom: '1.5rem' }}>CONTACT_CENTER</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { icon: Mail,   label: 'E-MAIL',        value: 'contato@injediesel.com.br' },
              { icon: Phone,  label: 'WHATSAPP',       value: '+55 (11) 99999-9999' },
              { icon: MapPin, label: 'UNIDADE MATRIZ', value: 'São Paulo, SP' },
            ].map((c) => (
              <div key={c.label}>
                <p style={{ fontSize: '0.55rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                  {c.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <c.icon size={14} style={{ color: RED, flexShrink: 0 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#000', padding: '4rem 2.5rem 2rem', borderTop: `1px solid hsl(var(--pm-gray-800))` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{
              fontFamily: 'var(--pm-font-display)', fontWeight: 900,
              fontSize: '1.1rem', letterSpacing: '0.06em',
              color: 'hsl(var(--pm-gray-600))', marginBottom: '1rem',
            }}>
              INJEDIESEL SYSTEM PERFORMANCE
            </div>
            <p style={{
              fontSize: '0.75rem', color: 'hsl(var(--pm-gray-500))',
              lineHeight: 1.7, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Desempenho real. Resultados reais.<br />
              A excelência técnica em remapeamento<br />e performance automotiva.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              {['IN', 'FA', 'YO'].map((s) => (
                <div key={s} style={{
                  width: '36px', height: '36px',
                  background: 'hsl(var(--pm-gray-850))',
                  border: `1px solid hsl(var(--pm-gray-700))`,
                  borderRadius: '6px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
                  color: 'hsl(var(--pm-gray-400))', cursor: 'pointer',
                  fontFamily: 'var(--pm-font-mono)',
                }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.65rem', color: RED, letterSpacing: '0.2em', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--pm-font-mono)' }}>
              PERFORMANCE
            </p>
            {['Stage 1 & 2', 'Custom Tuning', 'Dyno Test', 'Track Day'].map((l) => (
              <p key={l} style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-500))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', cursor: 'pointer' }}>
                {l}
              </p>
            ))}
          </div>

          <div>
            <p style={{ fontSize: '0.65rem', color: RED, letterSpacing: '0.2em', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--pm-font-mono)' }}>
              NAVEGAÇÃO
            </p>
            {['Serviços', 'Veículos', 'Como Funciona', 'Loja Virtual', 'Contato'].map((l) => (
              <p key={l} style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-500))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', cursor: 'pointer' }}>
                {l}
              </p>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: `1px solid hsl(var(--pm-gray-900))`, paddingTop: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            © 2026 INJEDIESEL SYSTEM. TODOS OS DIREITOS RESERVADOS.
          </p>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            POWERED BY <strong style={{ color: 'hsl(var(--pm-gray-400))' }}>INJEDIESEL GROUP</strong>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { playAndNavigate } = useTunerSplash()
  const login = () => playAndNavigate({ href: '/login', variant: 'auth', minDuration: 1700, navigationDelay: 920 })

  const [currentSlide, setCurrentSlide] = useState(0)
  const [navScrolled, setNavScrolled] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goPrev = () => setCurrentSlide(i => (i - 1 + SLIDES.length) % SLIDES.length)
  const goNext = () => setCurrentSlide(i => (i + 1) % SLIDES.length)
  const goDot  = (i: number) => setCurrentSlide(i)

  /* Reset autoplay on manual navigation */
  const resetAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(goNext, 5000)
  }

  const handlePrev = () => { goPrev(); resetAutoplay() }
  const handleNext = () => { goNext(); resetAutoplay() }
  const handleDot  = (i: number) => { goDot(i); resetAutoplay() }

  useEffect(() => {
    /* ── Carousel autoplay ── */
    intervalRef.current = setInterval(() => {
      setCurrentSlide(i => (i + 1) % SLIDES.length)
    }, 5000)

    /* ── Sticky nav scroll detection ── */
    const onScroll = () => setNavScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })

    /* ── IntersectionObserver for scroll animations ── */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    document.querySelectorAll('.lp-observe').forEach(el => observer.observe(el))

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <div style={{ background: DARK, minHeight: '100vh' }}>
      <Navbar onLogin={login} scrolled={navScrolled} />
      <HeroSection
        onLogin={login}
        currentSlide={currentSlide}
        onPrev={handlePrev}
        onNext={handleNext}
        onDot={handleDot}
      />
      <StatsBar />
      <HowItWorks />
      <VehiclesSection />
      <LojaSection />
      <ResultsSection />
      <NumbersSection />
      <AboutSection />
      <CTASection onLogin={login} />
      <Footer />
    </div>
  )
}
