import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('DOWNLOAD ARQUIVOS ECU', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/arquivos')
  })

  test('job com status ready exibe botão download', async ({ page }) => {
    const readyRow = page.locator('tr').filter({ hasText: /pronto|ready|entregue|delivered/i }).first()
    if (await readyRow.count() > 0) {
      await readyRow.click()
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      const downloadBtn = page.locator('button, a').filter({ hasText: /download|baixar|entrega/i }).first()
      await expect(downloadBtn).toBeVisible({ timeout: 8000 })
    } else {
      // Sem job pronto: tabela carregou OK
      await expect(page.locator('table').first()).toBeVisible()
    }
  })

  test('detalhe de job abre sem crash', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      // Página de detalhe carregou
      await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 })
    } else {
      await expect(page.locator('table').first()).toBeVisible()
    }
  })
})
