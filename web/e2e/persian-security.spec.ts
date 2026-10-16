import { expect, test } from '@playwright/test'

for (const width of [360, 1440]) {
  test('Persian scanner guidance preserves original audit evidence at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'fa'))
    const version = { id: 1, version: '1.2.3', status: 'PUBLISHED', fileCount: 1, totalSize: 100,
      downloadAvailable: true, publishedAt: '2026-10-15T08:30:00Z' }
    const skill = { id: 1, namespace: 'global', slug: 'security-demo', displayName: 'مهارت آزمایشی',
      summary: 'بررسی گزارش امنیتی', visibility: 'PUBLIC', status: 'ACTIVE', downloadCount: 1,
      starCount: 0, ratingAvg: 0, ratingCount: 0, subscriptionCount: 0, labels: [],
      ownerId: 'owner', canManageLifecycle: true, canInteract: true, canReport: true,
      updatedAt: '2026-10-15T08:30:00Z', ownerDisplayName: 'مالک',
      headlineVersion: version, publishedVersion: version }
    const common = { severity: 'HIGH', category: 'hardcoded_secrets', filePath: 'src/فایل, test.py',
      lineNumber: 12, analyzer: 'static', codeSnippet: 'token = "[REDACTED]"',
      metadata: { originalSnippet: 'DO-NOT-EXPOSE-METADATA' } }
    await page.route(/\/api\/(?:v1|web)\//, async route => {
      const path = new URL(route.request().url()).pathname
      let data: unknown = []
      if (path.endsWith('/auth/me')) data = { userId: 'owner', displayName: 'مالک', platformRoles: ['SUPER_ADMIN'] }
      else if (path.endsWith('/skills/global/security-demo')) data = skill
      else if (path.endsWith('/security-audit')) data = [{
        id: 1, scanId: 'scan-fixture', scannerType: 'SKILL_SCANNER', verdict: 'DANGEROUS', isSafe: false,
        maxSeverity: 'HIGH', findingsCount: 2, scanDurationSeconds: 1, scannedAt: '2026-10-15T08:30:00Z',
        createdAt: '2026-10-15T08:30:00Z',
        failureReason: 'Security scan failed after automatic retries. Retry the scan or contact an administrator.',
        findings: [
          { ...common, ruleId: 'SECRET_GITHUB_TOKEN', title: 'GitHub token detected',
            message: 'Original scanner detail', remediation: 'Remove hardcoded GitHub tokens' },
          { ...common, ruleId: 'CUSTOM-RULE', title: 'Custom provider text',
            message: 'Keep this exact detail {0}', remediation: null },
        ],
      }]
      else if (path.endsWith('/versions')) data = { items: [version], total: 1, page: 0, size: 20 }
      else if (path.includes('/reviews')) data = { items: [], total: 0, page: 0, size: 20 }
      else if (path.endsWith('/rating')) data = { score: 0, rated: false }
      else if (path.endsWith('/star') || path.endsWith('/subscription')) data = false
      else if (path.endsWith('/notifications/unread-count')) data = { count: 0 }
      await route.fulfill({ json: { code: 0, msg: 'Success', data } })
    })
    await page.goto('/space/global/security-demo')
    await page.getByRole('button', { name: 'مشاهدهٔ جزئیات', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveCSS('direction', 'rtl')
    await expect(dialog.getByText(/اسکن امنیتی پس از تلاش‌های خودکار ناموفق بود/)).toBeVisible()
    await dialog.getByRole('button', { name: 'یافته‌ها', exact: true }).click()
    await expect(dialog.getByText(/توضیح قاعده: توکن GitHub در بسته/)).toBeVisible()
    await expect(dialog.getByText('GitHub token detected', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Keep this exact detail {0}', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/برای این قاعده هنوز توضیح فارسی اختصاصی/)).toBeVisible()
    await expect(dialog.locator('pre').first()).toHaveCSS('direction', 'ltr')
    await expect(dialog).not.toContainText('DO-NOT-EXPOSE-METADATA')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: testInfo.outputPath('persian-security-guidance.png') })
  })
}
