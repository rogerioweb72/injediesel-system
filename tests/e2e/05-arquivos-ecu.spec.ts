import { test, expect } from '@playwright/test'
import { loginMatrix, navigateTo } from './helpers/login'
import path from 'path'
import fs from 'fs'

test.describe('ARQUIVOS ECU', () => {
  test.beforeEach(async ({ page }) => {
    await loginMatrix(page)
    await navigateTo(page, '/arquivos')
  })

  test('lista de jobs ECU carrega', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
  })

  test('botão novo job presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|enviar|criar/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
  })

  test('formulário novo job ECU abre', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|enviar|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/arquivos/novo*', { timeout: 10000 })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 })
  })

  test('campo de upload de arquivo presente', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|enviar|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/arquivos/novo*', { timeout: 10000 })
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 10000 })
  })

  test('upload de arquivo binário simulado — campo aceita arquivo', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 12000 })
    const newBtn = page.locator('button, a').filter({ hasText: /novo|enviar|criar/i }).first()
    await newBtn.click()
    await page.waitForURL('**/arquivos/novo*', { timeout: 10000 })

    const tmpFile = path.join('/tmp', 'test-ecu.bin')
    fs.writeFileSync(tmpFile, Buffer.from('ECU_TEST_0000', 'utf8'))
    const fileInput = page.locator('input[type="file"]').first()
    const fileCount = await fileInput.count()
    if (fileCount > 0) {
      await fileInput.setInputFiles(tmpFile)
      await page.waitForTimeout(1500)
      // Verifica que a página ainda existe e não crashou (form ou main)
      await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 })
    }
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })
})
