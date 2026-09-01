import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'

// ── Página pública de assinatura (/assinar/:token) ───────────────────────────

export interface SignatureView {
  status: 'ready' | 'signed' | 'expired'
  message?: string
  unit?: {
    name: string
    city?: string | null
    state?: string | null
    contract_type?: string
    franchise_fee?: number | null
    payment_plan?: string | null
    sale_payment_method?: string | null
    responsavel_nome?: string | null
    responsavel_email?: string | null
  }
  pdf_url?: string | null
}

// Carrega os dados do contrato pelo token (sem login).
export async function fetchSignatureView(token: string): Promise<SignatureView> {
  const { data, error } = await supabase.functions.invoke('franchise-signature', {
    body: { action: 'view', token },
  })
  if (error) {
    // A função devolve status 404/410 com corpo JSON; o supabase-js embrulha em FunctionsHttpError.
    // Tenta extrair o corpo para diferenciar expirado/inválido.
    try {
      const ctx = (error as unknown as { context?: Response }).context
      if (ctx) {
        const body = await ctx.json()
        if (body?.status) return body as SignatureView
        if (body?.message) throw new Error(body.message)
      }
    } catch (inner) {
      if (inner instanceof Error && inner.message) throw inner
    }
    throw new Error('Não foi possível carregar o contrato.')
  }
  return data as SignatureView
}

// Registra a assinatura (nome). Ativa a unidade no backend.
export async function submitSignature(token: string, name: string): Promise<{ ok: boolean; unit_name?: string }> {
  const { data, error } = await supabase.functions.invoke('franchise-signature', {
    body: { action: 'sign', token, name },
  })
  if (error) {
    try {
      const ctx = (error as unknown as { context?: Response }).context
      if (ctx) {
        const body = await ctx.json()
        if (body?.error) throw new Error(body.error)
      }
    } catch (inner) {
      if (inner instanceof Error && inner.message) throw inner
    }
    throw new Error('Falha ao assinar o contrato.')
  }
  return data as { ok: boolean; unit_name?: string }
}

// ── Ação da matriz: aprovar contrato e enviar link de assinatura ─────────────

export function useSendSignatureLink() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  return useMutation({
    mutationFn: async ({ unitId }: { unitId: string; name?: string }) => {
      const { data, error } = await supabase.functions.invoke('franchise-signature', {
        body: { action: 'send', unit_id: unitId },
      })
      if (error) {
        try {
          const ctx = (error as unknown as { context?: Response }).context
          if (ctx) {
            const body = await ctx.json()
            if (body?.error) throw new Error(body.error)
          }
        } catch (inner) {
          if (inner instanceof Error && inner.message) throw inner
        }
        throw error
      }
      return data as { ok: boolean; email_sent: boolean; sign_url: string; expires_at: string }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['franchise-unit', vars.unitId] })
      qc.invalidateQueries({ queryKey: ['franchise-units'] })
      log({ entity: 'franchise_unit', entityId: vars.unitId, action: 'contract_sent', metadata: { name: vars.name } })
    },
  })
}
