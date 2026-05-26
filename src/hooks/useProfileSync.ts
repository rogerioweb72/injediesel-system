import { useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { syncProfile } from '@/lib/profileSync'

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 min — dentro do TTL do cache Supabase

/**
 * Monta um timer que re-verifica o profile do usuário a cada 5 minutos.
 * Garante que sessões longas (sem requests ativos) detectem revogações
 * de acesso ou desativações feitas pelo administrador.
 *
 * Deve ser montado uma única vez no RootLayout.
 */
export function useProfileSync() {
  const session = useAuthStore((s) => s.session)

  useEffect(() => {
    if (!session) return // sem sessão, nada a sincronizar

    const run = async () => {
      const result = await syncProfile()
      if (result === 'deactivated') {
        toast.error('Sua conta foi desativada. Contate o administrador.')
      } else if (result === 'not_found') {
        toast.error('Usuário não encontrado. Faça login novamente.')
      } else if (result === 'role_changed') {
        toast.warning('Suas permissões foram alteradas. A interface foi atualizada.')
      }
    }

    const timer = setInterval(run, SYNC_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [session])
}
