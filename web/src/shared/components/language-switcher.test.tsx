// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from './language-switcher'

const mockI18n = vi.hoisted(() => ({
  language: undefined as string | undefined,
  resolvedLanguage: undefined as string | undefined,
  changeLanguage: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: mockI18n }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockI18n.language = undefined
    mockI18n.resolvedLanguage = undefined
    mockI18n.changeLanguage.mockImplementation((language: string) => {
      mockI18n.language = language
      mockI18n.resolvedLanguage = language
      return Promise.resolve()
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('exports the LanguageSwitcher component', () => {
    expect(LanguageSwitcher).toBeTypeOf('function')
  })

  it('falls back to Persian when i18next has not resolved a language yet', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: 'فارسی' })).toBeTruthy()
  })

  it('uses the resolved language before the raw detected language', () => {
    mockI18n.language = 'zh-CN'
    mockI18n.resolvedLanguage = 'en'

    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: /English/i })).toBeTruthy()
  })

  it('updates the displayed language after selecting English', () => {
    mockI18n.language = 'fa'
    mockI18n.resolvedLanguage = 'fa'

    render(<LanguageSwitcher />)

    fireEvent.click(screen.getByRole('button', { name: 'فارسی' }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['فارسی', 'English'])
    fireEvent.click(screen.getByRole('menuitem', { name: /English/i }))

    expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en')
    expect(screen.getByRole('button', { name: /English/i })).toBeTruthy()
  })

  it('selects Persian and recognizes the regional locale', () => {
    mockI18n.language = 'fa-IR'
    mockI18n.resolvedLanguage = 'fa'
    render(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'فارسی' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'فارسی' }))
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith('fa')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
