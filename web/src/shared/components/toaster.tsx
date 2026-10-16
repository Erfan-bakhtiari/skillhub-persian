import { createPortal } from 'react-dom'
import { Toaster as Sonner } from 'sonner'
import { getPortalContainer } from '@/shared/lib/portal-container'
import { CENTER_TOASTER_ID } from '@/shared/lib/toast'
import { useTranslation } from 'react-i18next'
import { getLanguageDirection } from '@/shared/lib/document-language'

export function Toaster() {
  const { i18n } = useTranslation()
  const node = (
    <div translate="no">
      <Sonner
        dir={getLanguageDirection(i18n.resolvedLanguage ?? i18n.language)}
        id={CENTER_TOASTER_ID}
        position="top-center"
        className="!left-1/2 !right-auto !top-4 !-translate-x-1/2 !z-[100]"
        offset={16}
        mobileOffset={16}
        toastOptions={{
          toasterId: CENTER_TOASTER_ID,
          classNames: {
            toast: 'glass-strong mx-auto w-fit max-w-[min(100vw-2rem,32rem)] border border-border/40',
            title: 'text-foreground font-semibold text-start',
            description: 'text-muted-foreground text-start',
            content: 'w-full text-start',
            actionButton: 'bg-primary text-primary-foreground',
            cancelButton: 'bg-muted text-muted-foreground',
            error: 'border-destructive/40',
            success: 'border-emerald-500/40',
            warning: 'border-amber-500/40',
            info: 'border-blue-500/40',
          },
        }}
      />
    </div>
  )

  const host = typeof document !== 'undefined' ? getPortalContainer() : undefined
  if (host) {
    return createPortal(node, host)
  }
  return node
}
