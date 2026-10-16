import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import fa from './locales/fa.json'

/**
 * Initializes i18next for the browser app. Language preference is restored from
 * localStorage so explicit choices survive reloads. New visitors and obsolete
 * language preferences use Persian regardless of the browser locale.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa },
    },
    supportedLngs: ['fa', 'en'],
    load: 'languageOnly',
    fallbackLng: 'fa',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  })

export default i18n
