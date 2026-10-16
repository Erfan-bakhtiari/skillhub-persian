// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createInstance } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import fa from './locales/fa.json'

function flatten(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof item === 'string' ? [[path, item]] : Object.entries(flatten(item, path))
  }))
}

describe('Persian localization slice', () => {
  afterEach(() => localStorage.clear())

  it('covers the complete English interface key tree without losing interpolation parameters', () => {
    const source = flatten(en)
    const translated = flatten(fa)
    for (const key of Object.keys(source)) {
      expect(translated[key], key).toBeDefined()
    }
    const parameters = (text: string) => [...text.matchAll(/{{\s*([^},\s]+)/g)].map((match) => match[1]).sort()
    for (const [key, text] of Object.entries(translated)) {
      if (source[key] !== '') expect(text.trim(), key).not.toBe('')
      if (source[key]) expect(parameters(text), key).toEqual(parameters(source[key]))
    }
  })

  it('preserves executable commands and templates exactly', () => {
    const source = flatten(en)
    const translated = flatten(fa)
    for (const key of [
      'landing.quickStart.cli.command', 'landing.quickStart.human.command',
      'landing.quickStart.human.commandTemplate', 'landing.quickStart.agent.commandTemplate',
      'landing.experience.quickStart.agent.instruction',
      'landing.quickStart.steps.installSkills.code', 'landing.quickStart.steps.publishSkills.code',
      'home.quickStart.steps.installSkills.code', 'home.quickStart.steps.publishSkills.code',
    ]) expect(translated[key], key).toBe(source[key])
  })

  it('resolves fa-IR, saves language preference, formats counts and translates suite pages', async () => {
    const instance = createInstance()
    localStorage.setItem('i18nextLng', 'fa-IR')
    await instance.use(LanguageDetector).init({
      resources: { en: { translation: en }, fa: { translation: fa } },
      fallbackLng: 'en', interpolation: { escapeValue: false },
      detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    })
    expect(instance.resolvedLanguage).toBe('fa')
    expect(instance.t('searchBar.button')).toBe('جست‌وجو')
    for (const count of [0, 1, 0.5, 2, 5]) {
      expect(instance.t('skillReviews.count', { count })).toBe(`${new Intl.NumberFormat('fa').format(count)} دیدگاه`)
    }
    expect(instance.t('dashboard.title')).toBe('داشبورد')
    expect(instance.t('landing.hero.title')).toBe('کشف و اشتراک skillهای هوش مصنوعی')
    expect(instance.t('suite.listTitle')).toBe('مجموعه‌های skill')
    expect(instance.t('skillDetail.installForAgent.prompt', { guideUrl: 'https://example.com', skill: '@global/test', version: '1.2.3' })).toContain('@global/test')
    await instance.changeLanguage('en')
    expect(localStorage.getItem('i18nextLng')).toBe('en')
    expect(instance.t('searchBar.button')).toBe('Search')
  })
})
