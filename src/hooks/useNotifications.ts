import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { useMyUnit } from '@/hooks/useMyUnit'
import { useUnseenJobs } from '@/hooks/useUnseenJobs'
import { useUnreadSupportCount } from '@/hooks/useSupportTickets'

export interface NotificationItem {
  key: string
  label: string
  sub: string
  count: number
  route: string
}

export function usePendingB2BCount() {
  const { isMatrixUser } = useProfile()
  return useQuery({
    queryKey: ['pending-b2b-count'],
    enabled: isMatrixUser(),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .select('id')
        .eq('status', 'aguardando_aprovacao')
        .not('unit_id', 'is', null)
      if (error) throw error
      return (data as { id: string }[]).length
    },
  })
}

export function useComprovatePendingCount() {
  const { isMatrixUser } = useProfile()
  return useQuery({
    queryKey: ['comprovante-pending-count'],
    enabled: isMatrixUser(),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .select('id')
        .eq('status', 'aguardando_pagamento')
        .not('comprovante_uploaded_at', 'is', null)
        .not('unit_id', 'is', null)
      if (error) throw error
      return (data as { id: string }[]).length
    },
  })
}

export function useFranchiseOrderUpdatesCount() {
  const { isFranchiseUser } = useProfile()
  const { data: myUnit } = useMyUnit()
  return useQuery({
    queryKey: ['franchise-order-updates', myUnit?.unit_id],
    enabled: isFranchiseUser() && !!myUnit?.unit_id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('orders')
        .select('id')
        .eq('unit_id', myUnit!.unit_id)
        .in('status', ['aprovado', 'aguardando_pagamento', 'em_separacao', 'enviado'])
      if (error) throw error
      return (data as { id: string }[]).length
    },
  })
}

export function useOverdueEcuJobsCount() {
  const { isFranchiseUser } = useProfile()
  const { data: myUnit } = useMyUnit()
  return useQuery({
    queryKey: ['overdue-ecu-jobs-count', myUnit?.unit_id],
    refetchInterval: 60_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('ecu_jobs')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'concluido')
        .neq('status', 'cancelado')
        .lt('created_at', cutoff)
      if (isFranchiseUser() && myUnit?.unit_id) {
        q = q.eq('unit_id', myUnit.unit_id)
      }
      const { count, error } = await q
      if (error) throw error
      return (count as number) ?? 0
    },
  })
}

export function useNotifications(prefix: string) {
  const { isFranchiseUser, isMatrixUser } = useProfile()
  const isFranchise = isFranchiseUser()
  const isMatrix = isMatrixUser()

  const { count: jobCount, label: jobLabel } = useUnseenJobs()
  const { data: supportCount = 0 } = useUnreadSupportCount()
  const { data: b2bCount = 0 } = usePendingB2BCount()
  const { data: orderUpdates = 0 } = useFranchiseOrderUpdatesCount()
  const { data: comprovantePending = 0 } = useComprovatePendingCount()
  const { data: overdueJobs = 0 } = useOverdueEcuJobsCount()

  const items: NotificationItem[] = []

  if (jobCount > 0) {
    items.push({
      key: 'jobs',
      label: isMatrix ? 'Arquivos aguardando' : 'Arquivos concluídos',
      sub: jobLabel,
      count: jobCount,
      route: `${prefix}/arquivos`,
    })
  }

  if (supportCount > 0) {
    items.push({
      key: 'support',
      label: 'Suporte',
      sub: `${supportCount} mensage${supportCount === 1 ? 'm' : 'ns'} não lida${supportCount === 1 ? '' : 's'}`,
      count: supportCount,
      route: `${prefix}/suporte`,
    })
  }

  if (isMatrix && b2bCount > 0) {
    items.push({
      key: 'b2b',
      label: 'Pedidos B2B',
      sub: `${b2bCount} pedido${b2bCount === 1 ? '' : 's'} aguardando aprovação`,
      count: b2bCount,
      route: `${prefix}/pedidos-b2b`,
    })
  }

  if (isMatrix && comprovantePending > 0) {
    items.push({
      key: 'comprovante',
      label: 'Comprovantes',
      sub: `${comprovantePending} comprovante${comprovantePending === 1 ? '' : 's'} aguardando verificação`,
      count: comprovantePending,
      route: `${prefix}/pedidos-b2b`,
    })
  }

  if (isFranchise && orderUpdates > 0) {
    items.push({
      key: 'orders',
      label: 'Pedidos',
      sub: `${orderUpdates} pedido${orderUpdates === 1 ? '' : 's'} em andamento`,
      count: orderUpdates,
      route: `${prefix}/pedidos`,
    })
  }

  if (overdueJobs > 0) {
    items.push({
      key: 'overdue',
      label: 'Arquivos em Aberto',
      sub: `${overdueJobs} arquivo${overdueJobs === 1 ? '' : 's'} aberto${overdueJobs === 1 ? '' : 's'} há mais de 12h`,
      count: overdueJobs,
      route: `${prefix}/arquivos`,
    })
  }

  const total = items.reduce((s, i) => s + i.count, 0)

  return { total, items, jobCount, supportCount, b2bCount, orderUpdates, comprovantePending, overdueJobs }
}
