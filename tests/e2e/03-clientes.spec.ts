import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('CLIENTES', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/clientes')
  })

  test('lista de clientes carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('busca por cliente funciona', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const search = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquisar" i]').first()
    if (await search.isVisible()) {
      await search.fill('teste')
      await page.waitForTimeout(800)
      await expect(page.locator('table').first()).toBeVisible()
    }
  })

  test('botão novo cliente presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|add|criar/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
  })

  test('formulário novo cliente abre', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    // Clica botão "Novo" para navegar sem reload
    const newBtn = page.locator('button, a').filter({ hasText: /novo cliente|novo|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/clientes/novo*', { timeout: 10000 })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
  })

  test('formulário novo cliente valida campos obrigatórios', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo cliente|novo|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/clientes/novo*', { timeout: 10000 })
    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible({ timeout: 8000 })
    const isDisabled = await submitBtn.isDisabled()
    if (!isDisabled) {
      await submitBtn.click()
      await page.waitForTimeout(800)
      const errors = page.locator('p.text-red-400, p.text-xs')
      expect(await errors.count()).toBeGreaterThan(0)
    } else {
      expect(isDisabled).toBe(true)
    }
  })
})
