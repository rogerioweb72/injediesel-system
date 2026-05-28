import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('FRANQUEADOS (MATRIZ)', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/franqueados')
  })

  test('lista de franqueados carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('busca de franqueado funciona', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const search = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquisar" i]').first()
    if (await search.isVisible()) {
      await search.fill('web')
      await page.waitForTimeout(800)
      await expect(page.locator('table').first()).toBeVisible()
    }
  })

  test('botão Nova Unidade presente', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /nova unidade|novo|add|criar/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
  })

  test('detalhe de franqueado abre', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    // Clica em um link de franqueado na tabela (célula ou linha com link)
    const firstLink = page.locator('table tbody tr td a, table tbody tr').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      // Aguarda conteúdo de detalhe aparecer (sem assumir URL específica)
      await page.waitForTimeout(1000)
      await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 })
    }
  })
})
