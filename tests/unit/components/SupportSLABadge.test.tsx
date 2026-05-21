// tests/unit/components/SupportSLABadge.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SupportSLABadge } from '@/components/support/SupportSLABadge'

describe('SupportSLABadge', () => {
  const now = new Date('2026-05-21T10:00:00Z')

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now) })
  afterEach(() => { vi.useRealTimers() })

  it('mostra "Sem SLA" quando slaAt é null', () => {
    render(<SupportSLABadge slaAt={null} />)
    expect(screen.getByText('Sem SLA')).toBeInTheDocument()
  })

  it('aplica text-green-400 quando mais de 4h restantes', () => {
    const future = new Date(now.getTime() + 5 * 3600 * 1000).toISOString()
    const { container } = render(<SupportSLABadge slaAt={future} />)
    expect(container.firstChild).toHaveClass('text-green-400')
  })

  it('aplica text-amber-400 quando entre 0 e 4h restantes', () => {
    const soon = new Date(now.getTime() + 2 * 3600 * 1000).toISOString()
    const { container } = render(<SupportSLABadge slaAt={soon} />)
    expect(container.firstChild).toHaveClass('text-amber-400')
  })

  it('aplica text-red-400 quando SLA vencido', () => {
    const past = new Date(now.getTime() - 3600 * 1000).toISOString()
    const { container } = render(<SupportSLABadge slaAt={past} />)
    expect(container.firstChild).toHaveClass('text-red-400')
  })

  it('mostra "SLA vencido" quando vencido', () => {
    const past = new Date(now.getTime() - 3600 * 1000).toISOString()
    render(<SupportSLABadge slaAt={past} />)
    expect(screen.getByText('SLA vencido')).toBeInTheDocument()
  })
})
