import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  loading?: boolean
}

export function MetricCard({
  label, value, description, trend, trendValue, loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="pm-kpi-card">
        <div className="pm-skeleton h-3 w-24 mb-3" />
        <div className="pm-skeleton h-8 w-32 mb-2" />
        <div className="pm-skeleton h-3 w-20" />
      </div>
    )
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'

  return (
    <div className="pm-kpi-card">
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{value}</div>
      {(description || trend) && (
        <div className={cn('pm-kpi-desc flex items-center gap-1', trendColor)}>
          {trend && <TrendIcon size={12} />}
          {trendValue && <span>{trendValue}</span>}
          {description && <span className="text-muted-foreground">{description}</span>}
        </div>
      )}
    </div>
  )
}
