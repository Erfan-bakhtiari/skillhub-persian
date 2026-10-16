import { expect, test, type Page } from '@playwright/test'
import type { SkillSummary } from '../src/api/types'

const version = { id: 1, version: '1.2.3', status: 'PUBLISHED', fileCount: 1, totalSize: 120, publishedAt: '2026-10-15T08:30:00Z', downloadAvailable: true }
const skill: SkillSummary = {
  id: 1, namespace: 'global', slug: 'persian-demo', displayName: 'مهارت نمونه', summary: 'نمونهٔ متن فارسی با نیم‌فاصله',
  downloadCount: 1200, starCount: 12, ratingAvg: 4.5, ratingCount: 2, updatedAt: '2026-10-15T08:30:00Z',
  canSubmitPromotion: false, visibility: 'PUBLIC', status: 'ACTIVE', headlineVersion: version, publishedVersion: version,
}
const readme = '# English heading\n\nEnglish package documentation.\n\nاین پاراگراف فارسی است.\n\n```js\nconst version = "1.2.3"\n```'

async function mockDiscovery(page: Page) {
  await page.route(/\/api\/(?:web|v1)\//, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const persian = route.request().headers()['accept-language']?.startsWith('fa')
    let data: unknown = []
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ status: 401, json: { code: 401, msg: 'Authentication required', data: null } })
      return
    }
    else if (path === '/api/web/skills') data = { items: [skill], total: 1, page: 0, size: 12 }
    else if (path === '/api/web/labels') data = [{ slug: 'demo', type: 'RECOMMENDED', displayName: persian ? 'برچسب نمونه' : 'Demo label' }]
    else if (path === '/api/web/skills/global/persian-demo') data = { ...skill, labels: [], ownerId: 'author', ownerDisplayName: 'Author', subscriptionCount: 0, canManageLifecycle: false, canReport: false, canInteract: true }
    else if (path.endsWith('/versions')) data = { items: [version], total: 1, page: 0, size: 20 }
    else if (path.endsWith('/files')) data = [{ id: 1, filePath: 'README.md', fileSize: 120, contentType: 'text/markdown', sha256: 'test' }]
    else if (path.endsWith('/file')) {
      await route.fulfill({ contentType: 'text/plain; charset=utf-8', body: readme })
      return
    } else if (path.includes('/reviews')) data = { items: [], total: 0, page: 0, size: 20 }
    else if (path.endsWith('/rating')) data = { score: 0, rated: false }
    else if (path.endsWith('/star') || path.endsWith('/subscription')) data = false
    await route.fulfill({ json: { code: 0, msg: 'Success', data, timestamp: '2026-10-15T08:30:00Z', requestId: 'persian-ui-fixture' } })
  })
}

for (const width of [360, 1440]) {
  test(`Persian discovery, reload, technical clipboard and portal at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('locale-test-started')) {
        localStorage.setItem('i18nextLng', 'en')
        sessionStorage.setItem('locale-test-started', 'true')
      }
      const observer = new MutationObserver(() => {
        if (document.getElementById('root')?.childElementCount) {
          document.documentElement.dataset.firstContentDirection = document.documentElement.dir
          observer.disconnect()
        }
      })
      observer.observe(document, { subtree: true, childList: true })
    })
    await mockDiscovery(page)
    await page.goto('/search')
    await page.getByRole('button', { name: 'English' }).click()
    await page.getByRole('menuitem', { name: 'فارسی' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('button', { name: 'جست‌وجو', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'برچسب نمونه' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('fa')

    await page.reload()
    await expect(page.getByRole('button', { name: 'جست‌وجو', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-first-content-direction', 'rtl')
    await page.getByRole('link', { name: /مهارت نمونه/ }).click()
    await expect(page.getByRole('tab', { name: 'معرفی', exact: true })).toBeVisible()
    const command = page.locator('pre').filter({ hasText: 'npx @astron-team/skillhub@latest install' })
    await expect(command).toHaveAttribute('dir', 'ltr')
    const copyButton = command.locator('..').getByRole('button', { name: 'کپی', exact: true })
    const commandBox = (await command.boundingBox())!
    const copyBox = (await copyButton.boundingBox())!
    // The control mirrors with the UI while the command remains LTR and unobscured.
    expect(copyBox.x + copyBox.width).toBeLessThanOrEqual(commandBox.x)
    expect(await command.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('JetBrains Mono')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await command.locator('..').getByRole('button', { name: 'کپی', exact: true }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `npx @astron-team/skillhub@latest install @global/persian-demo --version 1.2.3 --registry ${new URL(page.url()).origin}`,
    )
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.fonts.check('14px IRANSans'))).toBe(true)
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('IRANSans')
    await expect(page.getByText('عملیات انجام نشد', { exact: true })).toHaveCount(0)
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      scrollTo(0, 0)
    })
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await page.screenshot({ path: testInfo.outputPath('persian-detail.png'), fullPage: true })
    if (width === 360) {
      await page.getByRole('switch', { name: 'پوستهٔ تیره' }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await page.screenshot({ path: testInfo.outputPath('persian-detail-dark.png'), fullPage: true })
    }

    await page.getByText('README.md', { exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl')
    expect(await dialog.evaluate((element) => element.closest('#skillhub-portals') !== null)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.getByRole('button', { name: 'فارسی', exact: true }).click()
    await page.getByRole('menuitem', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('detects fa-IR from the browser on a direct detail link', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ locale: 'fa-IR', baseURL })
  const page = await context.newPage()
  await mockDiscovery(page)
  await page.goto('/space/global/persian-demo')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('tab', { name: 'معرفی', exact: true })).toBeVisible()
  await context.close()
})
