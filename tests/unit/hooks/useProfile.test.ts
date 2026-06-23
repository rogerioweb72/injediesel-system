import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { useProfile } from '@/hooks/useProfile'
import { renderHook } from '@testing-library/react'
import type { AppUser } from '@/types/app'

const mockProfile: AppUser = {
  id: 'test-id',
  name: 'Admin Teste',
  email: 'admin@promax.com',
  role: 'company_admin',
  active: true,
}

describe('useProfile', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: mockProfile })
  })

  it('hasRole retorna true para role correta', () => {
    const { result } = renderHook(() => useProfile())
    expect(result.current.hasRole('company_admin')).toBe(true)
  })

  it('hasRole retorna false para role incorreta', () => {
    const { result } = renderHook(() => useProfile())
    expect(result.current.hasRole('unit_operator')).toBe(false)
  })

  it('isMatrixUser retorna true para company_admin', () => {
    const { result } = renderHook(() => useProfile())
    expect(result.current.isMatrixUser()).toBe(true)
  })

  it('isMatrixUser retorna false para unit_operator', () => {
    useAuthStore.setState({ profile: { ...mockProfile, role: 'unit_operator' } })
    const { result } = renderHook(() => useProfile())
    expect(result.current.isMatrixUser()).toBe(false)
  })
})
