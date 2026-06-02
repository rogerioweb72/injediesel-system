// src/components/catalogo/MarcaAccordion.tsx
import { useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { MotorizacaoCard } from './MotorizacaoCard'
import type { EcuMarca, EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  marca: EcuMarca
  readOnly?: boolean
  isMobile?: boolean
  // controlled mode (used on mobile via CategoriaAccordion to enforce one-at-a-time)
  isOpen?: boolean
  onToggle?: () => void
}

export function MarcaAccordion({ marca, readOnly = false, isMobile = false, isOpen: controlledOpen, onToggle: controlledToggle }: Props) {
  const allItems = marca.modelos.flatMap(m => m.motorizacoes)
  // uncontrolled fallback for desktop
  const [internalOpen, setInternalOpen] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const isOpen   = controlledOpen !== undefined ? controlledOpen : internalOpen
  const toggle   = controlledToggle ?? (() => setInternalOpen(v => !v))

  const handleCardToggle = useCallback((id: string) => {
    setOpenCardId(prev => (prev === id ? null : id))
  }, [])

  if (isMobile) {
    return (
      <div
        className={cn('w-full', isOpen && 'bg-black/10')}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 7 }}
      >
        {/* Brand header */}
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 px-3 py-3 text-left"
        >
          <h2 className="text-xs font-black tracking-[0.1em] uppercase leading-none flex-1" style={{ color: '#E60000' }}>
            {marca.marca}
          </h2>
          <span className="text-[9px] text-gray-600 uppercase tracking-widest font-mono">
            {allItems.length} reg.
          </span>
          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0', isOpen ? 'rotate-180 bg-[#E60000]/15 border-[#E60000]/40' : 'bg-white/5 border-white/10')}>
            <ChevronDown size={10} className={cn(isOpen ? 'text-[#E60000]' : 'text-gray-500')} />
          </div>
        </button>
        {isOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '4px 8px 8px' }}>
            {allItems.map(item => (
              <div key={item.id} style={{ marginBottom: 7 }}>
                <MotorizacaoCard
                  row={item as EcuCatalogRow}
                  isOpen={openCardId === item.id}
                  onToggle={handleCardToggle}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 overflow-hidden mb-3',
        isOpen
          ? 'border-[#E60000]/20 bg-black/20'
          : 'border-white/[0.06] bg-transparent hover:border-white/[0.12]',
      )}
    >
      <button
        onClick={toggle}
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
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300', isOpen ? 'rotate-180 bg-[#E60000]/15 border-[#E60000]/40' : 'bg-white/5 border-white/10')}>
          <ChevronDown size={14} className={cn('transition-colors duration-300', isOpen ? 'text-[#E60000]' : 'text-gray-500')} />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {allItems.map(item => (
              <MotorizacaoCard
                key={item.id}
                row={item as EcuCatalogRow}
                isOpen={openCardId === item.id}
                onToggle={handleCardToggle}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
