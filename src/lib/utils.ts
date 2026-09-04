import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Teto sane p/ valores monetários. A coluna é numeric(12,2) (máx 9.999.999.999,99),
// mas nenhum preço de ECU nem lançamento realista passa de R$ 99.999.999,99 — cortar
// aqui bloqueia dedo-gordo/colagem que estourava o banco (numeric field overflow).
export const MAX_MONEY = 99_999_999.99

/**
 * Interpreta um valor monetário em pt-BR de forma robusta.
 * Aceita "80.000,00", "80000,00", "80000.00", "80.000", "80,5", "R$ 1.234,56".
 * Retorna número >= 0 ou null se inválido. NÃO aplica teto (ver parseMoneyCapped).
 */
export function parseBRLMoney(input: string): number | null {
  if (input == null) return null
  let s = String(input).trim().replace(/[R$\s]/g, '')
  if (!s) return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    // "1.234.567,89" → ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    // "1234,89" → vírgula = decimal
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')
    if (parts.length > 2) {
      // "1.234.567" → vários pontos = milhar
      s = s.replace(/\./g, '')
    } else if (parts[1]?.length === 3) {
      // "80.000" → 3 casas após o ponto = milhar, não decimal
      s = s.replace(/\./g, '')
    }
    // senão ("80.5", "80.00") = decimal, mantém
  }

  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * Parse + validação de teto. Retorna { value, error }.
 * error preenchido = não enviar ao banco (mostrar toast).
 */
export function parseMoneyCapped(input: string, max = MAX_MONEY): { value: number | null; error: string | null } {
  const n = parseBRLMoney(input)
  if (n == null) return { value: null, error: 'Valor inválido.' }
  if (n <= 0) return { value: null, error: 'Valor deve ser maior que zero.' }
  if (n > max) return { value: null, error: `Valor máximo permitido: ${formatCurrency(max)}.` }
  return { value: n, error: null }
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(typeof date === 'string' ? date + 'T12:00:00' : date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

