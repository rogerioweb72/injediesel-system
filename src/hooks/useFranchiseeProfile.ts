import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type FranchiseeProfile = {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  avatar_url: string | null
  cep: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export function useFranchiseeProfile() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['franchisee-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, name, phone, birth_date, avatar_url, cep, street, address_number, complement, neighborhood, city, state')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as FranchiseeProfile
    },
  })
}
