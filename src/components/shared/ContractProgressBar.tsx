import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'

type ContractStatus = 'active' | 'warning' | 'critical' | 'expired'

// eslint-disable-next-line react-refresh/only-export-components
export function contractDaysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).setHours(23, 59, 59, 999) - Date.now()) / 86_400_000)
}

function getStatus(daysRemaining: number): ContractStatus {
  if (daysRemaining <= 0)  return 'expired'
  if (daysRemaining <= 30) return 'critical'
  if (daysRemaining <= 90) return 'warning'
  return 'active'
}

const STATUS_CONFIG: Record<ContractStatus, {
  label: string
  color: string
  gradient?: string
  trackColor: string
  badgeBg: string
  badgeColor: string
  Icon: React.ElementType
}> = {
  active:   { label: 'Vigente',  color: '#34D399', trackColor: 'rgba(52,211,153,0.1)',  badgeBg: 'rgba(52,211,153,0.1)',   badgeColor: '#34D399', Icon: CheckCircle2 },
  warning:  { label: 'Atenção',  color: '#FBBF24', trackColor: 'rgba(251,191,36,0.1)',  badgeBg: 'rgba(251,191,36,0.1)',   badgeColor: '#FBBF24', Icon: Clock },
  critical: { label: 'Vencendo', color: '#B12825', gradient: 'linear-gradient(90deg,#FF4B2B,#B12825)', trackColor: 'rgba(177,40,37,0.1)', badgeBg: 'rgba(177,40,37,0.1)', badgeColor: '#B12825', Icon: AlertTriangle },
  expired:  { label: 'Vencido',  color: '#94A3B8', trackColor: 'rgba(148,163,184,0.08)', badgeBg: 'rgba(148,163,184,0.08)', badgeColor: '#94A3B8', Icon: XCircle },
}

interface ContractProgressBarProps {
  startDate: string
  endDate: string
  compact?: boolean
}

export function ContractProgressBar({ startDate, endDate, compact = false }: ContractProgressBarProps) {
  const start  = new Date(startDate).getTime()
  const end    = new Date(endDate).setHours(23, 59, 59, 999)
  // eslint-disable-next-line react-hooks/purity
  const now    = useMemo(() => Date.now(), [])
  const total  = end - start
  const elapsed = Math.min(Math.max(now - start, 0), total)
  const pct    = total > 0 ? Math.round((elapsed / total) * 100) : 100

  const daysRemaining = contractDaysRemaining(endDate)
  const status  = getStatus(daysRemaining)
  const cfg     = STATUS_CONFIG[status]
  const Icon    = cfg.Icon

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: cfg.badgeBg, color: cfg.badgeColor }}>
          <Icon size={10} /> {cfg.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Expirado'}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: cfg.badgeBg, color: cfg.badgeColor }}>
            <Icon size={10} /> {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Contrato expirado'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{pct}% decorrido</span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress
          value={pct}
          className="h-2"
          style={
            {
              '--tw-bg': cfg.trackColor,
              backgroundColor: cfg.trackColor,
            } as React.CSSProperties
          }
        />
        {/* Override the indicator color inline since Progress uses bg-primary */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: cfg.gradient ?? cfg.color }}
        />
      </div>

      {/* Dates */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>Início: {fmtDate(startDate)}</span>
        <span>Término: {fmtDate(endDate)}</span>
      </div>

      {/* Alert banners */}
      {status === 'critical' && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Contrato vencendo em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}</p>
            <p className="text-[11px] text-red-400/80 mt-0.5">Entre em contato com a Matriz imediatamente para renovação e evitar bloqueio de operações.</p>
          </div>
        </div>
      )}

      {status === 'warning' && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-300">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Contrato vence em {daysRemaining} dias</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5">Inicie o processo de renovação com antecedência para evitar interrupções.</p>
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-400">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Contrato expirado</p>
            <p className="text-[11px] text-gray-500 mt-0.5">O contrato desta unidade está vencido. Renove para restaurar o acesso completo.</p>
          </div>
        </div>
      )}
    </div>
  )
}
