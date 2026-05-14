import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, Gauge, TrendingUp, Activity, Fuel,
  LayoutGrid, ShieldCheck, Settings2, Headphones,
  Wrench, Cpu, FlameKindling, ShoppingBag, ArrowRight,
  Star, Phone, Mail, MapPin, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const RED = 'hsl(var(--pm-red-500))'
const DARK = 'hsl(var(--pm-gray-950))'
const CARD_BG = 'hsl(var(--pm-gray-900))'
const BORDER = 'hsl(var(--pm-gray-700))'

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

// ─── NAVBAR ────────────────────────────────────────────────────────────────
function Navbar({ onLogin }: { onLogin: () => void }) {
  const links = ['Serviços', 'Veículos', 'Como Funciona', 'Resultados', 'Sobre', 'Loja']

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'hsl(var(--pm-gray-950) / 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2.5rem', height: '60px',
    }}>
      {/* Logo */}
      <div style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.04em', lineHeight: 1 }}>
        <span style={{ color: RED }}>PRO</span>
        <span style={{ color: '#fff' }}>MAX</span>
        <span style={{ color: RED, marginLeft: '3px' }}>TUNER</span>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'hsl(var(--pm-gray-400))', fontWeight: 400, fontStyle: 'normal', marginTop: '1px' }}>
          PERFORMANCE
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: '2rem' }}>
        {links.map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(' ', '-')}`}
            style={{
              fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'hsl(var(--pm-gray-300))',
              textDecoration: 'none', transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = RED)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--pm-gray-300))')}
          >
            {l}
          </a>
        ))}
      </nav>

      <Button
        onClick={onLogin}
        style={{ background: RED, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}
        className="uppercase"
      >
        Analisar Veículo <ChevronRight size={14} />
      </Button>
    </header>
  )
}

// ─── HERO ──────────────────────────────────────────────────────────────────
function HeroSection({ onLogin }: { onLogin: () => void }) {
  const kpis = [
    { label: 'Potência',  value: '+20 cv',    note: 'ATÉ +20 CV*' },
    { label: 'Torque',    value: '+5 kgf.m',  note: 'ATÉ +5 KGF.M*' },
    { label: 'Resposta',  value: 'Agilidade', note: 'MAIS DIRETA' },
  ]

  return (
    <section id="serviços" style={{
      minHeight: '100vh',
      background: `linear-gradient(105deg, hsl(222 8% 5%) 0%, hsl(222 8% 10%) 50%, hsl(0 40% 8%) 100%)`,
      display: 'flex', alignItems: 'center',
      padding: '100px 2.5rem 3rem',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Watermark */}
      <div style={{
        position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)',
        fontSize: '22vw', fontFamily: 'var(--pm-font-display)', fontWeight: 900,
        fontStyle: 'italic', textTransform: 'uppercase',
        color: 'hsl(var(--pm-gray-800) / 0.3)', userSelect: 'none', pointerEvents: 'none',
        lineHeight: 1,
      }}>
        ECU
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '4rem', alignItems: 'center' }}>
        {/* Left */}
        <div>
          <Label>Remapeamento de Alta Performance</Label>
          <BigHeadline size="clamp(3.5rem, 7vw, 6.5rem)">
            Redefina o<br /><Red>Poder.</Red>
          </BigHeadline>
          <p style={{ color: 'hsl(var(--pm-gray-300))', fontSize: '1rem', lineHeight: 1.7, marginTop: '1.5rem', maxWidth: '440px' }}>
            Reprogramação de ECU desenvolvida para extrair respostas mais rápidas,
            torque mais presente e uma condução muito mais viva.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', alignItems: 'center' }}>
            <Button
              onClick={onLogin}
              size="lg"
              style={{ background: RED, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', height: '52px', paddingInline: '2rem' }}
              className="uppercase"
            >
              Quero Mais Performance <ArrowRight size={16} />
            </Button>
            <button
              style={{ color: 'hsl(var(--pm-gray-200))', fontSize: '0.875rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}
            >
              Entender o Remap
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: 'hsl(var(--pm-gray-900) / 0.85)',
              border: `1px solid ${BORDER}`,
              borderRadius: '12px', padding: '1.25rem 1.5rem',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, marginBottom: '0.25rem', fontFamily: 'var(--pm-font-mono)' }}>
                {k.label}
              </p>
              <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '2rem', color: '#fff', lineHeight: 1 }}>
                {k.value}
              </p>
              <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.25rem', letterSpacing: '0.1em', fontFamily: 'var(--pm-font-mono)' }}>
                {k.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── STATS BAR ─────────────────────────────────────────────────────────────
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <s.icon size={18} style={{ color: RED, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, fontFamily: 'var(--pm-font-mono)', marginBottom: '0.25rem' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', lineHeight: 1 }}>
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

// ─── COMO FUNCIONA ─────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Diagnóstico',    desc: 'Entendemos veículo, objetivo, aplicação e sintomas.' },
    { n: '02', title: 'Leitura ECU/TCU', desc: 'O arquivo original é lido e analisado tecnicamente.' },
    { n: '03', title: 'Calibração',     desc: 'Criamos um mapa personalizado conforme objetivo e limites.' },
    { n: '04', title: 'Validação',      desc: 'Conferimos parâmetros, consistência e segurança da calibração.' },
    { n: '05', title: 'Entrega',        desc: 'O arquivo final é entregue pronto para aplicação.' },
  ]

  return (
    <section id="como-funciona" style={{ background: DARK, padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Label>Processo Técnico</Label>
          <BigHeadline center size="clamp(2.5rem, 5vw, 4rem)">
            Como funciona a <Red>Calibração</Red>
          </BigHeadline>
          <p style={{ color: 'hsl(var(--pm-gray-400))', marginTop: '1rem', fontSize: '0.9rem' }}>
            Do diagnóstico à entrega, cada etapa é pensada para garantir precisão, rastreabilidade e segurança técnica total.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
          {steps.map((s) => (
            <div key={s.n} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`,
              borderRadius: '12px', padding: '1.5rem 1.25rem',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'hsl(var(--pm-red-500) / 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <Cpu size={18} style={{ color: RED }} />
              </div>
              <p style={{ fontSize: '0.6rem', color: RED, fontFamily: 'var(--pm-font-mono)', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
                PASSO {s.n}
              </p>
              <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 800, fontSize: '1.05rem', textTransform: 'uppercase', color: '#fff', marginBottom: '0.5rem' }}>
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

// ─── VEÍCULOS ──────────────────────────────────────────────────────────────
function VehiclesSection() {
  const vehicles = [
    { label: 'Carros',    span: 'col-span-2 row-span-2', bg: 'hsl(222 8% 13%)' },
    { label: 'Pickups',   span: '',                       bg: 'hsl(222 8% 11%)' },
    { label: 'Trucks',    span: '',                       bg: 'hsl(222 8% 9%)' },
    { label: 'Agrícola',  span: '',                       bg: 'hsl(222 8% 12%)' },
    { label: 'Máquinas',  span: '',                       bg: 'hsl(222 8% 10%)' },
    { label: 'Motos',     span: '',                       bg: 'hsl(222 8% 8%)' },
  ]

  return (
    <section id="veículos" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <Label>Soluções por Aplicação</Label>
          <BigHeadline size="clamp(2.5rem, 5vw, 4rem)">
            Performance para <Red>todos os tipos</Red> de máquinas
          </BigHeadline>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 180px)', gap: '1rem' }}>
          {vehicles.map((v, i) => (
            <div
              key={v.label}
              style={{
                background: v.bg,
                border: `1px solid ${BORDER}`,
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                ...(i === 0 ? { gridColumn: 'span 1', gridRow: 'span 2' } : {}),
              }}
            >
              <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff', marginBottom: '0.5rem' }}>
                {v.label}
              </p>
              <p style={{ fontSize: '0.65rem', color: RED, fontWeight: 700, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                VER SOLUÇÕES <ArrowRight size={10} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── LOJA VIRTUAL ──────────────────────────────────────────────────────────
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
      desc: 'Peças de reposição e acessórios para manutenção dos módulos Promax.',
      price: 'A partir de R$ 60',
      badge: 'REPOSIÇÃO',
    },
  ]

  return (
    <section id="loja" style={{ background: DARK, padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <Label>Loja Virtual</Label>
            <BigHeadline size="clamp(2.5rem, 5vw, 4rem)">
              Produtos <Red>Promax</Red><br />para sua máquina
            </BigHeadline>
          </div>
          <a
            href="/login"
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {categories.map((c) => (
            <div
              key={c.title}
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: '12px', padding: '1.5rem',
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 200ms',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = RED)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = BORDER)}
            >
              {/* Badge */}
              <span style={{
                position: 'absolute', top: '1rem', right: '1rem',
                fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.15em',
                padding: '3px 8px', borderRadius: '4px',
                background: 'hsl(var(--pm-red-500) / 0.12)',
                color: RED, fontFamily: 'var(--pm-font-mono)',
              }}>
                {c.badge}
              </span>

              {/* Icon */}
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

        {/* Store CTA */}
        <div style={{
          marginTop: '2.5rem', padding: '2rem', borderRadius: '12px',
          background: 'hsl(var(--pm-red-500) / 0.06)',
          border: `1px solid hsl(var(--pm-red-500) / 0.2)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff' }}>
              539 produtos disponíveis no catálogo completo
            </p>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--pm-gray-400))', marginTop: '0.25rem' }}>
              Preços especiais para franqueados parceiros Promax Tuner
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            <Button variant="outline" style={{ borderColor: BORDER, fontSize: '0.75rem' }}>
              <ShoppingBag size={14} className="mr-2" /> Ver Catálogo
            </Button>
            <Button style={{ background: RED, fontSize: '0.75rem', fontWeight: 700 }}>
              Seja Parceiro <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── RESULTADOS ────────────────────────────────────────────────────────────
function ResultsSection() {
  const bars = [
    { label: 'Potência',   pct: '+40%', before: 'ORIGINAL', after: 'OTIMIZADA' },
    { label: 'Torque',     pct: '+35%', before: 'LIMITADO', after: 'MAIS PRESENTE' },
    { label: 'Resposta',   pct: '+70%', before: 'LENTA', after: 'MAIS DIRETA' },
    { label: 'Eficiência', pct: '+14%', before: 'PADRÃO', after: 'OTIMIZADO' },
  ]

  return (
    <section id="resultados" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
        {/* Left */}
        <div>
          <Label>Resultado Mensurável</Label>
          <BigHeadline size="clamp(2rem, 4vw, 3.5rem)">
            Mais que potência:<br /><Red>Comportamento</Red><br />transformado
          </BigHeadline>
          <p style={{ color: 'hsl(var(--pm-gray-400))', fontSize: '0.875rem', lineHeight: 1.7, marginTop: '1.5rem', marginBottom: '2.5rem' }}>
            A calibração certa muda a forma como o veículo responde em cada troca, em cada retomada. O foco é entregar o equilíbrio perfeito entre performance, segurança e aplicação real.
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

        {/* Right — terminal card */}
        <div style={{
          background: 'hsl(var(--pm-gray-900))', border: `1px solid ${BORDER}`,
          borderRadius: '16px', padding: '2rem', fontFamily: 'var(--pm-font-mono)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <p style={{ fontSize: '0.65rem', color: RED, letterSpacing: '0.2em' }}>PROMAX DATA ANALYTICS</p>
            <span style={{
              fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px',
              background: 'hsl(var(--pm-green-400) / 0.12)',
              color: 'hsl(var(--pm-green-400))', letterSpacing: '0.1em',
            }}>SYSTEM_STABLE</span>
          </div>
          <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem' }}>
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
          <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', background: 'hsl(var(--pm-red-500) / 0.1)', borderRadius: '8px', border: `1px solid hsl(var(--pm-red-500) / 0.3)` }}>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: RED, fontFamily: 'var(--pm-font-display)', fontStyle: 'italic' }}>+100%</p>
            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--pm-gray-400))', letterSpacing: '0.15em' }}>CUSTOM TUNING</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── NÚMEROS ───────────────────────────────────────────────────────────────
function NumbersSection() {
  const nums = [
    { value: '+15 mil',  label: 'Veículos Recalibrados' },
    { value: '+10 anos', label: 'de Experiência em Performance' },
    { value: '+50 marcas', label: 'e centenas de modelos' },
    { value: '100%',     label: 'Mapeamento Personalizado' },
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', position: 'relative' }}>
        {nums.map((n) => (
          <div key={n.label} style={{ textAlign: 'center' }}>
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

// ─── SOBRE / FEATURES ──────────────────────────────────────────────────────
function AboutSection() {
  const features = [
    { icon: Settings2,   title: 'Calibração sob Medida',  desc: 'Mapas ajustados exclusivamente para o veículo e objetivo do cliente.' },
    { icon: ShieldCheck, title: 'Foco em Segurança',       desc: 'Ganhos reais respeitando rigorosamente os limites mecânicos e térmicos.' },
    { icon: Headphones,  title: 'Atendimento Consultivo',  desc: 'Análise antes da promessa. Técnica antes da venda. Transparência total.' },
    { icon: LayoutGrid,  title: 'Ampla Aplicação',         desc: 'Soluções testadas para veículos leves, pesados, máquinas agrícolas e motos.' },
    { icon: Cpu,         title: 'Tecnologia Aplicada',     desc: 'Processos digitais, rastreáveis e orientados por dados de telemetria.' },
    { icon: Star,        title: 'Experiência Premium',     desc: 'Uma jornada técnica e visual compatível com o alto nível da sua máquina.' },
  ]

  return (
    <section id="sobre" style={{ background: 'hsl(222 8% 5%)', padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <Label>Autoridade Técnica</Label>
          <BigHeadline center size="clamp(2.5rem, 5vw, 4rem)">
            Performance não é chute.<br /><Red>É Calibração.</Red>
          </BigHeadline>
          <p style={{ color: 'hsl(var(--pm-gray-400))', marginTop: '1rem', fontSize: '0.875rem', maxWidth: '520px', margin: '1rem auto 0' }}>
            A Promax Tuner combina conhecimento técnico, método, leitura de dados e foco em resultado real para entregar uma experiência de performance confiável.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`,
              borderRadius: '12px', padding: '1.75rem',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                background: 'hsl(var(--pm-red-500) / 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <f.icon size={20} style={{ color: RED }} />
              </div>
              <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff', marginBottom: '0.5rem' }}>
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

// ─── CTA / CONTATO ─────────────────────────────────────────────────────────
function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="contato" style={{ background: RED, padding: '6rem 2.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '4rem', alignItems: 'center' }}>
        {/* Left */}
        <div>
          <BigHeadline size="clamp(2.5rem, 5vw, 4.5rem)">
            <span style={{ color: '#fff' }}>Seu veículo pode</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.55)' }}>entregar mais.</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.4)' }}>A gente sabe</span><br />
            <span style={{ color: 'hsl(0 0% 100% / 0.3)' }}>como desbloquear.</span>
          </BigHeadline>
          <p style={{ color: 'hsl(0 0% 100% / 0.75)', fontSize: '0.9rem', lineHeight: 1.7, marginTop: '1.5rem', maxWidth: '420px' }}>
            Solicite uma análise técnica e descubra o potencial real da sua máquina com segurança, método e performance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', alignItems: 'center' }}>
            <Button
              onClick={onLogin}
              style={{ background: '#000', color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', height: '48px', paddingInline: '1.5rem' }}
              className="uppercase"
            >
              Seja um Parceiro Tuner <ArrowRight size={14} />
            </Button>
            <button style={{ color: '#fff', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Phone size={14} /> Falar com Especialista
            </button>
          </div>
        </div>

        {/* Contact card */}
        <div style={{
          background: 'hsl(222 8% 8%)', borderRadius: '16px',
          padding: '2rem', fontFamily: 'var(--pm-font-mono)',
        }}>
          <p style={{ fontSize: '0.6rem', color: RED, letterSpacing: '0.25em', marginBottom: '1.5rem' }}>CONTACT_CENTER</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { icon: Mail, label: 'E-MAIL', value: 'contato@promaxtuner.com.br' },
              { icon: Phone, label: 'WHATSAPP', value: '+55 (11) 99999-9999' },
              { icon: MapPin, label: 'UNIDADE MATRIZ', value: 'São Paulo, SP' },
            ].map((c) => (
              <div key={c.label}>
                <p style={{ fontSize: '0.55rem', color: 'hsl(var(--pm-gray-500))', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>{c.label}</p>
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

// ─── FOOTER ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#000', padding: '4rem 2.5rem 2rem', borderTop: `1px solid hsl(var(--pm-gray-800))` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.06em', color: 'hsl(var(--pm-gray-600))', marginBottom: '1rem' }}>
              PROMAX TUNER PERFORMANCE
            </div>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--pm-gray-500))', lineHeight: 1.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Desempenho real. Resultados reais.<br />A excelência técnica em remapeamento<br />e performance automotiva.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              {['IN', 'FA', 'YO'].map((s) => (
                <div key={s} style={{
                  width: '36px', height: '36px', background: 'hsl(var(--pm-gray-850))',
                  border: `1px solid hsl(var(--pm-gray-700))`,
                  borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--pm-gray-400))', cursor: 'pointer',
                  fontFamily: 'var(--pm-font-mono)',
                }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
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

          {/* Navegação */}
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

        <div style={{ borderTop: `1px solid hsl(var(--pm-gray-900))`, paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            © 2026 PROMAX TUNER. TODOS OS DIREITOS RESERVADOS.
          </p>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--pm-gray-600))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            POWERED BY <strong style={{ color: 'hsl(var(--pm-gray-400))' }}>PROMAX GROUP</strong>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const login = () => navigate('/login')

  return (
    <div style={{ background: DARK, minHeight: '100vh' }}>
      <Navbar onLogin={login} />
      <HeroSection onLogin={login} />
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
