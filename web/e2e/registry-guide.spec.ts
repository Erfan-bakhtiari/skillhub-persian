import { expect, test } from '@playwright/test'

test('serves the registry guide and rejects unsafe requests', async ({ page }) => {
  const guideResponse = await page.request.get('/registry/skill.md')
  expect(guideResponse.status()).toBe(200)
  const guide = await guideResponse.text()
  expect(guide).toContain('name: skillhub-cli')
  expect(guide).toContain(
    'removing the trailing `/registry/skill.md` from the URL used to fetch this guide',
  )
  expect(guide).not.toContain('${SKILLHUB_PUBLIC_BASE_URL}')
  expect(guideResponse.headers()['cache-control']).toContain('no-cache')
  const extensionHostResponse = await page.request.get('/registry/skill.md', {
    headers: { Host: 'chrome-extension:evil;echo_injected' },
  })
  expect(extensionHostResponse.status()).toBe(400)
  const templateResponse = await page.request.get('/registry/skill.md.template')
  expect(templateResponse.status()).toBe(404)
})
