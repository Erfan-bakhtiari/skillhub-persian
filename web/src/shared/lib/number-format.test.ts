import { describe, expect, it } from 'vitest'
import { formatCompactCount, formatNumber } from './number-format'

describe('formatCompactCount', () => {
  it('returns raw values below one thousand', () => {
    expect(formatCompactCount(999)).toBe('999')
  })

  it('formats thousands with compact suffix', () => {
    expect(formatCompactCount(1_200)).toBe('1.2K')
    expect(formatCompactCount(10_400)).toBe('10K')
  })

  it('formats millions with compact suffix', () => {
    expect(formatCompactCount(1_500_000)).toBe('1.5M')
    expect(formatCompactCount(12_000_000)).toBe('12M')
  })

  it('formats Persian UI counts without changing technical strings', () => {
    expect(formatNumber(125, 'fa')).toBe('۱۲۵')
    expect(formatCompactCount(1200, 'fa-IR')).toContain('۱٫۲')
    expect(formatCompactCount(1200)).toBe('1.2K')
  })
})
