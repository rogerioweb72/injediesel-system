import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

// ─── Constants ─────────────────────────────────────────────────────────────────

export const LANCAMENTO_CATEGORIAS = [
  'pessoal_fixo',
  'pessoal_variavel',
  'comercial',
  'logistica',
  'frota',
  'infraestrutura',
  'administrativo',
  'marketing',
  'suporte',
  'financeiro',
  'operacional',
] as const

export type LancamentoCategoria = typeof LANCAMENTO_CATEGORIAS[number]

export const CATEGORIA_LABELS: Record<LancamentoCategoria, string> = {
  pessoal_fixo:      'Pessoal Fixo',
  pessoal_variavel:  'Pessoal Variável',
  comercial:         'Comercial',
  logistica:         'Logística',
  frota:             'Frota',
  infraestrutura:    'Infraestrutura',
  administrativo:    'Administrativo',
  marketing:         'Marketing',
  suporte:           'Suporte',
  financeiro:        'Financeiro',
  operacional:       'Operacional',
}

export const RECORRENCIA_LABELS: Record<string, string> = {
  diario:  'Diário',
  semanal: 'Semanal',
  mensal:  'Mensal',
  anual:   'Anual',
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Lancamento {
  id: string
  unit_id: string | null
  type: 'receita' | 'despesa' | 'ajuste'
  categoria: LancamentoCategoria | null
  subcategoria: string | null
  status: 'rascunho' | 'lancado' | 'pendente' | 'pago'
  amount: number
  data_competencia: string | null
  periodo_year: number
  periodo_month: number
  centro_de_custo: string | null
  description: string | null
  recorrente: boolean
  recorrencia: {
    periodicidade: 'diario' | 'semanal' | 'mensal' | 'anual'
    repeticoes?: number
    data_fim?: string
  } | null
  parent_id: string | null
  ecu_job_id: string | null
  created_at: string
}

export interface CreateLancamentoPayload {
  tipo: 'receita' | 'despesa' | 'ajuste'
  categoria: LancamentoCategoria | string
  subcategoria?: string
  status: 'rascunho' | 'lancado'
  valor: number
  data_competencia: string
  centro_de_custo?: string
  descricao?: string
  recorrente: boolean
  recorrencia?: {
    periodicidade: 'diario' | 'semanal' | 'mensal' | 'anual'
    repeticoes: number
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addPeriod(
  dateStr: string,
  periodicidade: 'diario' | 'semanal' | 'mensal' | 'anual',
  n: number,
): string {
  const d = new Date(dateStr)
  if (periodicidade === 'diario')  d.setDate(d.getDate() + n)
  if (periodicidade === 'semanal') d.setDate(d.getDate() + n * 7)
  if (periodicidade === 'mensal')  d.setMonth(d.getMonth() + n)
  if (periodicidade === 'anual')   d.setFullYear(d.getFullYear() + n)
  return d.toISOString().split('T')[0]
}

function buildRow(
  payload: CreateLancamentoPayload,
  unitId: string | null,
  userId: string,
  dateStr: string,
  parentId?: string,
) {
  const d = new Date(dateStr)
  return {
    unit_id:           unitId,
    type:              payload.tipo,
    categoria:         payload.categoria,
    subcategoria:      payload.subcategoria ?? null,
    status:            payload.status,
    amount:            payload.tipo === 'despesa' ? -Math.abs(payload.valor) : Math.abs(payload.valor),
    description:       payload.descricao ?? null,
    data_competencia:  dateStr,
    period_year:       d.getFullYear(),
    period_month:      d.getMonth() + 1,
    centro_de_custo:   payload.centro_de_custo ?? null,
    recorrente:        payload.recorrente,
    recorrencia:       payload.recorrencia ?? null,
    parent_id:         parentId ?? null,
    ecu_job_id:        null,
    created_by:        userId,
  }
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useLancamentos(unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['lancamentos', unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      let q = sb()
        .from('financial_entries')
        .select('id, unit_id, type, categoria, subcategoria, status, amount, data_competencia, period_year, period_month, centro_de_custo, description, recorrente, recorrencia, parent_id, ecu_job_id, created_at')
        .is('ecu_job_id', null)
        .in('status', ['rascunho', 'lancado'])
        .order('data_competencia', { ascending: false })
        .order('created_at', { ascending: false })
      q = unitId === null ? q.is('unit_id', null) : q.eq('unit_id', unitId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Lancamento[]
    },
  })
}

export function useCreateLancamento() {
  const qc = useQueryClient()
  const { log } = useAuditLog()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      payload,
      unitId,
    }: {
      payload: CreateLancamentoPayload
      unitId: string | null
    }) => {
      const userId = user?.id ?? ''

      if (!payload.recorrente || !payload.recorrencia || payload.recorrencia.repeticoes <= 1) {
        // Single entry
        const row = buildRow(payload, unitId, userId, payload.data_competencia)
        const { data, error } = await sb().from('financial_entries').insert(row).select('id').single()
        if (error) throw error
        return { ids: [data.id] }
      }

      // First entry (parent)
      const firstRow = buildRow(payload, unitId, userId, payload.data_competencia)
      const { data: firstData, error: firstErr } = await sb()
        .from('financial_entries').insert(firstRow).select('id').single()
      if (firstErr) throw firstErr

      const parentId = firstData.id
      const repeticoes = payload.recorrencia.repeticoes
      const periodicidade = payload.recorrencia.periodicidade

      // Child entries
      const children = Array.from({ length: repeticoes - 1 }, (_, i) => {
        const dateStr = addPeriod(payload.data_competencia, periodicidade, i + 1)
        return buildRow(payload, unitId, userId, dateStr, parentId)
      })

      const { error: childErr } = await sb().from('financial_entries').insert(children)
      if (childErr) throw childErr

      return { ids: [parentId] }
    },
    onSuccess: (_, { payload, unitId }) => {
      qc.invalidateQueries({ queryKey: ['lancamentos', unitId] })
      log({
        entity: 'financial_entry',
        entityId: 'manual',
        action: 'lancamento_created',
        metadata: { tipo: payload.tipo, categoria: payload.categoria, valor: payload.valor },
      })
    },
  })
}

export function useDeleteLancamento() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, unitId }: { id: string; unitId: string | null }) => {
      let q = sb()
        .from('financial_entries')
        .delete()
        .eq('id', id)
        .is('ecu_job_id', null)
      q = unitId === null ? q.is('unit_id', null) : q.eq('unit_id', unitId)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: (_, { unitId }) => {
      qc.invalidateQueries({ queryKey: ['lancamentos', unitId] })
    },
  })
}
