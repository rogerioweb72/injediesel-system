import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('SUPORTE (TICKETS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/suporte')
  })

  test('lista de tickets carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('botão novo ticket presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|abrir|criar/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
  })

  test('formulário novo ticket abre', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|abrir|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/suporte/novo*', { timeout: 10000 })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
  })

  test('formulário tem campo de texto', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|abrir|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/suporte/novo*', { timeout: 10000 })
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 8000 })
  })

  test('formulário tem área de descrição', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|abrir|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/suporte/novo*', { timeout: 10000 })
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 8000 })
  })
})
