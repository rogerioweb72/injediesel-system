import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useAuthStore } from '@/stores/auth'
import type { AppUser } from '@/types/app'

const adminProfile: AppUser = {
  id: '1', name: 'Admin', email: 'a@b.com', role: 'company_admin', active: true,
}
const operatorProfile: AppUser = {
  id: '2', name: 'Op', email: 'o@b.com', role: 'unit_operator', active: true,
}

describe('RoleGuard', () => {
  it('renderiza filhos quando role permitido', () => {
    useAuthStore.setState({ profile: adminProfile })
    render(
      <RoleGuard roles={['company_admin']}>
        <span>Conteúdo secreto</span>
      </RoleGuard>
    )
    expect(screen.getByText('Conteúdo secreto')).toBeInTheDocument()
  })

  it('não renderiza filhos quando role não permitido', () => {
    useAuthStore.setState({ profile: operatorProfile })
    render(
      <RoleGuard roles={['company_admin']}>
        <span>Conteúdo secreto</span>
      </RoleGuard>
    )
    expect(screen.queryByText('Conteúdo secreto')).not.toBeInTheDocument()
  })

  it('renderiza fallback quando role não permitido', () => {
    useAuthStore.setState({ profile: operatorProfile })
    render(
      <RoleGuard roles={['company_admin']} fallback={<span>Sem acesso</span>}>
        <span>Conteúdo secreto</span>
      </RoleGuard>
    )
    expect(screen.getByText('Sem acesso')).toBeInTheDocument()
  })
})
