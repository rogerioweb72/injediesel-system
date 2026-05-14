import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Zap, Shield, BarChart3, ChevronRight } from 'lucide-react'

const SERVICES = [
  { icon: Zap,       title: 'Remapeamento ECU',   desc: 'Calibração precisa para máxima performance e eficiência.' },
  { icon: Shield,    title: 'Diagnóstico Técnico', desc: 'Leitura e análise completa dos sistemas eletrônicos do veículo.' },
  { icon: BarChart3, title: 'Performance Medida',  desc: 'Resultados comprovados com dados de antes e depois.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--pm-gray-950))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[hsl(var(--pm-gray-700))]">
        <div className="font-display text-2xl font-black uppercase tracking-wider">
          <span style={{ color: 'hsl(var(--pm-red-500))' }}>PROMAX</span>
          <span className="text-foreground"> TUNER</span>
        </div>
        <Button
          onClick={() => navigate('/login')}
          style={{ background: 'hsl(var(--pm-red-500))' }}
          className="font-bold uppercase"
        >
          Área Restrita <ChevronRight size={16} />
        </Button>
      </header>

      {/* Hero */}
      <section className="px-8 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-block pm-badge pm-badge--danger mb-6" style={{ fontSize: '0.75rem', padding: '4px 14px' }}>
          Performance Automotiva
        </div>
        <h1 className="font-display font-black uppercase mb-6" style={{ fontSize: '4rem', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          Extraia o{' '}
          <span style={{ color: 'hsl(var(--pm-red-500))' }}>Máximo</span>
          {' '}do seu Veículo
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Especialistas em remapeamento e calibração de ECU. Tecnologia de ponta, resultados comprovados.
        </p>
        <Button size="lg" style={{ background: 'hsl(var(--pm-red-500))', height: '52px', fontSize: '1rem' }} className="font-bold uppercase px-8">
          Solicitar Orçamento
        </Button>
      </section>

      {/* Serviços */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <div className="pm-accent-line justify-center mb-8">Nossos Serviços</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pm-stagger pm-animate-fade-in">
          {SERVICES.map((s) => (
            <div key={s.title} className="pm-card text-center">
              <div className="inline-flex p-3 rounded-xl mb-4" style={{ background: 'hsl(var(--pm-red-500) / 0.12)' }}>
                <s.icon size={24} style={{ color: 'hsl(var(--pm-red-500))' }} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 text-center border-t border-[hsl(var(--pm-gray-700))]">
        <p className="text-sm text-muted-foreground">
          © 2026 Promax Tuner — Performance Lab. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  )
}
