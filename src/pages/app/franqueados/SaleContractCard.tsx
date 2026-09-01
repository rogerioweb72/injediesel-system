import { useState } from 'react'
import { toast } from 'sonner'
import { FileSignature, Send, Copy, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { translateError } from '@/lib/errors'
import { useSendSignatureLink } from '@/hooks/useFranchiseSignature'
import type { FranchiseUnit } from '@/hooks/useFranchiseUnits'

const ADMIN_ROLES = ['company_admin', 'operations_admin', 'system_ti'] as const

function fmtDate(v?: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleString('pt-BR')
}

// Só aparece em unidades originadas pela venda de franquia (sale_status != none).
export function SaleContractCard({ unit }: { unit: FranchiseUnit }) {
  const send = useSendSignatureLink()
  const [lastUrl, setLastUrl] = useState<string | null>(null)

  const status = unit.sale_status
  if (!status || status === 'none') return null

  const signUrlFromToken = unit.sign_token ? `${window.location.origin}/assinar/${unit.sign_token}` : null
  const shownUrl = lastUrl ?? signUrlFromToken

  async function approveSend() {
    try {
      const r = await send.mutateAsync({ unitId: unit.id, name: unit.name })
      setLastUrl(r.sign_url)
      toast.success(r.email_sent ? 'Link de assinatura enviado por e-mail.' : 'Link gerado (e-mail não enviado — copie e envie manualmente).')
    } catch (e) {
      toast.error(translateError(e))
    }
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(
      () => toast.success('Link copiado'),
      () => toast.error('Não foi possível copiar'),
    )
  }

  const badge =
    status === 'pending'  ? { t: 'Rascunho — aguardando aprovação', c: '#F59E0B' } :
    status === 'approved' ? { t: 'Aguardando assinatura', c: '#60A5FA' } :
    /* signed | active */   { t: 'Contrato assinado', c: '#34D399' }

  return (
    <div className="pm-card space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <FileSignature size={12} /> Contrato de Venda
        </p>
        <span className="text-[11px] font-medium px-2 py-1 rounded-full" style={{ color: badge.c, background: `${badge.c}1a` }}>
          {badge.t}
        </span>
      </div>

      {/* pending → aprovar e enviar */}
      {status === 'pending' && (
        <RoleGuard roles={[...ADMIN_ROLES]}>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ao aprovar, o link de assinatura é enviado para <strong className="text-zinc-200">{unit.responsavel_legal_email ?? 'o responsável legal'}</strong>.
              A unidade é ativada automaticamente quando ele assinar.
            </p>
            <button onClick={approveSend} disabled={send.isPending}
              className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}>
              {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Aprovar e enviar p/ assinatura
            </button>
          </div>
        </RoleGuard>
      )}

      {/* approved → aguardando + reenviar + copiar link */}
      {status === 'approved' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Clock size={14} className="text-blue-400" />
            Aguardando assinatura de <strong>{unit.responsavel_legal_nome ?? 'responsável'}</strong>
            {unit.sign_token_expires_at && <span className="text-zinc-500">· expira {fmtDate(unit.sign_token_expires_at)}</span>}
          </div>
          {shownUrl && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'hsl(var(--pm-gray-900))', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-zinc-400 truncate flex-1">{shownUrl}</span>
              <button onClick={() => copy(shownUrl)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                <Copy size={13} /> Copiar
              </button>
            </div>
          )}
          <RoleGuard roles={[...ADMIN_ROLES]}>
            <button onClick={approveSend} disabled={send.isPending}
              className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.08] px-3 py-1.5 rounded-lg transition-all">
              {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Reenviar link
            </button>
          </RoleGuard>
        </div>
      )}

      {/* signed | active → registro da assinatura */}
      {(status === 'signed' || status === 'active') && (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={15} /> Assinado por <strong>{unit.signed_by_name ?? '—'}</strong>
          </div>
          <p className="text-xs text-zinc-400">Data: {fmtDate(unit.signed_at)} · IP: {unit.signed_ip ?? '—'}</p>
          {unit.signed_hash && (
            <p className="text-[11px] text-zinc-500 font-mono break-all">hash: {unit.signed_hash.slice(0, 32)}…</p>
          )}
        </div>
      )}
    </div>
  )
}
