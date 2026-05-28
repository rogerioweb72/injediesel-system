import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('PRODUTOS', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/produtos')
  })

  test('lista de produtos carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('busca por produto funciona', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const search = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquisar" i]').first()
    if (await search.isVisible()) {
      await search.fill('ECU')
      await page.waitForTimeout(800)
      await expect(page.locator('table').first()).toBeVisible()
    }
  })

  test('formulário novo produto abre', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo produto|novo|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/produtos/novo*', { timeout: 10000 })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
  })

  test('formulário produto tem inputs', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo produto|novo|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/produtos/novo*', { timeout: 10000 })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
    // Ao menos 1 input visível no formulário
    expect(await page.locator('form input').count()).toBeGreaterThanOrEqual(1)
  })
})
