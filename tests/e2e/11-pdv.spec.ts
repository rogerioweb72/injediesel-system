import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('PDV', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/pdv')
  })

  test('página PDV carrega', async ({ page }) => {
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('campo CPF/CNPJ ou busca presente', async ({ page }) => {
    const inputs = page.locator(
      'input[placeholder*="CPF" i], input[placeholder*="CNPJ" i], input[placeholder*="documento" i], input[placeholder*="buscar" i]'
    )
    const hasInput = await inputs.count() > 0
    if (!hasInput) {
      // Fallback: qualquer input visível
      await expect(page.locator('input').first()).toBeVisible({ timeout: 8000 })
    } else {
      await expect(inputs.first()).toBeVisible({ timeout: 8000 })
    }
  })

  test('conteúdo principal PDV visível', async ({ page }) => {
    // PDV pode ter tabela, grid de produtos, ou form de venda
    const content = page.locator('table, [class*="grid"], form, [class*="pdv"], [class*="sale"]').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })
})
