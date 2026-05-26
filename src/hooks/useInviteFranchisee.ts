import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface InvitePayload {
  email: string
  name: string
  unit_id: string
  role: 'franchise_manager' | 'unit_operator'
}

export function useInviteFranchisee() {
  return useMutation({
    mutationFn: async (payload: InvitePayload) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-franchisee`,
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
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar convite')
      return json
    },
  })
}
