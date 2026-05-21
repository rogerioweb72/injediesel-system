// src/components/support/SupportSLABadge.tsx
import { Clock } from 'lucide-react'

interface Props {
  slaAt: string | null
}

export function SupportSLABadge({ slaAt }: Props) {
  if (!slaAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock size={12} />
        Sem SLA
      </span>
    )
  }

  const due = new Date(slaAt)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffH  = diffMs / (1000 * 60 * 60)

  let color: string
  let label: string

  if (diffMs < 0) {
    color = 'text-red-400'
    label = 'SLA vencido'
  } else if (diffH <= 4) {
    color = 'text-amber-400'
    label = `SLA: ${due.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  } else {
    color = 'text-green-400'
    label = `SLA: ${due.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Clock size={12} />
      {label}
    </span>
  )
}
