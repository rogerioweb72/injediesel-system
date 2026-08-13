import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Vídeo de boas-vindas da Central de Ajuda, editável pela matriz
// (MatrizAjudaPage.tsx, via useUpdateCompanySettings). Leitura pela franquia
// segue o mesmo padrão de useSupportWhatsapp.ts: vem do banco via RPC
// SECURITY DEFINER autenticada (company_settings não tem SELECT liberado
// pra franquia), nunca hardcoded no bundle. Retorna null se não configurado
// — o componente simplesmente não renderiza o banner.
export function useWelcomeVideoUrl() {
  return useQuery({
    queryKey: ['welcome-video-url'],
    staleTime: 300_000,
    queryFn: async (): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_welcome_video_url')
      if (error) return null
      const url = String(data ?? '').trim()
      return url || null
    },
  })
}
