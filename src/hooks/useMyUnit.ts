import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useProfile } from '@/hooks/useProfile'

/**
 * Returns the franchise unit of the currently logged-in user.
 * Matrix users (company_admin, operations_admin, etc.) return null.
 * Franchise users return their unit_id from user_unit_roles.
 */
export function useMyUnit() {
  const user = useAuthStore((s) => s.user)
  const { isMatrixUser } = useProfile()

  return useQuery({
    queryKey: ['my-unit', user?.id],
    enabled: !!user && !isMatrixUser(),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_unit_roles')
        .select(`unit_id, franchise_units(
  id, name, city, state, cep, logradouro, numero, complemento, bairro,
  contract_type, contract_start_date, contract_end_date,
  contract_blocked, contract_blocked_reason,
  razao_social, cnpj, inscricao_estadual, data_abertura,
  plan, financial_status, file_limit,
  commercial_phone, commercial_email, business_hours, main_technician
)`)
        .eq('user_id', user!.id)
        .single()
      if (error) return null
      return data as {
        unit_id: string
        franchise_units: {
          id: string; name: string
          city: string | null; state: string | null
          cep: string | null; logradouro: string | null
          numero: string | null; complemento: string | null; bairro: string | null
          contract_type: 'full' | 'linha_leve'
          contract_start_date: string | null
          contract_end_date: string | null
          contract_blocked: boolean
          contract_blocked_reason: string | null
          razao_social: string | null
          cnpj: string | null
          inscricao_estadual: string | null
          data_abertura: string | null
          plan: string | null
          financial_status: string | null
          file_limit: number | null
          commercial_phone: string | null
          commercial_email: string | null
          business_hours: string | null
          main_technician: { name: string; contact: string } | null
        }
      }
    },
  })
}
