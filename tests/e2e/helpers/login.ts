import { Page } from '@playwright/test'

export const MATRIX_EMAIL    = 'web72web@gmail.com'
export const MATRIX_PASSWORD = 'webteste10'
export const FRANCHISE_EMAIL    = 'midia@web72.com.br'
export const FRANCHISE_PASSWORD = 'webteste10'

export async function loginMatrix(page: Page) {
  await page.goto('/appmax')
  await page.fill('#email', MATRIX_EMAIL)
  await page.fill('#password', MATRIX_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**\/dashboard', { timeout: 20000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 })
}

export async function loginFranchise(page: Page) {
  await page.goto('/login')
  await page.fill('#email', FRANCHISE_EMAIL)
  await page.fill('#password', FRANCHISE_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**\/dashboard', { timeout: 20000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 })
}

/**
 * Navega para um módulo via link da sidebar (client-side routing — preserva auth state).
 * Não usar page.goto() para rotas autenticadas — provoca reload que perde Zustand/Supabase.
 */
export async function navigateTo(page: Page, path: string) {
  const link = page.locator(`a[href*="${path}"]`).first()
  await link.click()
  await page.waitForURL(`**${path}*`, { timeout: 10000 })
  await page.waitForLoadState('networkidle', { timeout: 12000 })
}

export async function logout(page: Page) {
  // avatar trigger: button.rounded-full in header
  await page.locator('button.rounded-full').first().click()
  await page.getByRole('menuitem', { name: /Sair/i }).click()
  await page.waitForURL(/\/(appmax|login)/, { timeout: 8000 })
}

export function baseUrl(page: Page): string {
  const url = page.url().replace('http://localhost:5173', '')
  const parts = url.split('/')
  return `/${parts[1]}`
}
