import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

for (const savedLanguage of [null, 'zh-CN', 'ru']) {
  test(`defaults to Persian with saved preference ${savedLanguage}`, async ({ page }) => {
    await page.addInitScript((language) => {
      if (language) localStorage.setItem('i18nextLng', language)
    }, savedLanguage)
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByRole('button', { name: 'فارسی', exact: true }).click()
    await expect(page.getByRole('menuitem')).toHaveText(['فارسی', 'English'])
  })
}

test('remembers English across reloads and switches back to Persian', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('button', { name: 'فارسی', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await page.reload()
  await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['فارسی', 'English'])
  await page.getByRole('menuitem', { name: 'فارسی', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})
