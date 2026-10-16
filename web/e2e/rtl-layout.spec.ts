import { expect, test, type Locator, type Page } from '@playwright/test'
import fa from '../src/i18n/locales/fa.json' with { type: 'json' }

const user = { userId: 'rtl-admin', displayName: 'مدیر نمونه', email: 'admin@example.com', platformRoles: ['SUPER_ADMIN'], canChangePassword: true }
const namespace = { id: 1, slug: 'rtl-team', displayName: 'تیم نمونه', type: 'TEAM', status: 'ACTIVE', currentUserRole: 'OWNER' }
const overview = '# English introduction\n\nEnglish paragraph.\n\n## عنوان فارسی\n\nمتن فارسی با `code()` و English.\n\n- مورد فارسی\n- مورد دوم\n\n> نقل قول فارسی\n\n```js\nconst value = "ASCII-123"\n```'
const suite = { id: 1, versionId: 1, namespace: 'global', slug: 'rtl-suite', displayName: 'مجموعهٔ نمونه', summary: 'توضیح مجموعه', overview, version: '1.2.3', status: 'PUBLISHED', visibility: 'PUBLIC', available: true, allowedActions: [], members: [] }

async function prepare(page: Page, loggedIn = true) {
  let preferences = ['PUBLISH', 'REVIEW', 'PROMOTION', 'REPORT'].map(category => ({ category, channel: 'IN_APP', enabled: true }))
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('rtl-layout-started')) {
      localStorage.setItem('i18nextLng', 'fa')
      localStorage.setItem('skillhub-theme', 'light')
      sessionStorage.setItem('rtl-layout-started', 'true')
    }
  })
  await page.route('**/runtime-config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__SKILLHUB_RUNTIME_CONFIG__ = {}' }))
  await page.route(/\/api\/(?:web|v1)\//, async route => {
    const path = new URL(route.request().url()).pathname
    const pageOf = (items: unknown[]) => ({ items, total: items.length, page: 0, size: 20 })
    let data: unknown = []
    if (path.endsWith('/auth/me')) {
      if (!loggedIn) {
        await route.fulfill({ status: 401, json: { code: 401, msg: 'Authentication required', data: null } })
        return
      }
      data = user
    }
    else if (path.endsWith('/local/capabilities')) data = { passwordLoginEnabled: true, selfRegistrationEnabled: true, registrationAvailable: true }
    else if (path.endsWith('/notification-preferences')) {
      if (route.request().method() === 'PUT') preferences = route.request().postDataJSON().preferences
      data = preferences
    } else if (path.endsWith('/notifications/unread-count')) data = { count: 12 }
    else if (path.endsWith('/me/namespaces')) data = [namespace]
    else if (path.endsWith('/namespaces/rtl-team')) data = namespace
    else if (path.endsWith('/members')) data = pageOf([{ ...user, id: 1, role: 'OWNER', createdAt: '2026-10-15T00:00:00Z' }])
    else if (path.endsWith('/admin/users')) data = pageOf([{ ...user, id: user.userId, username: 'rtl_admin', status: 'ACTIVE', createdAt: '2026-10-15T00:00:00Z' }])
    else if (path.endsWith('/system-config/auth/local')) data = { passwordLoginEnabled: true, selfRegistrationEnabled: true, version: 1 }
    else if (path.endsWith('/suites/global/rtl-suite')) data = suite
    else if (path.endsWith('/skills') || path.endsWith('/resources')) data = pageOf([])
    await route.fulfill({ json: { code: 0, msg: 'Success', data } })
  })
}

async function switchLanguage(page: Page, language: 'fa' | 'en') {
  await page.getByRole('button', { name: language === 'en' ? 'فارسی' : 'English', exact: true }).click()
  await page.getByRole('menuitem', { name: language === 'en' ? 'English' : 'فارسی', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr')
}

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  return (await locator.boundingBox())!
}

async function expectThumbInside(track: Locator, thumb: Locator, side: 'left' | 'right') {
  // Poll the geometry through the transition, including the final containment.
  await expect.poll(async () => {
    const outer = await track.boundingBox()
    const inner = await thumb.boundingBox()
    if (!outer || !inner) return false
    const contained = inner.x >= outer.x && inner.x + inner.width <= outer.x + outer.width
    const correctSide = side === 'left'
      ? inner.x + inner.width / 2 < outer.x + outer.width / 2
      : inner.x + inner.width / 2 > outer.x + outer.width / 2
    return contained && correctSide
  }).toBe(true)
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function expectCenteredNavigation(page: Page) {
  const header = await box(page.locator('header').first())
  const navigation = await box(page.locator('header > nav'))
  expect(Math.abs(navigation.x + navigation.width / 2 - (header.x + header.width / 2))).toBeLessThanOrEqual(1)
}

for (const width of [360, 1024, 1334]) {
  test(`public menu center, Persian search placeholder and newest-first order at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 956 })
    await prepare(page, false)
    await page.goto('/search?q=&sort=newest&page=0&starredOnly=false')
    const search = page.locator('main').getByRole('textbox')
    await expect(search).toHaveCSS('text-align', 'right')
    await expect(search).toHaveCSS('direction', 'rtl')
    const group = page.getByRole('group', { name: fa.search.sort.label, exact: true })
    const newest = group.getByRole('button', { name: fa.search.sort.newest, exact: true })
    const downloads = group.getByRole('button', { name: fa.search.sort.downloads, exact: true })
    const relevance = group.getByRole('button', { name: fa.search.sort.relevance, exact: true })
    expect((await box(newest)).x).toBeGreaterThan((await box(downloads)).x)
    expect((await box(downloads)).x).toBeGreaterThan((await box(relevance)).x)
    await downloads.click()
    await expect(page).toHaveURL(/sort=downloads/)
    await relevance.click()
    await expect(page).toHaveURL(/sort=relevance/)
    await newest.click()
    await expect(page).toHaveURL(/sort=newest/)
    if (width >= 1024) {
      await expect(page.locator('header > nav').getByRole('link')).toHaveCount(2)
      await expectCenteredNavigation(page)
    } else {
      await expect(page.locator('header > nav')).toBeHidden()
    }
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('rtl-public-search.png') })
    await search.fill('skill_ASCII-123')
    await expect(search).toHaveCSS('direction', 'ltr')
    await expect(search).toHaveCSS('text-align', 'right')
    await expect(search).toHaveValue('skill_ASCII-123')
    await switchLanguage(page, 'en')
    await expect(search).toHaveCSS('text-align', 'start')
    await expect(search).toHaveCSS('direction', 'ltr')
    if (width >= 1024) await expectCenteredNavigation(page)
    await search.clear()
    await switchLanguage(page, 'fa')
    await expect(search).toHaveCSS('direction', 'rtl')
    await expect(search).toHaveCSS('text-align', 'right')
  })
}

for (const width of [360, 1334]) {
  test(`Persian login and related account fields align right at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 956 })
    await prepare(page, false)
    await page.goto('/login?returnTo=%2Fsearch')
    const username = page.locator('#username')
    const password = page.locator('#password')
    for (const field of [username, password]) {
      await expect(field).toHaveCSS('text-align', 'right')
      await expect(field).toHaveCSS('direction', 'rtl')
      expect(await field.evaluate(element => getComputedStyle(element, '::placeholder').fontFamily)).toContain('IRANSans')
    }
    await page.screenshot({ path: testInfo.outputPath('rtl-login-placeholders.png') })
    await username.fill('user_ASCII-0123')
    await password.fill('Secret !123')
    for (const field of [username, password]) {
      await expect(field).toHaveCSS('text-align', 'right')
      await expect(field).toHaveCSS('direction', 'ltr')
    }
    await expect(username).toHaveValue('user_ASCII-0123')
    await expect(password).toHaveValue('Secret !123')
    await page.getByRole('button', { name: fa.login.showPassword, exact: true }).click()
    await expect(password).toHaveValue('Secret !123')
    await expect(password).toHaveCSS('text-align', 'right')
    await noOverflow(page)
    for (const path of ['/register', '/reset-password']) {
      await page.goto(path)
      for (const field of await page.locator('input[placeholder]:visible').all()) {
        await expect(field).toHaveCSS('text-align', 'right')
        await expect(field).toHaveCSS('direction', 'rtl')
      }
      await noOverflow(page)
    }
  })

  test(`Persian textareas and technical suite fields align right at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 956 })
    await prepare(page)
    await page.goto('/dashboard/suites/new')
    const summary = page.locator('#suite-summary')
    await expect(summary).toHaveCSS('text-align', 'right')
    await summary.fill('شرح فارسی مجموعه')
    await expect(summary).toHaveCSS('text-align', 'right')
    await expect(summary).toHaveCSS('direction', 'rtl')
    await summary.fill('English summary 123')
    await expect(summary).toHaveCSS('text-align', 'right')
    await expect(summary).toHaveCSS('direction', 'ltr')
    await expect(summary).toHaveValue('English summary 123')
    await noOverflow(page)
  })
}

test('authenticated header stays centered without overlapping side controls at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 956 })
  await prepare(page)
  await page.goto('/search')
  const header = page.locator('header').first()
  await expect(header.locator('nav').getByRole('link')).toHaveCount(4)
  await expectCenteredNavigation(page)
  const brand = await box(header.locator(':scope > a'))
  const navigation = await box(header.locator('nav'))
  const controls = await box(header.locator(':scope > div'))
  expect(navigation.x + navigation.width).toBeLessThanOrEqual(brand.x)
  expect(controls.x + controls.width).toBeLessThanOrEqual(navigation.x)
  await switchLanguage(page, 'en')
  await expectCenteredNavigation(page)
  const englishBrand = await box(header.locator(':scope > a'))
  const englishNavigation = await box(header.locator('nav'))
  const englishControls = await box(header.locator(':scope > div'))
  expect(englishBrand.x + englishBrand.width).toBeLessThanOrEqual(englishNavigation.x)
  expect(englishNavigation.x + englishNavigation.width).toBeLessThanOrEqual(englishControls.x)
  await noOverflow(page)
})

for (const width of [360, 1440]) {
  test(`switches and dashboard layout follow live language at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page)
    await page.goto('/settings/notifications')
    const preference = page.locator('#pref-toggle-PUBLISH')
    const thumb = preference.locator('span')
    await expectThumbInside(preference, thumb, 'left')
    await preference.click()
    await expect(preference).toHaveAttribute('aria-checked', 'false')
    await expectThumbInside(preference, thumb, 'right')
    await preference.click()
    await expectThumbInside(preference, thumb, 'left')
    const theme = page.getByRole('switch', { name: 'پوستهٔ تیره' })
    await theme.click()
    await expectThumbInside(theme, theme.locator('span').first(), 'left')
    await theme.click()
    await expectThumbInside(theme, theme.locator('span').first(), 'right')
    if (width === 1440) {
      await expectCenteredNavigation(page)
      const sidebar = page.locator('main aside').first()
      const content = page.locator('main').getByRole('heading', { level: 1 })
      expect((await box(sidebar)).x).toBeGreaterThan((await box(content)).x)
    }
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('rtl-settings.png') })
    await switchLanguage(page, 'en')
    await expectThumbInside(preference, thumb, 'right')
    await preference.click()
    await expectThumbInside(preference, thumb, 'left')
    await noOverflow(page)
    await page.goto('/admin/system-config')
    const checkbox = page.locator('main input[type=checkbox]').first()
    const systemTrack = checkbox.locator('..')
    const systemThumb = systemTrack.locator('span').last()
    await expectThumbInside(systemTrack, systemThumb, 'right')
    await switchLanguage(page, 'fa')
    await expectThumbInside(systemTrack, systemThumb, 'left')
    await checkbox.locator('xpath=ancestor::label').click()
    await expectThumbInside(systemTrack, systemThumb, 'right')
    await noOverflow(page)
  })

  test(`tables, dialog alignment and select placement at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page)
    await page.goto('/dashboard/namespaces/rtl-team/members')
    const email = page.getByRole('cell', { name: 'admin@example.com', exact: true })
    await expect(email).toHaveCSS('direction', 'rtl')
    await expect(email.locator('bdi')).toHaveCSS('direction', 'ltr')
    await page.getByRole('button', { name: 'افزودن عضو', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveCSS('direction', 'rtl')
    await expect(dialog.getByRole('heading')).toHaveCSS('text-align', 'start')
    const select = dialog.getByRole('combobox')
    await expect(select).toHaveCSS('text-align', 'start')
    expect((await box(select.locator('svg'))).x).toBeLessThan((await box(select.locator('span').first())).x)
    await select.click()
    await expect(page.getByRole('listbox')).toHaveCSS('direction', 'rtl')
    await page.screenshot({ path: testInfo.outputPath('rtl-member-dialog.png') })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await page.goto('/admin/users')
    const adminEmail = page.getByRole('cell', { name: 'admin@example.com', exact: true })
    await expect(adminEmail).toHaveCSS('direction', 'rtl')
    await expect(adminEmail.locator('bdi')).toHaveCSS('direction', 'ltr')
    await switchLanguage(page, 'en')
    await expect(adminEmail).toHaveCSS('direction', 'ltr')
    await noOverflow(page)
  })

  test(`suite grid, separator and mixed Markdown at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepare(page)
    await page.goto('/suite/global/rtl-suite')
    const article = page.locator('main article')
    const support = page.locator('[role=tabpanel] aside')
    await expect(article.getByRole('heading', { name: 'English introduction' })).toHaveCSS('direction', 'ltr')
    await expect(article.getByRole('heading', { name: 'عنوان فارسی' })).toHaveCSS('direction', 'rtl')
    await expect(article.getByRole('list')).toHaveCSS('direction', 'rtl')
    await expect(article.locator('blockquote')).toHaveCSS('direction', 'rtl')
    await expect(article.locator('pre')).toHaveCSS('direction', 'ltr')
    if (width === 1440) {
      expect((await box(article)).x).toBeGreaterThan((await box(support)).x)
      await expect(support).toHaveCSS('border-right-width', '1px')
      await expect(support).toHaveCSS('border-left-width', '0px')
    } else {
      expect((await box(support)).y).toBeGreaterThan((await box(article)).y)
      await expect(support).toHaveCSS('border-top-width', '1px')
      await expect(support).toHaveCSS('border-right-width', '0px')
    }
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('rtl-suite.png'), fullPage: true })
    await switchLanguage(page, 'en')
    if (width === 1440) {
      expect((await box(article)).x).toBeLessThan((await box(support)).x)
      await expect(support).toHaveCSS('border-left-width', '1px')
    }
    await expect(article.getByRole('heading', { name: 'عنوان فارسی' })).toHaveCSS('direction', 'rtl')
    await noOverflow(page)
  })
}
