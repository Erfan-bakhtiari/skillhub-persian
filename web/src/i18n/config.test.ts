import { describe, expect, it, vi } from 'vitest'

// The i18n config module performs side-effect-only initialization.
// We mock i18next to verify that init is called with expected config.

const initMock = vi.fn().mockReturnThis()
const useMock = vi.fn().mockReturnThis()

vi.mock('i18next', () => ({
  default: {
    use: useMock,
    init: initMock,
  },
}))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

vi.mock('i18next-browser-languagedetector', () => ({
  default: class MockDetector {},
}))

vi.mock('./locales/en.json', () => ({
  default: { greeting: 'Hello' },
}))

vi.mock('./locales/zh.json', () => ({
  default: { greeting: '你好' },
}))

vi.mock('./locales/ru.json', () => ({
  default: { greeting: 'Привет' },
}))

// Import triggers the side-effect initialization
await import('./config')

describe('i18n config', () => {
  it('chains the language detector and react-i18next plugins', () => {
    expect(useMock).toHaveBeenCalledTimes(2)
  })

  it('uses Persian as the default and restricts supported languages', () => {
    expect(initMock).toHaveBeenCalledTimes(1)
    const initOptions = initMock.mock.calls[0][0]
    expect(initOptions.fallbackLng).toBe('fa')
    expect(initOptions.supportedLngs).toEqual(['fa', 'en'])
    expect(initOptions.load).toBe('languageOnly')
  })

  it('disables HTML escaping for React interpolation', () => {
    const initOptions = initMock.mock.calls[0][0]
    expect(initOptions.interpolation.escapeValue).toBe(false)
  })

  it('restores explicit choices without detecting the browser language', () => {
    const initOptions = initMock.mock.calls[0][0]
    expect(initOptions.detection.order).toEqual(['localStorage'])
    expect(initOptions.detection.caches).toEqual(['localStorage'])
  })

  it('registers only Persian and English resource bundles', () => {
    const initOptions = initMock.mock.calls[0][0]
    expect(initOptions.resources).toHaveProperty('en')
    expect(Object.keys(initOptions.resources).sort()).toEqual(['en', 'fa'])
    expect(initOptions.resources.fa.translation.searchBar.button).toBe('جست‌وجو')
    expect(initOptions.resources.en).toHaveProperty('translation')
  })
})
