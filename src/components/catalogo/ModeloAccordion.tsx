// src/components/catalogo/ModeloAccordion.tsx
import { useState, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { MotorizacaoCard } from './MotorizacaoCard'
import type { EcuModelo, EcuCatalogRow } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  modelo: EcuModelo
}

export function ModeloAccordion({ modelo }: Props) {
  const [open, setOpen] = useState(false)
  const [openCard, setOpenCard] = useState<string | null>(null)
  const handleToggleCard = useCallback((id: string) => setOpenCard(prev => prev === id ? null : id), [])

  return (
    <div className="border-b border-[hsl(var(--pm-gray-800))] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-[hsl(var(--pm-gray-800))] transition-colors text-left"
      >
        <span className="text-sm text-foreground font-medium">{modelo.secao}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{modelo.motorizacoes.length} reg.</span>
          <ChevronRight
            size={14}
            className={cn('text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
          />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${modelo.motorizacoes.length * 220}px` : '0px' }}
      >
        {open && (
          <div className="px-4 pb-3 space-y-2 border-l-2 border-[hsl(var(--pm-red-500)/0.3)] ml-4">
            {modelo.motorizacoes.map(m => (
              <MotorizacaoCard key={m.id} row={m as EcuCatalogRow} isOpen={openCard === m.id} onToggle={handleToggleCard} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
