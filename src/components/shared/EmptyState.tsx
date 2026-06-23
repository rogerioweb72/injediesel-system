import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon, title, description, actionLabel, onAction, className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center gap-4',
        className
      )}
    >
      <div
        className="rounded-full p-4"
        style={{ background: 'hsl(var(--pm-gray-800))' }}
      >
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} style={{ background: 'hsl(var(--pm-red-500))' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
