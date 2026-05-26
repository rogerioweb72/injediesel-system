import { brandLogos as BRAND_LOGOS } from '@/data/brand-logos'
import { ModeloRow } from './ModeloRow'
import type { EcuMarca } from '@/types/ecu-catalog'

interface Props {
  marca: EcuMarca
  categoria: string
  whatsappNumber: string
}

export function MarcaSection({ marca, categoria, whatsappNumber }: Props) {
  const logoUrl = BRAND_LOGOS[marca.marca]

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={marca.marca}
            className="h-5 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="font-display text-[hsl(var(--pm-red-500))] font-bold text-base uppercase">
            {marca.marca[0]}
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
          {marca.marca}
        </span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[hsl(var(--pm-gray-900)/0.5)]">
        {marca.modelos.map(m => (
          <ModeloRow
            key={m.secao}
            modelo={m}
            marca={marca.marca}
            categoria={categoria}
            whatsappNumber={whatsappNumber}
          />
        ))}
      </div>
    </div>
  )
}
