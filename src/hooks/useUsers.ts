import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuditLog } from '@/hooks/useAuditLog'
import type { UserRole, PermissionEntry } from '@/types/app'

export interface Profile {
  id: string
  name: string
  role: UserRole
  active: boolean
  max_discount_pct: number
  discount_auth_hash: string | null
  commission_rate: number
  permissions: import('@/types/app').PermissionEntry[] | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('profiles')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useManagerDiscountHashes() {
  return useQuery({
    queryKey: ['manager-discount-hashes'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('profiles')
        .select('id, name, discount_auth_hash')
        .not('discount_auth_hash', 'is', null)
      if (error) throw error
      return (data as { id: string; name: string; discount_auth_hash: string }[])
    },
  })
}

interface UpdateUserPayload {
  id: string
  role?: UserRole
  active?: boolean
  name?: string
  max_discount_pct?: number
  discount_auth_hash?: string | null
  commission_rate?: number
  permissions?: import('@/types/app').PermissionEntry[] | null
}

interface InviteUserPayload {
  email: string
  name: string
  role: UserRole
  unit_id?: string | null
  commission_rate?: number
  max_discount_pct?: number
  permissions?: PermissionEntry[] | null
}

export function useInviteUser() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao convidar usuário')
      return { ...json, email: payload.email, name: payload.name, role: payload.role }
    },
    onSuccess: ({ user_id, name, role }: { user_id: string; name: string; role: string }) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      log({ entity: 'profile', entityId: user_id, action: 'invited', metadata: { name, role } })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async ({ id, ...fields }: UpdateUserPayload) => {
      const { error } = await sb().from('profiles').update(fields).eq('id', id)
      if (error) throw error
      return { id, ...fields }
    },
    onSuccess: ({ id, ...fields }) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['manager-discount-hashes'] })
      log({ entity: 'profile', entityId: id, action: 'updated', metadata: fields })
    },
  })
}
