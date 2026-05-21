import { useState, useCallback } from 'react'

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useCepLookup() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<CepData | null>(null)

  const lookup = useCallback(async (raw: string) => {
    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) return
    setStatus('loading')
    setData(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const json = await res.json()
      if (json.erro) throw new Error('not_found')
      setData(json as CepData)
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
