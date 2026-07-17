import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfileDialog } from '@/components/shared/ProfileDialog'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { updateUser: vi.fn() },
  },
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient()
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Simula o TopBar real: modal forçado renderizado por cima de botões do dashboard
// (sino de notificação, avatar, logout) — o teste de Tab precisa desses elementos
// "atrás" para provar que o foco não escapa para eles.
function DashboardBehindModal() {
  return (
    <>
      <button>Notificações</button>
      <button>Avatar</button>
      <button>Sair</button>
      <ProfileDialog open onOpenChange={() => {}} forced />
    </>
  )
}

describe('ProfileDialog (forced) — não pode ser fechado no primeiro acesso', () => {
  beforeEach(() => {
    useAuthStore.setState({ hashInviteFlow: true })
  })

  it('ESC não fecha o modal', () => {
    renderWithProviders(<DashboardBehindModal />)
    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()
  })

  it('clique fora (no elemento atrás do overlay) não fecha o modal', () => {
    renderWithProviders(<DashboardBehindModal />)
    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Notificações'))
    fireEvent.click(document.body)

    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()
  })

  it('não existe botão Cancelar nem X de fechar no modal forçado', () => {
    renderWithProviders(<DashboardBehindModal />)
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('Tab não escapa do modal para os botões do dashboard atrás (botão de submit ainda desabilitado, campos vazios)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardBehindModal />)

    const senhaInput = screen.getByPlaceholderText('Mínimo 6 caracteres')
    const confirmInput = screen.getByPlaceholderText('Repita a senha')
    const dashboardButtons = ['Notificações', 'Avatar', 'Sair'].map(name => screen.getByText(name))

    senhaInput.focus()
    expect(document.activeElement).toBe(senhaInput)

    // com os campos vazios o botão de submit fica disabled — elementos disabled não
    // recebem foco via Tab do browser, então o trap só tem 2 elementos alcançáveis
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dashboardButtons).not.toContain(document.activeElement)
      expect([senhaInput, confirmInput]).toContain(document.activeElement)
    }

    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true })
      expect(dashboardButtons).not.toContain(document.activeElement)
      expect([senhaInput, confirmInput]).toContain(document.activeElement)
    }
  })

  it('Tab não escapa do modal para os botões do dashboard atrás (campos preenchidos, botão de submit habilitado)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardBehindModal />)

    const senhaInput = screen.getByPlaceholderText('Mínimo 6 caracteres')
    const confirmInput = screen.getByPlaceholderText('Repita a senha')
    const dashboardButtons = ['Notificações', 'Avatar', 'Sair'].map(name => screen.getByText(name))

    await user.type(senhaInput, '123456')
    await user.type(confirmInput, '123456')
    const submitButton = screen.getByRole('button', { name: /definir senha e continuar/i })
    expect(submitButton).toBeEnabled()

    senhaInput.focus()
    expect(document.activeElement).toBe(senhaInput)

    // agora os 3 elementos (senha, confirmar, submit) estão alcançáveis — percorre
    // bem além disso para garantir que o ciclo nunca escapa do modal
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dashboardButtons).not.toContain(document.activeElement)
      expect([senhaInput, confirmInput, submitButton]).toContain(document.activeElement)
    }

    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true })
      expect(dashboardButtons).not.toContain(document.activeElement)
      expect([senhaInput, confirmInput, submitButton]).toContain(document.activeElement)
    }
  })

  it('flag persistente: remontar o componente (simulando F5) com a mesma sessão mantém o modal aberto', () => {
    // Simula o que acontece de fato num F5: supabase-js re-hidrata a sessão do
    // localStorage, o JWT decodificado ainda carrega must_set_password=true (não foi
    // limpo porque a senha nunca foi definida), useMustSetPassword() volta a computar
    // true a partir do zero — sem nenhum estado React sobrevivendo ao reload.
    useAuthStore.setState({
      hashInviteFlow: false,
      user: { id: 'u1', user_metadata: { must_set_password: true } } as never,
    })

    const { unmount } = renderWithProviders(<DashboardBehindModal />)
    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()

    // "F5": desmonta a árvore inteira e remonta do zero, como um reload real faria —
    // sem passar nenhum estado local adiante, só o que está na store (que persistiria
    // via sessão do supabase-js num reload de verdade).
    unmount()
    renderWithProviders(<DashboardBehindModal />)

    expect(screen.getByText('Primeiro acesso')).toBeInTheDocument()
  })
})
