import { expect, test, type Page } from '@playwright/test'
import fa from '../src/i18n/locales/fa.json' with { type: 'json' }

const namespace = { id: 1, slug: 'team-demo', displayName: 'تیم آزمایشی', description: 'همکاری در توسعهٔ مهارت‌ها', type: 'TEAM', status: 'ACTIVE', currentUserRole: 'OWNER' }
const user = { userId: 'demo-admin', displayName: 'مدیر آزمایشی', email: 'admin@example.com', platformRoles: ['SUPER_ADMIN'], canChangePassword: true, oauthProvider: 'local' }
const rawToken = 'sh_test_ASCII-0123456789-example'

async function prepare(page: Page) {
  const writes: Array<{ path: string; body: unknown }> = []
  const pageOf = (items: unknown[]) => ({ items, total: items.length, page: 0, size: 20 })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'fa'))
  await page.route('**/runtime-config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__SKILLHUB_RUNTIME_CONFIG__ = {}' }))
  await page.route(/\/api\/(?:v1|web)\//, async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let data: unknown = []
    if (request.method() !== 'GET') {
      const body: unknown = request.postData() ? request.postDataJSON() : null
      writes.push({ path, body })
      if (path.endsWith('/tokens')) data = { id: 1, name: 'توکن آزمایشی', token: rawToken, tokenPrefix: 'sh_test_', createdAt: '2026-10-15T00:00:00Z' }
      else if (path.endsWith('/namespaces')) data = { ...namespace, slug: 'team-new', displayName: 'تیم فارسی' }
      else if (path.endsWith('/members')) data = { id: 2, userId: 'external-user-001', displayName: 'عضو جدید', role: 'ADMIN', createdAt: '2026-10-15T00:00:00Z' }
    } else if (path.endsWith('/auth/me')) data = user
    else if (path.endsWith('/me/namespaces/page')) data = pageOf([namespace])
    else if (path.endsWith('/me/namespaces')) data = [namespace]
    else if (path.endsWith('/namespaces/team-demo')) data = namespace
    else if (path.endsWith('/members')) data = pageOf([{ id: 1, userId: 'demo-admin', displayName: 'مدیر آزمایشی', email: 'admin@example.com', role: 'OWNER', createdAt: '2026-10-15T00:00:00Z' }])
    else if (path.endsWith('/tokens')) data = pageOf([])
    else if (path.endsWith('/notifications/unread-count')) data = { count: 1 }
    else if (path.endsWith('/notifications')) data = pageOf([{ id: 1, category: 'REVIEW', eventType: 'REVIEW_APPROVED', title: 'Review approved', status: 'UNREAD', createdAt: new Date(Date.now() - 120_000).toISOString(), bodyJson: JSON.stringify({ skillName: '@team-demo/test', version: '1.2.3' }) }])
    else if (path.endsWith('/admin/users')) data = pageOf([{ ...user, id: user.userId, username: 'demo_admin', status: 'ACTIVE', createdAt: '2026-10-15T00:00:00Z' }])
    else if (path.endsWith('/me/suites/workspace')) data = { ...pageOf([]), attentionCount: 0, hasChangingOperations: false }
    else if (path.endsWith('/resources') || path.endsWith('/skills')) data = pageOf([])
    await route.fulfill({ json: { code: 0, msg: 'Success', data } })
  })
  return writes
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const width of [360, 1440]) {
  test(`Persian namespaces and member role payloads at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await prepare(page)
    await page.goto('/dashboard/namespaces')
    await expect(page.getByRole('heading', { name: 'فضاهای نام من', exact: true })).toBeVisible()
    await expect(page.getByText('نقش فعلی: مالک')).toBeVisible()
    await page.getByRole('button', { name: 'ایجاد فضای نام', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveCSS('direction', 'rtl')
    await dialog.getByLabel('شناسهٔ فضای نام', { exact: true }).fill('team-new')
    await expect(dialog.getByLabel('شناسهٔ فضای نام', { exact: true })).toHaveAttribute('dir', 'ltr')
    await dialog.getByLabel('نام نمایشی', { exact: true }).fill('تیم فارسی')
    await dialog.getByLabel('توضیحات', { exact: true }).fill('همکاری فارسی')
    await dialog.getByRole('button', { name: 'ایجاد', exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(writes.find(write => write.path.endsWith('/namespaces'))?.body).toEqual({ slug: 'team-new', displayName: 'تیم فارسی', description: 'همکاری فارسی' })
    await page.goto('/dashboard/namespaces/team-demo/members')
    await expect(page.getByRole('heading', { name: 'مدیریت اعضا', exact: true })).toBeVisible()
    await noOverflow(page)
    await page.getByRole('button', { name: 'افزودن عضو', exact: true }).click()
    await dialog.getByLabel('ورود دستی شناسهٔ کاربر').fill('external-user-001')
    await dialog.getByLabel('نقش عضو').click()
    await expect(page.getByRole('listbox')).toHaveCSS('direction', 'rtl')
    await page.getByRole('option', { name: 'مدیر', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('persian-member-dialog.png') })
    await dialog.getByRole('button', { name: 'افزودن عضو', exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(writes.find(write => write.path.endsWith('/members'))?.body).toEqual({ userId: 'external-user-001', role: 'ADMIN' })
  })

  test(`Persian tokens, settings, notifications and administration at ${width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const writes = await prepare(page)
    await page.goto('/dashboard/tokens')
    await page.getByRole('button', { name: 'ایجاد توکن', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('نام توکن', { exact: true }).fill('توکن آزمایشی')
    await dialog.getByLabel('انقضا', { exact: true }).click()
    await page.getByRole('option', { name: 'تاریخ و ساعت دلخواه', exact: true }).click()
    const date = dialog.getByLabel('تاریخ و ساعت دلخواه', { exact: true })
    await expect(date).toHaveAttribute('dir', 'ltr')
    await date.fill('2030-01-02T15:04')
    await dialog.getByRole('button', { name: 'ایجاد', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'توکن ایجاد شد' })).toBeVisible()
    await expect(dialog.getByText(rawToken, { exact: true })).toHaveAttribute('dir', 'ltr')
    await dialog.getByRole('button', { name: 'کپی توکن', exact: true }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(rawToken)
    expect(writes.find(write => write.path.endsWith('/tokens'))?.body).toEqual({ name: 'توکن آزمایشی', expiresAt: new Date('2030-01-02T15:04').toISOString() })
    await dialog.getByRole('button', { name: 'بستن', exact: true }).first().click()
    await page.goto('/settings/security')
    await expect(page.getByRole('heading', { name: 'تنظیمات امنیت', exact: true })).toBeVisible()
    await expect(page.getByLabel('رمز عبور فعلی', { exact: true })).toHaveAttribute('dir', 'ltr')
    await noOverflow(page)
    await page.goto('/dashboard/notifications')
    await expect(page.getByText('بررسی تأیید شد', { exact: true })).toBeVisible()
    await expect(page.getByText(/@team-demo\/test.*تأیید شد/)).toBeVisible()
    await expect(page.getByText(/پیش.*پیش/)).toHaveCount(0)
    await noOverflow(page)
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'مدیریت کاربران', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'تغییر نقش', exact: true }).click()
    await expect(dialog).toHaveCSS('direction', 'rtl')
    await page.screenshot({ path: testInfo.outputPath('persian-admin-dialog.png') })
    await page.keyboard.press('Escape')
    await noOverflow(page)
    await page.goto('/dashboard/suites')
    await expect(page.getByRole('heading', { name: fa.suite.myTitle, exact: true })).toBeVisible()
    await expect(page.getByText(fa.suite.myEmpty, { exact: true })).toBeVisible()
    await noOverflow(page)
    await page.goto('/suites')
    await expect(page.getByRole('heading', { name: fa.suite.listTitle, exact: true })).toBeVisible()
    await noOverflow(page)
    await page.goto('/dashboard/suites/new')
    await expect(page.getByRole('heading', { name: fa.suite.createTitle, exact: true })).toBeVisible()
    await expect(page.getByLabel('شناسه', { exact: true })).toHaveAttribute('dir', 'ltr')
    await page.getByLabel('نام', { exact: true }).fill('مجموعهٔ فارسی')
    await expect(page.getByLabel('نام', { exact: true })).toHaveAttribute('dir', 'auto')
    await page.getByLabel('فضای نام', { exact: true }).click()
    await expect(page.getByRole('listbox')).toHaveCSS('direction', 'rtl')
    await page.getByRole('option', { name: '@team-demo', exact: true }).click()
    await noOverflow(page)
    for (const [path, title, sections] of [['/privacy', 'سیاست حفظ حریم خصوصی', 8], ['/terms', 'شرایط استفاده', 9]] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(page.locator('main').getByRole('heading', { level: 3 })).toHaveCount(sections)
      await expect(page.getByText('آخرین به‌روزرسانی: ۱۴ مارس ۲۰۲۶', { exact: true })).toBeVisible()
      await noOverflow(page)
    }
  })
}

test('Persian default page opens the marketplace on mobile', async ({ page }, testInfo) => {
  await prepare(page)
  await page.setViewportSize({ width: 360, height: 900 })
  await page.goto('/')
  await expect(page).toHaveURL(/\/search\?q=&sort=newest&page=0&starredOnly=false$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('button', { name: 'جست‌وجو', exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('persian-marketplace-default.png') })
})
