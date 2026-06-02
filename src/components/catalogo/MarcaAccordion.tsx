// src/components/catalogo/MarcaAccordion.tsx
import { useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { MotorizacaoCard } from './MotorizacaoCard'
import type { EcuMarca, EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  marca: EcuMarca
  readOnly?: boolean
}

export function MarcaAccordion({ marca, readOnly = false }: Props) {
  const allItems = marca.modelos.flatMap(m => m.motorizacoes)
  const [isOpen, setIsOpen] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const handleToggle = useCallback((id: string) => {
    setOpenCardId(prev => (prev === id ? null : id))
  }, [])

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 overflow-hidden mb-3',
        isOpen
          ? 'border-[#E60000]/20 bg-black/20'
          : 'border-white/[0.06] bg-transparent hover:border-white/[0.12]',
      )}
    >
      {/* ── BRAND HEADER (accordion toggle) ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <h2
          className="text-base font-black tracking-[0.12em] uppercase shrink-0 leading-none"
          style={{ color: '#E60000', transform: 'skewX(-6deg)', display: 'inline-block' }}
        >
          {marca.marca}
        </h2>

        <div className="h-px flex-1 bg-gradient-to-r from-[#E60000]/30 to-transparent" />

        <span className="text-[10px] text-gray-500 uppercase tracking-widest shrink-0 font-mono">
          {allItems.length} reg.
        </span>

        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300',
            isOpen
              ? 'rotate-180 bg-[#E60000]/15 border-[#E60000]/40'
              : 'bg-white/5 border-white/10',
          )}
        >
          <ChevronDown
            size={14}
            className={cn('transition-colors duration-300', isOpen ? 'text-[#E60000]' : 'text-gray-500')}
          />
        </div>
      </button>

      {/* ── VEHICLE CARDS ── */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {allItems.map(item => (
              <MotorizacaoCard
                key={item.id}
                row={item as EcuCatalogRow}
                isOpen={openCardId === item.id}
                onToggle={handleToggle}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
