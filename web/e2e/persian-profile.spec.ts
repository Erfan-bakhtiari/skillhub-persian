import { expect, test } from '@playwright/test'

for (const width of [360, 1440]) {
  test(`Persian profile accepts names unchanged and preserves moderation at ${width}px`, async ({ page }, testInfo) => {
    const pending = width === 360
    const writes: unknown[] = []
    const name = 'علی‌اکبر حُسینی ۱۴۰۵'
    let profile = {
      displayName: 'Old Name', email: 'demo@example.com', avatarUrl: null,
      pendingChanges: null as null | { status: string; changes: { displayName: string }; createdAt: string; reviewComment: null },
      fieldPolicies: { displayName: { editable: true, requiresReview: pending } },
    }
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'fa'))
    await page.route('**/runtime-config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__SKILLHUB_RUNTIME_CONFIG__ = {}' }))
    await page.route(/\/api\/(?:v1|web)\//, async route => {
      const path = new URL(route.request().url()).pathname
      let data: unknown = []
      if (path.endsWith('/auth/me')) data = { userId: 'profile-demo', displayName: profile.displayName, email: profile.email, platformRoles: [], canChangePassword: true }
      else if (path.endsWith('/unread-count')) data = { count: 0 }
      else if (path.endsWith('/user/profile')) {
        if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON() as { displayName: string }
          writes.push(body)
          expect(route.request().headers()['accept-language']).toMatch(/^fa/)
          profile = pending
            ? { ...profile, pendingChanges: { status: 'PENDING', changes: body, createdAt: new Date().toISOString(), reviewComment: null } }
            : { ...profile, displayName: body.displayName }
          data = { status: pending ? 'PENDING_REVIEW' : 'APPLIED' }
        } else data = { ...profile, displayName: profile.pendingChanges?.changes.displayName ?? profile.displayName }
      }
      await route.fulfill({ json: { code: 0, msg: 'Success', data } })
    })
    await page.goto('/settings/profile')
    await expect(page.getByRole('heading', { name: 'تنظیمات پروفایل', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'ویرایش', exact: true }).click()
    const input = page.getByLabel('نام نمایشی', { exact: true })
    await expect(input).toHaveAttribute('dir', 'auto')
    await input.fill('نام\u202Eکاربر')
    await page.getByRole('button', { name: 'ذخیره', exact: true }).click()
    await expect(page.getByText(/نام نمایشی فقط می‌تواند شامل حروف فارسی/)).toBeVisible()
    expect(writes).toEqual([])
    await input.fill(name)
    if (pending) await expect(page.getByText('برخی تغییرات پیش از اعمال به تأیید مدیر نیاز دارند.')).toBeVisible()
    await page.getByRole('button', { name: 'ذخیره', exact: true }).click()
    await expect(input).toHaveCount(0)
    expect(writes).toEqual([{ displayName: name }])
    if (pending) await expect(page.getByText(`تغییر نام نمایشی شما به «${name}» در انتظار بررسی است.`)).toBeVisible()
    else await expect(page.getByRole('paragraph').filter({ hasText: name })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0) })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await page.screenshot({ path: testInfo.outputPath('persian-profile.png'), fullPage: true })
  })
}
