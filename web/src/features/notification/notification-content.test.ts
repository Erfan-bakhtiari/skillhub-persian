import { describe, expect, it } from 'vitest'
import { resolveNotificationDisplay } from './notification-content'
import i18n from '@/i18n/config'

describe('resolveNotificationDisplay', () => {
  it('localizes every supported event in fa-IR without altering the selected language or technical values', async () => {
    await i18n.changeLanguage('en')
    for (const eventType of ['REVIEW_SUBMITTED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'PROMOTION_SUBMITTED', 'PROMOTION_APPROVED', 'PROMOTION_REJECTED', 'REPORT_SUBMITTED', 'REPORT_RESOLVED', 'SKILL_PUBLISHED', 'SUBSCRIPTION_NEW_VERSION', 'SUBSCRIPTION_VERSION_YANKED']) {
      const display = resolveNotificationDisplay({
        id: 1, category: 'REVIEW', eventType, title: 'Backend title', status: 'UNREAD',
        createdAt: '2026-03-20T00:00:00Z', bodyJson: JSON.stringify({ skillName: '@team/calendar', version: '1.0.0-beta.2' }),
      }, 'fa-IR')
      expect(display.title).toMatch(/[آ-ی]/)
      expect(display.description).toContain('\u2068@team/calendar\u2069')
      if (!eventType.startsWith('REPORT_')) expect(display.description).toContain('\u20681.0.0-beta.2\u2069')
      expect(display.description).not.toContain('undefined')
    }
    expect(i18n.language).toBe('en')
  })

  it('keeps a translated title and an empty description for malformed or absent notification metadata', () => {
    for (const bodyJson of [undefined, '{', 'null', '[]', '{"skillName":3,"version":{}}']) {
      const display = resolveNotificationDisplay({
        id: 1, category: 'REVIEW', eventType: 'REVIEW_APPROVED', title: 'Backend title', status: 'READ',
        createdAt: '2026-03-20T00:00:00Z', bodyJson,
      }, 'fa')
      expect(display).toEqual({ title: 'بررسی تأیید شد', description: '' })
    }
  })

  it('falls back to Persian for a previously supported Chinese locale', () => {
    const display = resolveNotificationDisplay({
      category: 'REVIEW',
      eventType: 'REVIEW_SUBMITTED',
      title: 'New review submitted for: Calendar',
      bodyJson: JSON.stringify({ skillName: 'Calendar', version: '1.0.0' }),
      status: 'UNREAD',
      createdAt: '2026-03-20T00:00:00Z',
      id: 1,
    }, 'zh-CN')

    expect(display.title).toBe('درخواست بررسی ارسال شد')
    expect(display.description).toContain('Calendar')
    expect(display.description).toContain('1.0.0')
  })

  it('renders review submitted content in English', () => {
    const display = resolveNotificationDisplay({
      category: 'REVIEW',
      eventType: 'REVIEW_SUBMITTED',
      title: 'New review submitted for: Calendar',
      bodyJson: JSON.stringify({ skillName: 'Calendar', version: '1.0.0' }),
      status: 'UNREAD',
      createdAt: '2026-03-20T00:00:00Z',
      id: 1,
    }, 'en')

    expect(display.title).toBe('Review submitted')
    expect(display.description).toContain('Calendar')
    expect(display.description).toContain('1.0.0')
  })

  it('falls back to the backend title when the event type is unsupported', () => {
    const display = resolveNotificationDisplay({
      category: 'PUBLISH',
      eventType: 'CUSTOM_EVENT',
      title: 'Backend supplied title',
      status: 'UNREAD',
      createdAt: '2026-03-20T00:00:00Z',
      id: 2,
    }, 'en')

    expect(display.title).toBe('Backend supplied title')
    expect(display.description).toBe('')
  })
})
