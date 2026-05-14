import { test, expect } from '@playwright/test'

const VALID_EMAIL = process.env.TEST_EMAIL ?? 'admin@promaxtuner.com'
const VALID_PASS  = process.env.TEST_PASSWORD ?? 'senha-teste-123'

test.describe('Autenticação', () => {
  test('rota protegida redireciona para login', async ({ page }) => {
    await page.goto('/matriz/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('login com credencial inválida exibe erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'invalido@exemplo.com')
    await page.fill('#password', 'senhaerrada')
    await page.click('button[type="submit"]')
    await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
  })

  test('login válido redireciona para dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', VALID_EMAIL)
    await page.fill('#password', VALID_PASS)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/matriz/dashboard')
    await expect(page.getByText('Command Center')).toBeVisible()
  })

  test('logout redireciona para login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', VALID_EMAIL)
    await page.fill('#password', VALID_PASS)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/matriz/dashboard')
    await page.click('[title="Sair"]')
    await expect(page).toHaveURL('/login')
  })
})
