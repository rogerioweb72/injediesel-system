// src/hooks/useEcuValueEdit.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface HistoricoEdicaoValor {
  id: string
  arquivo_id: string
  valor_anterior: number
  valor_novo: number
  motivo: string
  status: 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO_PAGAMENTO'
  solicitado_em: string
  aprovado_em: string | null
  motivo_recusa: string | null
  solicitado_profile: { name: string } | null
  aprovado_profile: { name: string } | null
  ecu_jobs: {
    id: string
    service_type: string
    franchise_units: { name: string; city: string | null; state: string | null } | null
  } | null
}

// ── Lista pendentes (para o financeiro) ───────────────────────────────────────

export function usePendingValueEdits() {
  return useQuery({
    queryKey: ['pending-value-edits'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('historico_edicoes_valor')
        .select(`
          id, arquivo_id, valor_anterior, valor_novo, motivo, status, solicitado_em,
          aprovado_em, motivo_recusa,
          solicitado_profile:profiles!solicitado_por(name),
          ecu_jobs(id, service_type, franchise_units(name, city, state))
        `)
        .eq('status', 'AGUARDANDO_APROVACAO')
        .order('solicitado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as HistoricoEdicaoValor[]
    },
    refetchInterval: 30_000,
  })
}

// ── Histórico de um arquivo específico ────────────────────────────────────────

export function useJobValueEditHistory(jobId: string) {
  return useQuery({
    queryKey: ['value-edit-history', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('historico_edicoes_valor')
        .select(`
          id, valor_anterior, valor_novo, motivo, status, solicitado_em,
          aprovado_em, motivo_recusa,
          solicitado_profile:profiles!solicitado_por(name),
          aprovado_profile:profiles!aprovado_por(name)
        `)
        .eq('arquivo_id', jobId)
        .order('solicitado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as HistoricoEdicaoValor[]
    },
  })
}

// ── Solicitar edição de valor ─────────────────────────────────────────────────

export function useRequestValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      jobId, valorAnterior, valorNovo, motivo,
    }: {
      jobId: string; valorAnterior: number; valorNovo: number; motivo: string
    }) => {
      // Inserir no histórico
      const { data: historico, error: errH } = await sb()
        .from('historico_edicoes_valor')
        .insert({
          arquivo_id:    jobId,
          tenant_id:     '00000000-0000-0000-0000-000000000000', // placeholder — RLS usa função
          valor_anterior: valorAnterior,
          valor_novo:     valorNovo,
          motivo,
          solicitado_por: user!.id,
        })
        .select('id')
        .single()
      if (errH) throw errH

      // Marcar flag no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({
          edicao_valor_pendente:     true,
          edicao_valor_historico_id: historico.id,
        })
        .eq('id', jobId)
      if (errJ) throw errJ

      return historico.id as string
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      toast.success('Solicitação enviada. Aguardando aprovação do financeiro.')
    },
    onError: () => toast.error('Erro ao solicitar edição de valor'),
  })
}

// ── Aprovar edição ────────────────────────────────────────────────────────────

export function useApproveValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ historicoId, jobId, valorNovo }: { historicoId: string; jobId: string; valorNovo: number }) => {
      // Aplica novo valor no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({
          amount_charged_by_matrix:  valorNovo,
          edicao_valor_pendente:      false,
          edicao_valor_historico_id:  null,
          updated_at:                 new Date().toISOString(),
        })
        .eq('id', jobId)
      if (errJ) throw errJ

      // Atualiza histórico
      const { error: errH } = await sb()
        .from('historico_edicoes_valor')
        .update({ status: 'APROVADO', aprovado_por: user!.id, aprovado_em: new Date().toISOString() })
        .eq('id', historicoId)
      if (errH) throw errH
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['saldo-franquias'] })
      toast.success('Alteração aprovada. Novo valor aplicado.')
    },
    onError: () => toast.error('Erro ao aprovar edição'),
  })
}

// ── Recusar edição ────────────────────────────────────────────────────────────

export function useRejectValueEdit() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ historicoId, jobId, motivoRecusa }: { historicoId: string; jobId: string; motivoRecusa: string }) => {
      // Reverte flag no job
      const { error: errJ } = await sb()
        .from('ecu_jobs')
        .update({ edicao_valor_pendente: false, edicao_valor_historico_id: null })
        .eq('id', jobId)
      if (errJ) throw errJ

      // Registra recusa
      const { error: errH } = await sb()
        .from('historico_edicoes_valor')
        .update({
          status: 'RECUSADO',
          motivo_recusa: motivoRecusa,
          aprovado_por:  user!.id,
          aprovado_em:   new Date().toISOString(),
        })
        .eq('id', historicoId)
      if (errH) throw errH
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['ecu-job', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['pending-value-edits'] })
      qc.invalidateQueries({ queryKey: ['value-edit-history', vars.jobId] })
      toast.success('Edição recusada. Valor original mantido.')
    },
    onError: () => toast.error('Erro ao recusar edição'),
  })
}

export function fmtDiff(anterior: number, novo: number): string {
  const diff = novo - anterior
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
}
