import type { FileStatus } from '@/types/app'

const STATUS_CONFIG: Record<FileStatus, { label: string; color: string; bg: string }> = {
  recebido:           { label: 'Recebido',          color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  em_triagem:         { label: 'Em Triagem',         color: '#60A5FA', bg: 'rgba(96,165,250,0.1)'  },
  em_processamento:   { label: 'Em Processamento',   color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  aguardando_cliente: { label: 'Aguardando Cliente', color: '#C084FC', bg: 'rgba(192,132,252,0.1)' },
  concluido:          { label: 'Concluído',          color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  cancelado:          { label: 'Cancelado',          color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_LABELS: Record<FileStatus, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
) as Record<FileStatus, string>

export function EcuStatusBadge({ status }: { status: FileStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: bg, color,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      lineHeight: 1.5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}
