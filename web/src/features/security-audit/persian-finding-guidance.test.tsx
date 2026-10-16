import { renderToStaticMarkup } from 'react-dom/server'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import fa from '@/i18n/locales/fa.json'
import en from '@/i18n/locales/en.json'
import { FindingItem } from './finding-item'
import { getPersianFindingGuidance, localizeScanFailure } from './persian-finding-guidance'
import type { SecurityFinding } from './types'

const finding: SecurityFinding = {
  ruleId: 'SECRET_GITHUB_TOKEN', severity: 'HIGH', category: 'hardcoded_secrets',
  title: 'GitHub token detected', message: 'Original engine detail {do not interpolate}',
  remediation: 'Remove hardcoded GitHub tokens', filePath: 'src/فایل, test.py', lineNumber: 12,
  codeSnippet: 'token = "[REDACTED]"', analyzer: 'static',
  metadata: { originalSnippet: 'MUST-NOT-APPEAR' },
}

async function render(language: string, value = finding) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({
    lng: language, fallbackLng: 'en', resources: { fa: { translation: fa }, en: { translation: en } },
    interpolation: { escapeValue: false },
  })
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}><FindingItem finding={value} /></I18nextProvider>)
}

describe('Persian external security findings', () => {
  it('adds rule-specific guidance while preserving the complete original and masked snippet', async () => {
    const before = JSON.stringify(finding)
    const html = await render('fa-IR')
    expect(html).toContain('توکن GitHub در بسته')
    expect(html).toContain('توکن ثابت را از محتوای بسته حذف کنید')
    for (const text of [finding.title, finding.message, finding.remediation, '[REDACTED]', 'src/فایل, test.py:12']) {
      expect(html).toContain(text)
    }
    expect(html).toContain('dir="ltr"')
    expect(html).toContain('dir="auto"')
    expect(html).not.toContain('MUST-NOT-APPEAR')
    expect(JSON.stringify(finding)).toBe(before)
  })

  it('does not infer meaning from a custom rule ID, category or provider text', async () => {
    expect(getPersianFindingGuidance('constructor')).toBeUndefined()
    expect(getPersianFindingGuidance('SECRET_GITHUB_TOKEN_CUSTOM')).toBeUndefined()
    const html = await render('fa', { ...finding, ruleId: 'CUSTOM-RULE', title: 'Custom <detail>' })
    expect(html).toContain('یافتهٔ موتور خارجی')
    expect(html).toContain('هنوز توضیح فارسی اختصاصی')
    expect(html).toContain('Custom &lt;detail&gt;')
    expect(html).not.toContain('توکن GitHub در بسته')
  })

  it('leaves the existing English rendering without Persian guidance', async () => {
    const html = await render('en')
    expect(html).toContain(finding.title)
    expect(html).not.toContain('توضیح قاعده')
  })

  it('translates only the known failure reasons and preserves arbitrary service errors', () => {
    const message = 'Security scan failed after automatic retries. Retry the scan or contact an administrator.'
    expect(localizeScanFailure(message, 'fa-IR')).toContain('پس از تلاش‌های خودکار')
    expect(localizeScanFailure(message, 'en')).toBe(message)
    expect(localizeScanFailure('Unknown provider error {0}', 'fa')).toBe('Unknown provider error {0}')
    expect(localizeScanFailure(null, 'fa')).toBeNull()
  })
})
