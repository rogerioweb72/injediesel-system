import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MotorizacaoRow } from './MotorizacaoRow'
import type { EcuModelo } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  modelo: EcuModelo
  marca?: string | null
  categoria: string
  whatsappNumber: string
}

export function ModeloRow({ modelo, marca, categoria, whatsappNumber }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-3 pl-3 pr-2 text-sm text-left hover:text-foreground transition-colors text-muted-foreground"
      >
        <span className="font-medium">{modelo.secao}</span>
        <ChevronRight
          size={14}
          className={cn('transition-transform duration-200', open && 'rotate-90')}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${modelo.motorizacoes.length * 400}px` : '0px' }}
      >
        <div className={open ? undefined : 'pointer-events-none'}>
          {modelo.motorizacoes.map(m => (
            <MotorizacaoRow
              key={m.id}
              row={m}
              marca={marca}
              secaoOriginal={modelo.secao}
              categoria={categoria}
              whatsappNumber={whatsappNumber}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
