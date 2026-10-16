import { expect, test, type Page } from '@playwright/test'
import fa from '../src/i18n/locales/fa.json' with { type: 'json' }

const user = { userId: 'fa-demo-user', displayName: 'کاربر آزمایشی', email: 'demo@example.com', platformRoles: [], canChangePassword: true, oauthProvider: 'local' }
const namespace = { id: 1, slug: 'team-demo', displayName: 'تیم آزمایشی', type: 'TEAM', status: 'ACTIVE', currentUserRole: 'OWNER' }

async function prepare(page: Page, loggedIn = false) {
  let authenticated = loggedIn
  let published = false
  const requests: Array<{ path: string; language: string | undefined; body: unknown }> = []
  const envelope = (data: unknown) => ({ code: 0, msg: 'Success', data })
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'fa'))
  await page.route('**/runtime-config.js', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.__SKILLHUB_RUNTIME_CONFIG__ = {}' }))
  await page.route(/\/api\/(?:web|v1)\//, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let data: unknown = []
    if (path.endsWith('/auth/me')) {
      await route.fulfill(authenticated ? { json: envelope(user) } : { status: 401, json: { code: 401, msg: 'Authentication required', data: null } })
      return
    }
    if (path.endsWith('/local/capabilities')) data = { passwordLoginEnabled: true, selfRegistrationEnabled: true, registrationAvailable: true }
    else if (request.method() === 'POST' && /\/auth\/local\//.test(path)) {
      const body = request.postDataJSON() as Record<string, string>
      requests.push({ path, language: request.headers()['accept-language'], body })
      if (path.endsWith('/login') && body.username === 'wrong_user') {
        await route.fulfill({ status: 401, json: { code: 401, msg: 'نام کاربری یا رمز عبور نادرست است', data: null } })
        return
      }
      if (path.endsWith('/register') && body.username === 'taken_user') {
        await route.fulfill({ status: 409, json: { code: 409, msg: 'نام کاربری از قبل وجود دارد', data: null } })
        return
      }
      if (path.endsWith('/login') || path.endsWith('/register')) {
        authenticated = true
        data = user
      } else data = null
    } else if (path.endsWith('/publish') && request.method() === 'POST') {
      const bytes = new Uint8Array(request.postDataBuffer() ?? new Uint8Array())
      const form = await new Response(bytes, { headers: { 'content-type': request.headers()['content-type'] } }).formData()
      const file = form.get('file')
      const body = { visibility: form.get('visibility'), confirmWarnings: form.get('confirmWarnings'), fileName: typeof file === 'string' ? file : file?.name }
      requests.push({ path, language: request.headers()['accept-language'], body })
      if (form.get('confirmWarnings') !== 'true') {
        await route.fulfill({ status: 400, json: { code: 400, msg: 'هشدارهای پیش از انتشار به تأیید نیاز دارند:\n- هشدار آزمایشی', data: null } })
        return
      }
      published = true
      data = { skillId: 1, namespace: 'team-demo', slug: 'demo', version: '1.2.3', status: 'PENDING_REVIEW' }
    } else if (path.endsWith('/me/namespaces')) data = [namespace]
    else if (path.endsWith('/me/skills')) data = {
      items: published ? [{ id: 1, namespace: 'team-demo', slug: 'demo', displayName: 'مهارت آزمایشی', downloadCount: 0, starCount: 0, ratingCount: 0, status: 'ACTIVE', headlineVersion: { id: 1, version: '1.2.3', status: 'PENDING_REVIEW' } }] : [],
      total: published ? 1 : 0, page: 0, size: 10,
    }
    else if (path.endsWith('/unread-count')) data = { count: 0 }
    await route.fulfill({ json: envelope(data) })
  })
  return requests
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const width of [360, 1440]) {
  test(`Persian login, duplicate registration and returnTo at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const requests = await prepare(page)
    await page.goto('/login?returnTo=%2Fdashboard')
    await expect(page.getByRole('heading', { name: 'ورود به SkillHub' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'شرایط استفاده', exact: true })).toHaveAttribute('href', '/terms')
    await page.getByRole('button', { name: 'ورود', exact: true }).click()
    await expect(page.getByText('نام کاربری را وارد کنید', { exact: true })).toBeVisible()
    await expect(page.getByText('رمز عبور را وارد کنید', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'فارسی', exact: true }).click()
    await page.getByRole('menuitem', { name: 'English' }).click()
    await expect(page.getByText('Username is required', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByRole('menuitem', { name: 'فارسی' }).click()
    await expect(page.getByText('نام کاربری را وارد کنید', { exact: true })).toBeVisible()
    await page.getByLabel('نام کاربری', { exact: true }).fill('wrong_user')
    await page.getByLabel('رمز عبور', { exact: true }).fill('Secret!123')
    await page.getByRole('button', { name: 'نمایش رمز عبور', exact: true }).click()
    await expect(page.getByLabel('رمز عبور', { exact: true })).toHaveValue('Secret!123')
    await expect(page.getByLabel('رمز عبور', { exact: true })).toHaveAttribute('dir', 'ltr')
    await page.getByRole('button', { name: 'ورود', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('نام کاربری یا رمز عبور نادرست است')
    await expect(page).toHaveURL(/\/login\?returnTo=/)
    await expectNoOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('persian-login.png'), fullPage: true })
    await page.getByRole('link', { name: 'ثبت‌نام کنید' }).click()
    await expect(page).toHaveURL(/\/register\?returnTo=%2Fdashboard/)
    await page.getByRole('button', { name: 'ثبت‌نام و ورود', exact: true }).click()
    await expect(page.getByText('ایمیل را وارد کنید', { exact: true })).toBeVisible()
    await page.getByLabel('نام کاربری', { exact: true }).fill('taken_user')
    await page.getByLabel('ایمیل', { exact: true }).fill('demo@example.com')
    await page.getByLabel('رمز عبور', { exact: true }).fill('Secret!123')
    await page.getByRole('button', { name: 'ثبت‌نام و ورود', exact: true }).click()
    await expect(page.locator('form').getByText('نام کاربری از قبل وجود دارد', { exact: true })).toBeVisible()
    await page.getByLabel('نام کاربری', { exact: true }).fill('demo_user')
    await page.getByRole('button', { name: 'ثبت‌نام و ورود', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'داشبورد', exact: true })).toBeVisible()
    expect(requests.filter((request) => request.path.endsWith('/register')).map((request) => request.body)).toEqual([
      { username: 'taken_user', email: 'demo@example.com', password: 'Secret!123' },
      { username: 'demo_user', email: 'demo@example.com', password: 'Secret!123' },
    ])
    expect(requests.every((request) => request.language?.startsWith('fa'))).toBe(true)
    await expectNoOverflow(page)
  })

  test(`Persian dashboard, RTL selects and publish warning at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const requests = await prepare(page, true)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'داشبورد', exact: true })).toBeVisible()
    await expect(page.getByText(fa.overview.mySkillsDesc)).toBeVisible()
    await expectNoOverflow(page)
    await page.goto('/dashboard/skills')
    await expect(page.getByText(fa.mySkills.emptyTitle, { exact: true })).toBeVisible()
    await page.goto('/dashboard/publish')
    await page.getByLabel('فضای نام', { exact: true }).click()
    const listbox = page.getByRole('listbox')
    expect(await listbox.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl')
    await page.getByRole('option', { name: /تیم آزمایشی/ }).click()
    await page.getByLabel('سطح دسترسی', { exact: true }).click()
    await page.getByRole('option', { name: 'خصوصی', exact: true }).click()
    await page.getByLabel(fa.publish.file, { exact: true }).setInputFiles({ name: 'demo-1.2.3.zip', mimeType: 'application/zip', buffer: Buffer.from('fixture zip') })
    await expect(page.getByText(/demo-1\.2\.3\.zip/)).toHaveAttribute('dir', 'ltr')
    await expectNoOverflow(page)
    await page.getByRole('button', { name: 'تأیید انتشار', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'هشدار پیش از انتشار' })
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl')
    await expect(dialog.getByText('هشدار آزمایشی')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('persian-publish-warning.png') })
    await dialog.getByRole('button', { name: 'ادامهٔ انتشار' }).click()
    await expect(page).toHaveURL(/\/dashboard\/skills/)
    await expect(page.getByRole('heading', { name: 'مهارت آزمایشی', exact: true })).toBeVisible()
    expect(requests.filter((request) => request.path.endsWith('/publish')).map((request) => request.body)).toEqual([
      { visibility: 'PRIVATE', confirmWarnings: 'false', fileName: 'demo-1.2.3.zip' },
      { visibility: 'PRIVATE', confirmWarnings: 'true', fileName: 'demo-1.2.3.zip' },
    ])
    expect(requests.every((request) => request.language?.startsWith('fa'))).toBe(true)
  })
}

test('Persian password reset keeps the leading-zero code and password unchanged', async ({ page }) => {
  const requests = await prepare(page)
  await page.goto('/reset-password')
  await page.getByLabel('ایمیل', { exact: true }).fill('demo@example.com')
  await page.getByRole('button', { name: 'ارسال کد تأیید', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('اگر حساب واجد شرایط باشد، کد تأیید برای آن ارسال شده است.')
  await page.getByLabel('کد تأیید', { exact: true }).fill('001234')
  await page.getByLabel('رمز عبور جدید', { exact: true }).fill('New Secret!123')
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('Different!123')
  await page.getByRole('button', { name: 'تغییر رمز عبور', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('دو رمز عبور یکسان نیستند')
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('New Secret!123')
  await expect(page.getByLabel('کد تأیید', { exact: true })).toHaveAttribute('dir', 'ltr')
  await page.getByRole('button', { name: 'تغییر رمز عبور', exact: true }).click()
  await expect(page.getByText('رمز عبور تغییر کرد. با رمز جدید وارد شوید.')).toBeVisible()
  expect(requests[requests.length - 1]?.body).toEqual({ email: 'demo@example.com', code: '001234', newPassword: 'New Secret!123' })
})
