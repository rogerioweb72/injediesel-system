import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { useMyUnit } from '@/hooks/useMyUnit'
import { playNewFileSound } from '@/lib/notificationSound'
import { showFileNotification } from '@/lib/browserNotify'

// Alerta de arquivo novo/concluído em TEMPO REAL — dispara no instante em que
// o banco registra a mudança (via Supabase Realtime, WebSocket), e não mais
// só depois que a página é atualizada ou a aba volta a ter foco. Continua
// funcionando com a aba minimizada/em segundo plano, desde que o navegador
// esteja aberto (o WebSocket permanece ativo).
//
// Substitui a antiga comparação de contagem (poll a cada 30s + diff) como
// gatilho do som — aquele polling do TanStack Query não roda em aba em
// background, o que causava o atraso reportado.
export function useEcuJobRealtimeAlert(): void {
  const { profile, isMatrixUser, isFranchiseUser } = useProfile()
  const { data: myUnit } = useMyUnit()
  const qc = useQueryClient()
  const isMatrix = isMatrixUser()
  const isFranchise = isFranchiseUser()
  const unitId = myUnit?.unit_id

  type JobRow = { id: string; status: string; unit_id: string | null; created_by_matrix?: boolean }

  useEffect(() => {
    if (!profile?.id) return
    if (isFranchise && !unitId) return // aguarda unidade resolver antes de assinar

    const channel = supabase
      .channel(`ecu-jobs-alert-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecu_jobs' },
        (payload) => {
          const row = payload.new as JobRow | undefined
          const old = payload.old as Partial<JobRow> | undefined
          if (!row) return

          let relevant = false
          let title = ''
          let body = ''

          if (isMatrix) {
            // Matriz: novo arquivo recebido de uma franquia (job criado ou
            // voltou para "recebido") — status anterior era diferente.
            if (row.status === 'recebido' && row.unit_id && old?.status !== 'recebido') {
              relevant = true
              title = 'Novo arquivo recebido'
              body = 'Um franqueado enviou um arquivo para processamento.'
            }
          } else if (isFranchise && row.unit_id === unitId) {
            // Franquia: job da própria unidade concluído pela matriz.
            if (row.status === 'concluido' && old?.status !== 'concluido') {
              relevant = true
              title = 'Arquivo concluído'
              body = 'Seu arquivo foi processado e já está disponível para download.'
            }
          }

          if (!relevant) return

          qc.invalidateQueries({ queryKey: ['unseen-jobs'] })
          qc.invalidateQueries({ queryKey: ['pending-jobs-matrix'] })
          qc.invalidateQueries({ queryKey: ['new-franchise-jobs-count'] })
          qc.invalidateQueries({ queryKey: ['new-matrix-created-jobs-count'] })
          playNewFileSound()
          showFileNotification(title, body)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, isMatrix, isFranchise, unitId, qc])
}
