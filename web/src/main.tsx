import ReactDOM from 'react-dom/client'
import { App } from './app/providers'
import i18n from './i18n/config'
import { syncDocumentLanguage } from './shared/lib/document-language'
import './index.css'

/**
 * Main React entry point.
 *
 * Runtime configuration is loaded earlier in `bootstrap.ts`; this file only mounts the configured
 * application tree.
 */
// Wait for language detection before mounting, including direct links outside Layout.
async function mount() {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on('initialized', () => resolve()))
  }
  syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language)
  i18n.on('languageChanged', (language) => {
    syncDocumentLanguage(i18n.resolvedLanguage ?? language)
  })
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
}

void mount()
