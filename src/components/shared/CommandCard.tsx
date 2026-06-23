import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type CardColor = 'red' | 'blue' | 'green'

interface CommandCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: CardColor
  onClick?: () => void
}

const colorMap: Record<CardColor, string> = {
  red:   'pm-quick-card--red',
  blue:  'pm-quick-card--blue',
  green: 'pm-quick-card--green',
}

export function CommandCard({ title, description, icon: Icon, color, onClick }: CommandCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn('pm-quick-card w-full text-left', colorMap[color])}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="pm-quick-card-title">{title}</div>
        <div className="pm-quick-card-desc">{description}</div>
      </div>
      <ChevronRight size={16} className="text-white/40 flex-shrink-0 self-center" />
    </button>
  )
}
