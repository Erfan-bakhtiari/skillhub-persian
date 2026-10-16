import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from './format-relative-time'

describe('Persian relative time', () => {
  afterEach(() => vi.useRealTimers())
  it('uses Persian text and digits for recent and older dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'))
    expect(formatRelativeTime('2026-10-15T12:00:00Z', 'fa-IR')).toBe('همین حالا')
    expect(formatRelativeTime('2026-10-15T11:55:00Z', 'fa')).toBe('۵ دقیقه پیش')
    expect(formatRelativeTime('2026-08-15T12:00:00Z', 'fa')).toContain('۱۴۰۵')
    expect(formatRelativeTime('2026-10-15T11:55:00Z', 'en')).toBe('5m')
  })
})
