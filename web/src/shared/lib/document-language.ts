/**
 * Keep document language/direction aligned with i18n and discourage Chrome /
 * Google automatic translation from rewriting #root (React insertBefore crashes).
 */
export function getLanguageDirection(language: string): 'rtl' | 'ltr' {
  return language.split('-')[0]?.toLowerCase() === 'fa' ? 'rtl' : 'ltr'
}

export function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') {
    return
  }

  const primary = language.split('-')[0]?.toLowerCase() || 'en'
  const lang = primary === 'zh' ? 'zh-CN' : primary
  const html = document.documentElement

  if (html.lang !== lang) {
    html.lang = lang
  }
  html.dir = getLanguageDirection(language)

  html.setAttribute('translate', 'no')
  html.classList.add('notranslate')

  const root = document.getElementById('root')
  if (root) {
    root.setAttribute('translate', 'no')
    root.classList.add('notranslate')
  }
}
