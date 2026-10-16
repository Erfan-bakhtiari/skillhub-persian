import { expect, test } from '@playwright/test'
import { setEnglishLocale } from './helpers/auth-fixtures'

test.describe('Marketplace navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setEnglishLocale(page)
    await page.route(/\/api\/(?:web|v1)\//, async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/auth/me')) {
        await route.fulfill({ status: 401, json: { code: 401, data: null } })
        return
      }
      const data = path.endsWith('/skills') ? { items: [], total: 0, page: 0, size: 12 } : []
      await route.fulfill({ json: { code: 0, msg: 'Success', data } })
    })
  })

  for (const path of ['/', '/skills']) {
    test(`opens the marketplace from ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/search\?q=&sort=newest&page=0&starredOnly=false$/)
      await expect(page.getByPlaceholder('Search skills...')).toBeVisible()
      await expect(page.locator('header nav').getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
      await expect(page.locator('header nav').getByRole('link', { name: 'Skill Marketplace', exact: true })).toBeVisible()
    })
  }

  test('returns to the marketplace through the brand link', async ({ page }) => {
    await page.goto('/suites')
    await page.locator('header').getByRole('link', { name: 'SkillHub', exact: true }).click()
    await expect(page).toHaveURL(/\/search\?q=&sort=newest&page=0&starredOnly=false$/)
  })

  test('keeps the marketplace and mobile navigation within a 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByPlaceholder('Search skills...')).toBeVisible()
    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await expect(page.getByRole('link', { name: 'Skill Marketplace', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
