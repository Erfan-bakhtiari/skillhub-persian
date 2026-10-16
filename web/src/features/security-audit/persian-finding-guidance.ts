/**
 * Explanations for Cisco Skill Scanner 2.1.0 core signatures and this repository's
 * VETTER examples. These are guidance, not translations of arbitrary analyzer output.
 * Keep original findings available; never rewrite audit records or masked snippets.
 */
import persian from '@/i18n/security-fa.json'

const rules: Record<string, { title: string; guidance: string }> = persian.rules

export function getPersianFindingGuidance(ruleId: string): [string, string] | undefined {
  const rule = Object.prototype.hasOwnProperty.call(rules, ruleId) ? rules[ruleId] : undefined
  return rule ? [rule.title, rule.guidance] : undefined
}

export function localizeScanFailure(reason: string | null, language?: string): string | null {
  if (!reason || !language?.startsWith('fa')) return reason
  switch (reason) {
    case 'Security scanner did not recover before the configured timeout. Retry after scanner availability is restored.':
      return persian.scanFailures.unavailable
    case 'Security scan failed after automatic retries. Retry the scan or contact an administrator.':
      return persian.scanFailures.failed
    default:
      return reason
  }
}
