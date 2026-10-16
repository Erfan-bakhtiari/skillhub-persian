import { describe, expect, it } from 'vitest'
import englishMessages from '../../../../server/skillhub-app/src/main/resources/messages.properties?raw'
import chineseMessages from '../../../../server/skillhub-app/src/main/resources/messages_zh.properties?raw'
import russianMessages from '../../../../server/skillhub-app/src/main/resources/messages_ru.properties?raw'
import persianMessages from '../../../../server/skillhub-app/src/main/resources/messages_fa.properties?raw'
import {
  extractPrecheckWarnings,
  isFrontmatterFailureMessage,
  isPrecheckConfirmationMessage,
  isPrecheckFailureMessage,
  isVersionExistsMessage,
} from './publish-error-utils'

describe('publish-error-utils', () => {
  it.each(['en', 'zh', 'ru', 'fa'])('recognizes actual %s server templates, including after a UI language switch', (locale) => {
    const templates: Record<string, string> = { en: englishMessages, zh: chineseMessages, ru: russianMessages, fa: persianMessages }
    const source = templates[locale]
    const render = (key: string, argument: string) => {
      const template = source.split(/\r?\n/).find(line => line.startsWith(`${key}=`))?.slice(key.length + 1)
      expect(template, key).toBeDefined()
      return template!.replace(/\\n/g, '\n').replace('{0}', argument)
    }
    const confirmation = render('error.skill.publish.precheck.confirmRequired', '- sample warning\n- example.txt: check me')
    expect(isPrecheckConfirmationMessage(confirmation)).toBe(true)
    expect(extractPrecheckWarnings(confirmation)).toEqual(['sample warning', 'example.txt: check me'])
    expect(isPrecheckFailureMessage(render('error.skill.publish.precheck.failed', 'blocked'))).toBe(true)
    expect(isVersionExistsMessage(render('error.skill.version.exists', '1.2.3'))).toBe(true)
  })

  it('detects confirmation-required warnings in English', () => {
    expect(isPrecheckConfirmationMessage('Pre-publish warnings require confirmation before publishing:\n- warning')).toBe(true)
  })

  it('detects confirmation-required warnings in Chinese', () => {
    expect(isPrecheckConfirmationMessage('预发布发现以下风险提醒，确认后仍可继续发布：\n- 风险提醒')).toBe(true)
  })

  it('extracts warning lines from a confirmation message', () => {
    expect(extractPrecheckWarnings(
      'Pre-publish warnings require confirmation before publishing:\n- Disallowed file extension: malware.exe\n- SKILL.md line 5 contains a value that looks like a secret or token.'
    )).toEqual([
      'Disallowed file extension: malware.exe',
      'SKILL.md line 5 contains a value that looks like a secret or token.',
    ])
  })

  it('keeps existing blocking precheck detection', () => {
    expect(isPrecheckFailureMessage('Pre-publish validation failed: validator blocked publish')).toBe(true)
  })

  it('keeps version and frontmatter detection helpers', () => {
    expect(isVersionExistsMessage('Version already exists')).toBe(true)
    expect(isFrontmatterFailureMessage('Invalid SKILL.md frontmatter')).toBe(true)
  })
})
