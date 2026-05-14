import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

describe('cn', () => {
  it('merge classes corretamente', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })
  it('resolve conflito tailwind', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})

describe('formatCurrency', () => {
  it('formata valor em BRL', () => {
    expect(formatCurrency(1500)).toContain('1.500')
    expect(formatCurrency(1500)).toContain('R$')
  })
})

describe('formatDate', () => {
  it('formata data em pt-BR', () => {
    expect(formatDate('2026-05-14')).toBe('14/05/2026')
  })
})
