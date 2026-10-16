import type { NotificationItem } from '@/api/types'
import i18n from '@/i18n/config'

export type NotificationDisplay = {
  title: string
  description: string
}

type NotificationBody = {
  skillName?: string
  version?: string
}

function parseBody(bodyJson?: string): NotificationBody {
  if (!bodyJson) return {}
  try {
    const parsed: unknown = JSON.parse(bodyJson)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const body = parsed as Record<string, unknown>
    return {
      skillName: typeof body.skillName === 'string' ? body.skillName : undefined,
      version: typeof body.version === 'string' ? body.version : undefined,
    }
  } catch {
    return {}
  }
}

const LOCALIZED_EVENTS = new Set([
  'REVIEW_SUBMITTED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'PROMOTION_SUBMITTED',
  'PROMOTION_APPROVED',
  'PROMOTION_REJECTED',
  'REPORT_SUBMITTED',
  'REPORT_RESOLVED',
  'SKILL_PUBLISHED',
  'SUBSCRIPTION_NEW_VERSION',
  'SUBSCRIPTION_VERSION_YANKED',
])

/** Resolves the requested language without changing the app's selected locale. */
export function resolveNotificationDisplay(item: NotificationItem, language: string): NotificationDisplay {
  if (!LOCALIZED_EVENTS.has(item.eventType)) return { title: item.title, description: '' }

  const t = i18n.getFixedT(language)
  const body = parseBody(item.bodyJson)
  // Isolate package names and versions inside Persian sentences, keeping values intact.
  const isolate = (value: string) => language.toLowerCase().startsWith('fa') ? `\u2068${value}\u2069` : value
  const skillName = body.skillName ? isolate(body.skillName) : ''
  const versionSuffix = body.version ? t('notification.versionSuffix', { version: isolate(body.version) }) : ''
  const key = `notification.events.${item.eventType}`
  return {
    title: t(`${key}.title`),
    description: skillName ? t(`${key}.description`, { skillName, versionSuffix }) : '',
  }
}
