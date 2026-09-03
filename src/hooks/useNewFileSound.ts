import { useEffect, useRef } from 'react'
import { useUnseenJobs } from '@/hooks/useUnseenJobs'
import { playNewFileSound } from '@/lib/notificationSound'

// Toca o som quando a contagem de arquivos não vistos AUMENTA (chegou arquivo novo).
// Fonte = useUnseenJobs (mesma do badge; matriz = novos uploads, franquia = entregas).
export function useNewFileSound(): void {
  const { count } = useUnseenJobs()
  const prev = useRef<number | null>(null)

  useEffect(() => {
    const p = prev.current
    prev.current = count
    if (p == null) return          // primeira carga — não toca
    if (count > p) playNewFileSound()  // aumentou → arquivo novo chegou
  }, [count])
}
