import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { FranchiseeProfile } from './useFranchiseeProfile'

type ProfileUpdateData = Partial<Omit<FranchiseeProfile, 'id'>>

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('profiles')
        .update(data)
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-profile', user?.id] })
    },
  })
}
