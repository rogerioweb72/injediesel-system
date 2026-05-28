import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'

test.describe('COLABORADORES (CONFIGURAÇÕES)', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/configuracoes')
  })

  test('página configurações carrega', async ({ page }) => {
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('aba Usuários presente', async ({ page }) => {
    const tab = page.locator('[role="tab"]').filter({ hasText: /^Usuários$/ }).first()
    await expect(tab).toBeVisible({ timeout: 8000 })
  })

  test('aba Empresa presente', async ({ page }) => {
    const tab = page.locator('[role="tab"]').filter({ hasText: /^Empresa$/ }).first()
    await expect(tab).toBeVisible({ timeout: 8000 })
  })

  test('botão Convidar Usuário presente', async ({ page }) => {
    const inviteBtn = page.locator('button').filter({ hasText: /convidar|invite/i }).first()
    await expect(inviteBtn).toBeVisible({ timeout: 8000 })
  })

  test('lista de usuários visível com nome e cargo', async ({ page }) => {
    await expect(page.locator('text=Rogerio Lima').first()).toBeVisible({ timeout: 10000 })
  })
})
