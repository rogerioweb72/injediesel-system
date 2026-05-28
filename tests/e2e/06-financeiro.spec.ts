import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('FINANCEIRO (LANÇAMENTOS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/financeiro')
  })

  test('página financeiro carrega com KPIs', async ({ page }) => {
    // Saldo, Receitas e Despesas são parágrafos no topo
    await expect(page.locator('text=Saldo do Período').first()).toBeVisible({ timeout: 10000 })
  })

  test('seção Lançamentos Manuais presente', async ({ page }) => {
    await expect(page.locator('text=Lançamentos Manuais').first()).toBeVisible({ timeout: 10000 })
  })

  test('botão Novo Lançamento presente', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /novo lan[çc]amento/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('modal novo lançamento abre', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /novo lan[çc]amento/i }).first()
    await newBtn.click()
    await page.waitForTimeout(800)
    // Modal customizado — div.fixed.inset-0 (não shadcn Dialog)
    const overlay = page.locator('div.fixed').first()
    await expect(overlay).toBeVisible({ timeout: 8000 })
  })

  test('filtros de tipo e status presentes', async ({ page }) => {
    await expect(page.locator('text=Lançamentos Manuais').first()).toBeVisible({ timeout: 20000 })
    // <select> HTML nativo com options — visível quando seção carrega
    await expect(page.locator('select').first()).toBeVisible({ timeout: 15000 })
  })
})
