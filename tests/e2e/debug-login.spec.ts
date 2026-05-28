import { test } from '@playwright/test'

test('debug login 500', async ({ page }) => {
  const failed: string[] = []
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
  
  await page.goto('/appmax')
  await page.fill('#email', 'web72web@gmail.com')
  await page.fill('#password', 'webteste10')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(6000)
  
  console.log('URL:', page.url())
  console.log('Failed requests:', JSON.stringify(failed, null, 2))
})
