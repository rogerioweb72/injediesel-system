// src/components/catalogo/CategoriaAccordion.tsx
import { useMemo, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MarcaAccordion } from './MarcaAccordion'
import { groupByMarcaModelo } from '@/types/ecu-catalog'
import type { EcuCatalogRow } from '@/types/ecu-catalog'
import type { EcuCategory } from '@/hooks/useEcuCategories'
import { cn } from '@/lib/utils'

interface Props {
  category: EcuCategory
  rows: EcuCatalogRow[]
  isOpen: boolean
  onToggle: () => void
  readOnly?: boolean
}

export function CategoriaAccordion({ category, rows, isOpen, onToggle, readOnly = false }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])
  const grupos = useMemo(() => groupByMarcaModelo(rows), [rows])
  const expanded = isMobile || isOpen

  // On mobile: no outer border/frame, flush with screen edges
  if (isMobile) {
    return (
      <div className="w-full">
        {/* Mobile category label — compact */}
        <div className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.08]">
          <span className="text-sm font-mono font-bold tracking-[0.12em] text-white uppercase flex-1">
            {category.label}
          </span>
          <span className={cn('text-[11px] font-mono uppercase tracking-widest', rows.length > 0 ? 'text-gray-500' : 'text-gray-700')}>
            {rows.length} ECU
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum ECU nesta categoria.</p>
        ) : (
          <div className="w-full">
            {grupos.map(m => (
              <MarcaAccordion key={m.marca} marca={m} readOnly={readOnly} isMobile />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full rounded-xl border transition-all duration-300 overflow-hidden',
        expanded
          ? 'border-white/[0.12] bg-[hsl(var(--pm-gray-900)/0.6)]'
          : 'border-white/[0.06] bg-[hsl(var(--pm-gray-900))] hover:border-white/[0.12] hover:bg-[hsl(var(--pm-gray-900))]',
      )}
    >
      {/* ── BAR ── */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="text-[1.75rem] font-mono font-bold tracking-[0.15em] text-white uppercase shrink-0">
          {category.label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        <div className="flex items-center shrink-0">
          <span className={cn('text-[13.2px] font-mono uppercase tracking-widest pr-4', rows.length > 0 ? 'text-gray-400' : 'text-gray-600')}>
            {rows.length} ECU
          </span>
          <div className="w-px h-5 bg-white/10 mr-4" />
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300', isOpen ? 'rotate-180 bg-red-500/15 border-red-500/40' : 'bg-green-500/10 border-green-500/30')}>
            <ChevronDown size={16} className={cn('transition-colors duration-300', isOpen ? 'text-red-400' : 'text-green-400')} />
          </div>
        </div>
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {isOpen && (
        <div className="border-t border-white/[0.06] px-6 pb-6 pt-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum ECU nesta categoria com os filtros atuais.
            </p>
          ) : (
            <div className="w-full">
              {grupos.map(m => (
                <MarcaAccordion key={m.marca} marca={m} readOnly={readOnly} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
