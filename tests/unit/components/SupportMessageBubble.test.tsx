// tests/unit/components/SupportMessageBubble.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SupportMessageBubble } from '@/components/support/SupportMessageBubble'
import type { SupportMessage } from '@/hooks/useSupportTickets'

const base: SupportMessage = {
  id: '1', ticket_id: 't1', author_id: 'u1', body: 'Olá equipe',
  is_internal: false,
  attachment_r2_key: null, attachment_filename: null,
  attachment_mime: null, attachment_size_bytes: null,
  created_at: '2026-05-21T10:00:00Z',
  profiles: { name: 'João Silva' },
}

describe('SupportMessageBubble', () => {
  it('renderiza body da mensagem', () => {
    render(<SupportMessageBubble message={base} isOwn={false} onDownload={() => {}} />)
    expect(screen.getByText('Olá equipe')).toBeInTheDocument()
  })

  it('mostra nome do autor', () => {
    render(<SupportMessageBubble message={base} isOwn={false} onDownload={() => {}} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('mostra badge "Nota interna" para mensagem interna', () => {
    render(<SupportMessageBubble message={{ ...base, is_internal: true }} isOwn={false} onDownload={() => {}} />)
    expect(screen.getByText('Nota interna')).toBeInTheDocument()
  })

  it('não mostra badge "Nota interna" para mensagem pública', () => {
    render(<SupportMessageBubble message={base} isOwn={false} onDownload={() => {}} />)
    expect(screen.queryByText('Nota interna')).not.toBeInTheDocument()
  })

  it('mostra nome do arquivo quando há anexo', () => {
    const withAttachment: SupportMessage = {
      ...base,
      attachment_r2_key: 'support/t1/abc.pdf',
      attachment_filename: 'relatorio.pdf',
      attachment_mime: 'application/pdf',
      attachment_size_bytes: 2048,
    }
    render(<SupportMessageBubble message={withAttachment} isOwn={false} onDownload={() => {}} />)
    expect(screen.getByText('relatorio.pdf')).toBeInTheDocument()
  })

  it('chama onDownload ao clicar em download', () => {
    const onDownload = vi.fn()
    const withAttachment: SupportMessage = {
      ...base,
      attachment_r2_key: 'support/t1/abc.pdf',
      attachment_filename: 'relatorio.pdf',
      attachment_mime: 'application/pdf',
      attachment_size_bytes: 2048,
    }
    render(<SupportMessageBubble message={withAttachment} isOwn={false} onDownload={onDownload} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onDownload).toHaveBeenCalledWith('support/t1/abc.pdf', 't1', 'relatorio.pdf')
  })
})
