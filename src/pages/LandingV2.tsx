import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Cpu, Users, FileText, ShoppingCart, BarChart2,
  Wrench, Headphones, Shield, Zap, ChevronRight,
} from 'lucide-react'

const MODULES = [
  {
    icon: Cpu,
    title: 'ECU · Arquivos de Remapeamento',
    desc: 'Envio e recebimento de arquivos ECU com rastreabilidade completa. Histórico por veículo, status em tempo real.',
  },
  {
    icon: FileText,
    title: 'Catálogo de Veículos',
    desc: 'Base técnica com marcas, modelos e motorizações. Ganhos de potência e torque por configuração.',
  },
  {
    icon: Users,
    title: 'Clientes & CRM',
    desc: 'Cadastro completo com veículos vinculados, histórico de serviços e busca por placa.',
  },
  {
    icon: ShoppingCart,
    title: 'Pedidos & Loja',
    desc: 'Gestão de pedidos B2B para revendas. Carrinho, faturamento e controle de estoque integrados.',
  },
  {
    icon: BarChart2,
    title: 'Financeiro',
    desc: 'Controle de caixa, lançamentos, faturas e relatórios financeiros por unidade ou consolidado.',
  },
  {
    icon: Wrench,
    title: 'PDV & Serviços',
    desc: 'Ponto de venda integrado com cadastro de serviços, formas de pagamento e categorias.',
  },
  {
    icon: Headphones,
    title: 'Suporte Técnico',
    desc: 'Sistema de tickets com SLA, chat em tempo real e base de conhecimento para revendas.',
  },
  {
    icon: Shield,
    title: 'Gestão de Revendas',
    desc: 'Onboarding, territórios, permissões por papel e auditoria completa de cada unidade autorizada.',
  },
]

export default function LandingV2() {
  return (
    <div className="min-h-screen" style={{ background: '#0a1628', color: '#f0f6ff' }}>

      {/* NAV */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/tuner-logo.svg" alt="Injediesel System" style={{ height: 44, width: 'auto', display: 'block' }} />
          <Link to="/login" style={{
            background: 'linear-gradient(135deg, #1a7fe8 0%, #0b3fad 100%)',
            color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontWeight: 700, fontSize: '0.8125rem',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Acessar Sistema <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '80px 1.5rem 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,127,232,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <img src="/tuner-logo.svg" alt="Injediesel System" style={{ height: 72, width: 'auto' }} />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(26,127,232,0.12)', border: '1px solid rgba(26,127,232,0.3)',
            borderRadius: 999, padding: '5px 16px', marginBottom: 28,
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#60a5fa',
          }}>
            <Zap size={12} /> Plataforma de Gestão para Revendas Autorizadas
          </div>
          <h1 style={{
            fontFamily: 'var(--pm-font-display)', fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em',
            lineHeight: 1.1, marginBottom: 20, color: '#fff',
          }}>
            Sistema Completo para<br />
            <span style={{ color: '#1a7fe8' }}>Gestão Injediesel</span>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#8ab4d8', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Controle total das suas revendas autorizadas — ECU, clientes, financeiro, pedidos e suporte em uma única plataforma.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{
              background: 'linear-gradient(135deg, #1a7fe8 0%, #0b3fad 100%)',
              color: '#fff', borderRadius: 8, padding: '13px 32px',
              fontWeight: 800, fontSize: '0.9375rem', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 24px rgba(26,127,232,0.35)',
            }}>
              Entrar como Revenda <ChevronRight size={16} />
            </Link>
            <Link to="/appinjediesel" style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#c8dff5', borderRadius: 8, padding: '13px 32px',
              fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none',
            }}>
              Acesso Matriz
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '48px 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, textAlign: 'center' }}>
          {[
            { value: '39+', label: 'Anos de mercado' },
            { value: '80+', label: 'Revendas autorizadas' },
            { value: '100%', label: 'Diesel especializado' },
            { value: '4.7★', label: 'Avaliação Google' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--pm-font-display)', fontSize: '2.25rem', fontWeight: 900, color: '#1a7fe8', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.8125rem', color: '#6ba3d6', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section style={{ padding: '72px 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a7fe8', marginBottom: 12 }}>
              Módulos do Sistema
            </p>
            <h2 style={{ fontFamily: 'var(--pm-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', color: '#fff' }}>
              Tudo que sua revenda precisa
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {MODULES.map(mod => (
              <ModuleCard key={mod.title} mod={mod} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '72px 1.5rem',
        background: 'linear-gradient(135deg, rgba(26,127,232,0.12) 0%, rgba(11,63,173,0.18) 100%)',
        borderTop: '1px solid rgba(26,127,232,0.2)',
        borderBottom: '1px solid rgba(26,127,232,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--pm-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900, textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>
            Pronto para acessar?
          </h2>
          <p style={{ color: '#8ab4d8', marginBottom: 32, lineHeight: 1.7 }}>
            Acesse o sistema com suas credenciais de revenda autorizada ou entre em contato com a matriz para solicitar acesso.
          </p>
          <Link to="/login" style={{
            background: 'linear-gradient(135deg, #1a7fe8 0%, #0b3fad 100%)',
            color: '#fff', borderRadius: 8, padding: '13px 32px',
            fontWeight: 800, fontSize: '0.9375rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Acessar como Revenda <ChevronRight size={16} />
          </Link>
          <p style={{ marginTop: 24, fontSize: '0.8125rem', color: '#4a7aab' }}>
            Suporte:{' '}
            <a href="https://wa.me/5545999790294" style={{ color: '#1a7fe8', textDecoration: 'none' }}>
              +55 45 99979-0294
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>
            <span style={{ color: '#1a7fe8' }}>INJE</span>DIESEL
            <span style={{ fontSize: '0.6rem', fontWeight: 600, marginLeft: 6, color: '#6ba3d6' }}>SYSTEM</span>
          </span>
          <p style={{ marginTop: 12, fontSize: '0.75rem', color: '#3a5a7a' }}>
            © {new Date().getFullYear()} Injediesel Power Chip · Cascavel/PR · Desde 1987
          </p>
        </div>
      </footer>
    </div>
  )
}

type Module = { icon: React.ElementType; title: string; desc: string }

function ModuleCard({ mod }: { mod: Module }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(26,127,232,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(26,127,232,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '1.5rem',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, marginBottom: 14,
        background: 'rgba(26,127,232,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#1a7fe8',
      }}>
        <mod.icon size={20} />
      </div>
      <h3 style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 800, fontSize: '0.9375rem', textTransform: 'uppercase', color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
        {mod.title}
      </h3>
      <p style={{ fontSize: '0.8125rem', color: '#8ab4d8', lineHeight: 1.6 }}>
        {mod.desc}
      </p>
    </div>
  )
}
