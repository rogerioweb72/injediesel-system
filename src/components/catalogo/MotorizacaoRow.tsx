import { useState } from 'react'
import { GainsPanel } from './GainsPanel'
import type { EcuMotorizacao } from '@/types/ecu-catalog'
import { cn } from '@/lib/utils'

interface Props {
  row: EcuMotorizacao
  marca?: string | null
  secaoOriginal?: string | null
  categoria: string
  whatsappNumber: string
}

export function MotorizacaoRow({ row, categoria }: Props) {
  const [open, setOpen] = useState(false)

  const label = [row.modelo_descricao, row.ano ? `(${row.ano})` : ''].filter(Boolean).join(' ')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex w-full items-center justify-between py-2 pl-6 pr-3 text-sm text-left transition-colors',
          open
            ? 'text-[hsl(var(--pm-red-500))]'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{open ? '−' : '→'}</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '500px' : '0px' }}
      >
        <div className={open ? 'pb-4 pt-1 px-2' : 'pb-4 pt-1 px-2 pointer-events-none'}>
          <GainsPanel
            record={{
              ...row,
              categoria,
              categoria_slug: categoria.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              created_at: '',
              updated_at: '',
            }}
          />
        </div>
      </div>
    </div>
  )
}
