import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Card de escolha com efeito 3D-tilt + glassmorphism (base "card-7" adaptada ao
// design system --pm-*). Sem imagem externa: fundo em gradiente on-brand pelo accent.
interface FranchiseChoiceCardProps {
  icon: React.ReactNode
  title: string
  description: string
  cta?: string
  accent: string          // hex, ex.: '#60A5FA'
  onClick: () => void
  className?: string
}

export function FranchiseChoiceCard({
  icon, title, description, cta = 'Selecionar', accent, onClick, className,
}: FranchiseChoiceCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({})

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    const rotateX = ((y - height / 2) / (height / 2)) * -6
    const rotateY = ((x - width / 2) / (width / 2)) * 6
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`,
      transition: 'transform 0.1s ease-out',
    })
  }
  const handleLeave = () => setStyle({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
    transition: 'transform 0.4s ease-in-out',
  })

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        background: `radial-gradient(120% 120% at 0% 0%, ${accent}22, transparent 55%), hsl(var(--pm-gray-900))`,
        border: `1px solid ${accent}33`,
      }}
      className={cn(
        'group relative flex min-h-[190px] cursor-pointer flex-col rounded-2xl p-5 shadow-lg outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className,
      )}
    >
      {/* glow decorativo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl"
        style={{ background: accent }} />

      {/* conteúdo com profundidade 3D */}
      <div style={{ transform: 'translateZ(40px)' }} className="flex h-full flex-col">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 backdrop-blur-md"
          style={{ background: `${accent}1f`, color: accent }}>
          {icon}
        </div>
        <p className="text-base font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{description}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium" style={{ color: accent }}>
          {cta}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  )
}
