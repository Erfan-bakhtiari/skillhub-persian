/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest'
import { syncDocumentLanguage } from './document-language'

describe('syncDocumentLanguage', () => {
  afterEach(() => {
    document.documentElement.lang = ''
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('translate')
    document.documentElement.classList.remove('notranslate')
    document.body.innerHTML = ''
  })

  it('maps zh* to zh-CN and marks html/root as notranslate', () => {
    document.body.innerHTML = '<div id="root"></div>'
    syncDocumentLanguage('zh')
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(document.documentElement.getAttribute('translate')).toBe('no')
    expect(document.documentElement.classList.contains('notranslate')).toBe(true)
    expect(document.getElementById('root')?.getAttribute('translate')).toBe('no')
  })

  it('uses the primary subtag for other locales', () => {
    document.body.innerHTML = '<div id="root"></div>'
    syncDocumentLanguage('ru-RU')
    expect(document.documentElement.lang).toBe('ru')
  })

  it('switches en → fa-IR → en and preserves translation protection for portal content', () => {
    document.body.innerHTML = '<div id="root"></div><div id="skillhub-portals"></div>'
    for (const [language, lang, dir] of [['en', 'en', 'ltr'], ['fa-IR', 'fa', 'rtl'], ['en', 'en', 'ltr']]) {
      syncDocumentLanguage(language)
      expect(document.documentElement.lang).toBe(lang)
      expect(document.documentElement.dir).toBe(dir)
      expect(document.documentElement.getAttribute('translate')).toBe('no')
      expect(document.getElementById('root')?.classList.contains('notranslate')).toBe(true)
    }
  })
})
