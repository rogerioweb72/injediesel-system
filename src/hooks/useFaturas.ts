// src/hooks/useFaturas.ts
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMyUnit } from '@/hooks/useMyUnit'

const sb = () => supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface FaturaItem {
  id: string
  service_type: string
  created_at: string
  amount_charged_by_matrix: number
  matrix_payment_status: 'em_aberto' | 'pago'
  matrix_paid_at: string | null
  customers: { name: string } | null
  vehicles: { brand: string; model: string } | null
  vehicle_info: { marca?: string; modelo?: string } | null
}

export function useFaturasEmAberto(unitId: string) {
  return useQuery({
    queryKey: ['faturas-em-aberto', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'em_aberto')
        .not('amount_charged_by_matrix', 'is', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FaturaItem[]
    },
    refetchInterval: 60_000,
  })
}

export function useFaturasPagas(unitId: string, mes?: string) {
  return useQuery({
    queryKey: ['faturas-pagas', unitId, mes],
    enabled: !!unitId,
    queryFn: async () => {
      let query = sb()
        .from('ecu_jobs')
        .select('id, service_type, created_at, amount_charged_by_matrix, matrix_payment_status, matrix_paid_at, customers(name), vehicles(brand, model), vehicle_info')
        .eq('unit_id', unitId)
        .eq('matrix_payment_status', 'pago')
        .not('amount_charged_by_matrix', 'is', null)
        .order('matrix_paid_at', { ascending: false })

      if (mes) {
        const [ano, m] = mes.split('-')
        const inicio = `${ano}-${m}-01`
        const fimDate = new Date(Number(ano), Number(m), 0)
        const fim = fimDate.toISOString().split('T')[0]
        query = query.gte('matrix_paid_at', inicio).lte('matrix_paid_at', fim + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as FaturaItem[]
    },
  })
}

export function useFaturasMyUnit() {
  const { data: myUnit } = useMyUnit()
  const unitId = myUnit?.unit_id ?? ''
  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const emAberto = useFaturasEmAberto(unitId)
  const pagosMesAtual = useFaturasPagas(unitId, mesAtual)
  const todosPageos  = useFaturasPagas(unitId)

  const resumo = useMemo(() => ({
    totalEmAberto:    emAberto.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    totalPagoMes:     pagosMesAtual.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    totalHistorico:   todosPageos.data?.reduce((s, i) => s + i.amount_charged_by_matrix, 0) ?? 0,
    qtdEmAberto:      emAberto.data?.length ?? 0,
  }), [emAberto.data, pagosMesAtual.data, todosPageos.data])

  return { unitId, emAberto, pagosMesAtual, todosPageos, resumo, isLoading: emAberto.isLoading }
}

export function fmtFatura(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function diasAberto(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function diasColor(dias: number): string {
  if (dias > 15) return '#ef4444'
  if (dias >= 5) return '#eab308'
  return 'hsl(var(--pm-gray-400))'
}
