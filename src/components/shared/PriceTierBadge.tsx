import type { PriceTier } from '@/types/app'

const TIER_CONFIG: Record<PriceTier, { label: string; color: string; bg: string }> = {
  cliente_final:         { label: 'Cliente Final', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  franqueado_linha_leve: { label: 'Linha Leve',    color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  franqueado_full:       { label: 'Full',          color: '#B12825', bg: 'rgba(177,40,37,0.1)'     },
}

export function PriceTierBadge({ tier }: { tier: PriceTier | null | undefined }) {
  const config = tier ? TIER_CONFIG[tier] : null
  if (!config) return <span style={{ fontSize: 11, color: '#64748B' }}>—</span>
  const { label, color, bg } = config
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: bg, color,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}
