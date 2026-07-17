import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import type { AppUser } from '@/types/app'
import LoginParceiro from '@/pages/LoginParceiro'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('@/hooks/useMyUnit', () => ({
  useMyUnit: () => ({ data: undefined, isLoading: false }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const mockProfile: AppUser = {
  id: 'u1',
  name: 'Fulano Teste',
  email: 'fulano@teste.com',
  role: 'franchise_manager',
  active: true,
}

// Simula exatamente o cenário real reportado: a página é lazy-loaded e monta com o
// hash de convite/recovery ainda presente na URL. Sem o estado "awaitingSession", o
// form de login normal aparecia na tela até o usuário dar F5 manualmente — porque
// nada segurava a UI enquanto a sessão (processada de forma assíncrona pelo
// useAuth() do RootLayout, fora desta árvore) ainda não tinha chegado ao store.
describe('LoginParceiro — timing de estabelecimento de sessão (FIX 2)', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, user: null, profile: null })
    window.location.hash = '#access_token=fake-token&type=invite'
  })

  afterEach(() => {
    window.location.hash = ''
    vi.useRealTimers()
  })

  it('mostra "Entrando..." e NÃO o form de login enquanto a sessão ainda não chegou', async () => {
    
    renderWithProviders(<LoginParceiro />)

    expect(screen.getByText('Entrando...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('sua-unidade@injediesel.com')).not.toBeInTheDocument()
  })

  it('some do "Entrando..." assim que a sessão chega, sem precisar de F5', async () => {
    
    renderWithProviders(<LoginParceiro />)
    expect(screen.getByText('Entrando...')).toBeInTheDocument()

    act(() => {
      useAuthStore.setState({
        session: { access_token: 'x', user: { id: 'u1' } } as never,
        user: { id: 'u1' } as never,
        profile: mockProfile,
      })
    })

    await waitFor(() => {
      expect(screen.queryByText('Entrando...')).not.toBeInTheDocument()
    })
  })

  it('após 8s sem sessão, desiste e mostra o form de login com aviso de link expirado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    
    renderWithProviders(<LoginParceiro />)
    expect(screen.getByText('Entrando...')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.queryByText('Entrando...')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('sua-unidade@injediesel.com')).toBeInTheDocument()
    expect(screen.getByText(/Link expirado ou já utilizado/)).toBeInTheDocument()
  })

  it('sem token de auth no hash, mostra o form de login normalmente (sem tela de loading)', async () => {
    window.location.hash = ''
    
    renderWithProviders(<LoginParceiro />)

    expect(screen.queryByText('Entrando...')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('sua-unidade@injediesel.com')).toBeInTheDocument()
  })
})
