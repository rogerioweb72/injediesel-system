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
      <Icon size={28} className="text-white opacity-90 flex-shrink-0" />
      <div>
        <div className="pm-quick-card-title">{title}</div>
        <div className="pm-quick-card-desc">{description}</div>
      </div>
    </button>
  )
}
