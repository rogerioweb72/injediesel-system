import { cn } from '@/lib/utils'
import type { FileStatus } from '@/types/app'

const STATUS_CONFIG: Record<FileStatus, { label: string; className: string }> = {
  recebido:           { label: 'Recebido',       className: 'pm-badge pm-badge--info' },
  em_triagem:         { label: 'Em Triagem',      className: 'pm-badge pm-badge--warning' },
  em_processamento:   { label: 'Processando',     className: 'pm-badge pm-badge--warning pm-badge--live' },
  aguardando_cliente: { label: 'Aguard. Cliente', className: 'pm-badge pm-badge--neutral' },
  concluido:          { label: 'Concluído',       className: 'pm-badge pm-badge--success' },
  cancelado:          { label: 'Cancelado',       className: 'pm-badge pm-badge--danger' },
}

interface StatusBadgeProps {
  status: FileStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  )
}
