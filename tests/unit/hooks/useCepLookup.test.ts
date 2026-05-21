import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCepLookup } from '@/hooks/useCepLookup'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useCepLookup', () => {
  it('estado inicial é idle', () => {
    const { result } = renderHook(() => useCepLookup())
    expect(result.current.status).toBe('idle')
  })

  it('preenche dados ao encontrar CEP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Av. Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    } as Response)

    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('01310100')
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data?.logradouro).toBe('Av. Paulista')
    expect(result.current.data?.localidade).toBe('São Paulo')
  })

  it('define error quando ViaCEP retorna erro', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response)

    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('99999999')
    })
    expect(result.current.status).toBe('error')
  })

  it('ignora CEP com menos de 8 dígitos', async () => {
    const { result } = renderHook(() => useCepLookup())
    await act(async () => {
      await result.current.lookup('0131010')
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})
