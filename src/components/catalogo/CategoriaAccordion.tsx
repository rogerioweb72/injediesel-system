// src/components/catalogo/CategoriaAccordion.tsx
import { useMemo, useEffect, useState, useCallback } from 'react'
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
  // one brand at a time
  const [openMarca, setOpenMarca] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // reset brand when category closes
  useEffect(() => { if (!isOpen) setOpenMarca(null) }, [isOpen])

  const handleMarcaToggle = useCallback((marca: string) => {
    setOpenMarca(prev => prev === marca ? null : marca)
  }, [])

  const grupos = useMemo(() => groupByMarcaModelo(rows), [rows])

  // ── MOBILE ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          background: isOpen ? 'hsl(230 17% 9%)' : 'hsl(230 17% 7%)',
          borderBottom: '7px solid transparent', // gap entre categorias
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Category header — accordion toggle */}
        <button
          onClick={onToggle}
          style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '12px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'var(--pm-font-mono)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase', flex: 1 }}>
            {category.label}
          </span>
          <span style={{ fontFamily: 'var(--pm-font-mono)', fontSize: '10px', color: rows.length > 0 ? '#6b7280' : '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '6px' }}>
            {rows.length} ECU
          </span>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', border: `1px solid ${isOpen ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.3)'}`,
            background: isOpen ? 'rgba(239,68,68,0.12)' : 'rgba(74,222,128,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s',
          }}>
            <ChevronDown size={12} style={{ color: isOpen ? '#f87171' : '#4ade80' }} />
          </div>
        </button>

        {/* Brands — one at a time */}
        {isOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {rows.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', padding: '16px' }}>Nenhum ECU nesta categoria.</p>
            ) : (
              <div style={{ paddingTop: 4 }}>
                {grupos.map(m => (
                  <MarcaAccordion
                    key={m.marca}
                    marca={m}
                    readOnly={readOnly}
                    isMobile
                    isOpen={openMarca === m.marca}
                    onToggle={() => handleMarcaToggle(m.marca)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── DESKTOP ─────────────────────────────────────────────
  return (
    <div
      className={cn(
        'w-full rounded-xl border transition-all duration-300 overflow-hidden',
        isOpen
          ? 'border-white/[0.12] bg-[hsl(var(--pm-gray-900)/0.6)]'
          : 'border-white/[0.06] bg-[hsl(var(--pm-gray-900))] hover:border-white/[0.12] hover:bg-[hsl(var(--pm-gray-900))]',
      )}
    >
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
      {isOpen && (
        <div className="border-t border-white/[0.06] px-6 pb-6 pt-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum ECU nesta categoria com os filtros atuais.
            </p>
          ) : (
            <div className="w-full">
              {grupos.map(m => (
                <MarcaAccordion
                  key={m.marca}
                  marca={m}
                  readOnly={readOnly}
                  isOpen={openMarca === m.marca}
                  onToggle={() => handleMarcaToggle(m.marca)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
