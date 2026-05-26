import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { useMyUnit } from '@/hooks/useMyUnit'

const lsKey = (userId: string) => `pm_seen_jobs_${userId}`

export function getSeenJobIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(lsKey(userId))
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function markJobSeenInStorage(userId: string, jobId: string) {
  const seen = getSeenJobIds(userId)
  if (seen.has(jobId)) return
  seen.add(jobId)
  localStorage.setItem(lsKey(userId), JSON.stringify([...seen]))
}

export function useMarkJobAsSeen(jobId: string | undefined) {
  const { profile, isFranchiseUser } = useProfile()
  const qc = useQueryClient()

  return () => {
    if (!isFranchiseUser() || !profile?.id || !jobId) return
    markJobSeenInStorage(profile.id, jobId)
    qc.invalidateQueries({ queryKey: ['unseen-jobs', profile.id] })
  }
}

interface UnseenResult {
  count: number
  unseenIds: Set<string>
  label: string
}

export function useUnseenJobs(): UnseenResult {
  const { profile, isFranchiseUser, isMatrixUser } = useProfile()
  const { data: myUnit } = useMyUnit()
  const isFranchise = isFranchiseUser()
  const isMatrix = isMatrixUser()

  // Franchise: jobs concluídos não vistos
  const { data: franchiseData } = useQuery({
    queryKey: ['unseen-jobs', profile?.id, myUnit?.unit_id],
    enabled: isFranchise && !!profile?.id && !!myUnit?.unit_id,
    refetchInterval: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('id')
        .eq('status', 'concluido')
        .eq('unit_id', myUnit!.unit_id)
      if (error) throw error
      const seen = getSeenJobIds(profile!.id)
      const unseenIds = new Set(
        (rows as { id: string }[]).filter(j => !seen.has(j.id)).map(j => j.id)
      )
      return { count: unseenIds.size, unseenIds }
    },
  })

  // Matrix: jobs aguardando processamento
  const { data: matrixData } = useQuery({
    queryKey: ['pending-jobs-matrix', profile?.id],
    enabled: isMatrix && !!profile?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from('ecu_jobs')
        .select('id')
        .eq('status', 'aguardando')
      if (error) throw error
      return { count: (rows as { id: string }[]).length, unseenIds: new Set<string>() }
    },
  })

  if (isFranchise) {
    const d = franchiseData ?? { count: 0, unseenIds: new Set<string>() }
    return { ...d, label: d.count === 1 ? '1 arquivo concluído' : `${d.count} arquivos concluídos` }
  }

  if (isMatrix) {
    const d = matrixData ?? { count: 0, unseenIds: new Set<string>() }
    return { ...d, label: d.count === 1 ? '1 arquivo aguardando' : `${d.count} arquivos aguardando` }
  }

  return { count: 0, unseenIds: new Set(), label: '' }
}
