import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// WhatsApp de suporte interno (franquias <-> matriz).
// SEGURANCA: o numero NAO fica no bundle. Vem do banco via RPC SECURITY DEFINER
// que so responde para usuario AUTENTICADO (anon nao le). Retorna null se nao logado
// ou nao configurado — o componente simplesmente nao renderiza o contato nesse caso.
export function useSupportWhatsapp() {
  return useQuery({
    queryKey: ['support-whatsapp'],
    staleTime: 300_000,
    queryFn: async (): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_support_whatsapp')
      if (error) return null
      const digits = String(data ?? '').replace(/\D/g, '')
      return digits.length >= 10 ? digits : null
    },
  })
}

// Formata "5545998560159" -> "(45) 99856-0159" (best-effort, BR).
export function formatBrWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, '')
  const local = d.startsWith('55') ? d.slice(2) : d
  if (local.length < 10) return digits
  const ddd = local.slice(0, 2)
  const rest = local.slice(2)
  const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)
  const end = rest.length === 9 ? rest.slice(5) : rest.slice(4)
  return `(${ddd}) ${mid}-${end}`
}
