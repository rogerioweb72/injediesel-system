import { test, expect } from '@playwright/test'
import { loginFranchise } from './helpers/login'

test.describe('FRANQUIA — LOGIN E MÓDULOS', () => {
  test('login de franqueado redireciona para dashboard', async ({ page }) => {
    await loginFranchise(page)
    // URL padrão: /{unitSlug}/{agentSlug}/dashboard
    await expect(page).toHaveURL(/\/[^/]+\/[^/]+\/dashboard/, { timeout: 15000 })
  })

  test('franqueado vê sidebar', async ({ page }) => {
    await loginFranchise(page)
    await expect(page.locator('aside').first()).toBeVisible({ timeout: 10000 })
  })

  test('franqueado acessa arquivos ECU', async ({ page }) => {
    await loginFranchise(page)
    const parts = page.url().replace('http://localhost:5173', '').split('/')
    const unitSlug = parts[1]
    const agentSlug = parts[2]
    await page.goto(`/${unitSlug}/${agentSlug}/arquivos`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 })
  })

  test('franqueado acessa clientes', async ({ page }) => {
    await loginFranchise(page)
    const parts = page.url().replace('http://localhost:5173', '').split('/')
    const unitSlug = parts[1]
    const agentSlug = parts[2]
    await page.goto(`/${unitSlug}/${agentSlug}/clientes`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 })
  })

  test('franqueado não acessa dados de outra unidade', async ({ page }) => {
    await loginFranchise(page)
    // Tenta rota de matriz inválida para este usuário
    await page.goto('/rogerio-lima/financeiro')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    const url = page.url()
    // Deve redirecionar ou mostrar acesso negado — nunca renderizar financeiro
    const blocked = url.includes('login') || url.includes('acesso-negado') || !url.includes('financeiro')
    expect(blocked).toBe(true)
  })
})
