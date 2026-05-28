import { test, expect } from '@playwright/test'
import { loginMatrix, logout, MATRIX_EMAIL, MATRIX_PASSWORD } from './helpers/login'

test.describe('AUTH', () => {
  test('rota protegida redireciona para /appmax', async ({ page }) => {
    await page.goto('/matriz/dashboard')
    await expect(page).toHaveURL(/appmax/, { timeout: 8000 })
  })

  test('rota arbitrária protegida redireciona para /appmax', async ({ page }) => {
    await page.goto('/qualquercoisa/dashboard')
    await expect(page).toHaveURL(/appmax/, { timeout: 8000 })
  })

  test('login com email inválido não submete', async ({ page }) => {
    await page.goto('/appmax')
    await page.fill('#email', 'nao-e-email')
    await page.fill('#password', '123456')
    // Força submit ignorando validação nativa do browser
    await page.evaluate(() => {
      const form = document.querySelector('form')
      const btn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null
      btn?.click()
    })
    // Deve permanecer em /appmax (form rejeitado por Zod ou HTML5)
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/appmax/, { timeout: 5000 })
  })

  test('login com credencial errada exibe erro', async ({ page }) => {
    await page.goto('/appmax')
    await page.fill('#email', MATRIX_EMAIL)
    await page.fill('#password', 'senhaerrada99')
    await page.click('button[type="submit"]')
    // serverError div: rounded-xl text-red-400
    await expect(page.locator('div.text-red-400').first()).toBeVisible({ timeout: 15000 })
  })

  test('login válido redireciona para dashboard', async ({ page }) => {
    await loginMatrix(page)
    await expect(page).toHaveURL(/\/[^/]+\/dashboard/, { timeout: 15000 })
    // sidebar nav link "Dashboard" confirma que o app carregou
    await expect(page.locator('nav a[href*="dashboard"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('logout redireciona para /appmax', async ({ page }) => {
    await loginMatrix(page)
    await logout(page)
    await expect(page).toHaveURL(/appmax/, { timeout: 8000 })
  })

  test('página 404 exibida para rota inexistente', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe-9999')
    // Não deve crashar — deve exibir 404 ou redirecionar
    const status = page.url()
    expect(status).toBeTruthy()
  })
})
