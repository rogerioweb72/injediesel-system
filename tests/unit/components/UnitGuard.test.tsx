import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UnitGuard } from '@/components/auth/UnitGuard'
import { useAuthStore } from '@/stores/auth'

const mockSession = { access_token: 'tok-abc' } as never
const franchiseProfile = {
  id: 'user-1', name: 'João Silva', email: 'joao@test.com',
  role: 'franchise_manager' as const, active: true,
}

function mockFetch(unitName: string | null) {
  const rows = unitName ? [{ franchise_units: { name: unitName } }] : []
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(rows),
  }))
}

function renderGuard(unitSlug: string) {
  return render(
    <MemoryRouter>
      <UnitGuard unitSlug={unitSlug}>
        <span>Protected</span>
      </UnitGuard>
    </MemoryRouter>,
  )
}

describe('UnitGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: mockSession, profile: franchiseProfile })
    vi.restoreAllMocks()
  })

  it('does not render children while fetch is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderGuard('joao-silva')
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('renders children when unitSlug matches', async () => {
    mockFetch('João Silva')
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(screen.getByText('Protected')).toBeInTheDocument()
    })
  })

  it('does not render children when unitSlug mismatches', async () => {
    mockFetch('Outra Unidade')
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('does not render children when unit not found in DB', async () => {
    mockFetch(null)
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('does not render children when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    renderGuard('joao-silva')
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('calls fetch with correct user_id and auth token', async () => {
    mockFetch('João Silva')
    renderGuard('joao-silva')
    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=eq.user-1'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    )
  })
})
