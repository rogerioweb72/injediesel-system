// src/components/layout/ImpersonationBanner.tsx
import { Eye, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useStopImpersonation } from '@/hooks/useImpersonation'
import { ROLE_LABELS } from '@/types/app'

export function ImpersonationBanner() {
  const impersonating = useAuthStore(s => s.impersonating)
  const stop = useStopImpersonation()

  if (!impersonating) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30">
      <div className="flex items-center gap-2 text-xs text-amber-300">
        <Eye size={13} className="shrink-0" />
        <span>
          Visualizando como <strong>{impersonating.name}</strong>
          <span className="text-amber-400/60 ml-1">
            ({ROLE_LABELS[impersonating.role]})
          </span>
          <span className="ml-2 text-amber-500/60">— Esta sessão está sendo auditada</span>
        </span>
      </div>
      <button
        onClick={() => stop.mutate()}
        disabled={stop.isPending}
        className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-amber-400 hover:text-white border border-amber-500/30 hover:border-amber-400/60 px-3 py-1 rounded-lg transition-all"
      >
        {stop.isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        Encerrar
      </button>
    </div>
  )
}
