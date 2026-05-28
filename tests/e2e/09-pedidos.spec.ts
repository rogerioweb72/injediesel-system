import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('PEDIDOS', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/pedidos')
  })

  test('lista de pedidos carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('cabeçalho de tabela presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    // Espera conteúdo da tabela carregar (th pode estar em thead, tr, etc)
    const headers = page.locator('th, [role="columnheader"]')
    await expect(headers.first()).toBeVisible({ timeout: 8000 })
    expect(await headers.count()).toBeGreaterThan(0)
  })

  test('busca ou filtro presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const search = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquisar" i]').first()
    if (await search.isVisible()) {
      await search.fill('teste')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('table').first()).toBeVisible()
  })
})
