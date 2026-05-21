import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'

const mockResponse = {
  razao_social: 'EMPRESA TESTE LTDA',
  logradouro: 'Av. Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  municipio: 'São Paulo',
  uf: 'SP',
  cep: '01310-100',
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useCnpjLookup', () => {
  it('estado inicial é idle', () => {
    const { result } = renderHook(() => useCnpjLookup())
    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
  })

  it('retorna dados ao buscar CNPJ válido', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('11222333000181')
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data?.razao_social).toBe('EMPRESA TESTE LTDA')
  })

  it('define status error quando API falha', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('11222333000181')
    })
    expect(result.current.status).toBe('error')
    expect(result.current.data).toBeNull()
  })

  it('não busca se CNPJ inválido', async () => {
    const { result } = renderHook(() => useCnpjLookup())
    await act(async () => {
      await result.current.lookup('123')
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})
