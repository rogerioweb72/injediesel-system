import { useState, useCallback } from 'react'
import { validarCNPJ } from '@/lib/validators'

export interface CnpjData {
  razao_social: string
  logradouro: string
  numero: string
  bairro: string
  municipio: string
  uf: string
  cep: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useCnpjLookup() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<CnpjData | null>(null)

  const lookup = useCallback(async (raw: string) => {
    const cnpj = raw.replace(/\D/g, '')
    if (!validarCNPJ(cnpj)) return
    setStatus('loading')
    setData(null)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (!res.ok) throw new Error('not_found')
      const json = await res.json()
      setData(json as CnpjData)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
  }, [])

  return { status, data, lookup, reset }
}
