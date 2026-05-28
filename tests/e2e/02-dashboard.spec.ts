import { test, expect } from '@playwright/test'
import { loginMatrix } from './helpers/login'

test.describe('DASHBOARD', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    // já em /rogerio-lima/dashboard com networkidle
  })

  test('carrega Command Center — banner visível', async ({ page }) => {
    // O dashboard mostra greeting "Boa noite/dia, {nome}" no banner
    await expect(page.locator('header, [role="banner"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('KPI cards visíveis', async ({ page }) => {
    const cards = page.locator('.pm-kpi-card')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    expect(await cards.count()).toBeGreaterThanOrEqual(2)
  })

  test('sidebar visível', async ({ page }) => {
    await expect(page.locator('aside.pm-sidebar').first()).toBeVisible({ timeout: 8000 })
  })

  test('sem erros JS críticos no console', async ({ page }) => {
    const criticalErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text()
        if (
          !txt.includes('net::ERR') &&
          !txt.includes('Failed to fetch') &&
          !txt.includes('Failed to load resource') &&
          !txt.includes('favicon')
        ) {
          criticalErrors.push(txt)
        }
      }
    })
    await page.waitForTimeout(2000)
    expect(criticalErrors).toHaveLength(0)
  })
})
