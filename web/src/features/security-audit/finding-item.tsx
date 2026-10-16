import { useTranslation } from 'react-i18next'
import type { SecurityFinding } from './types'
import { SeverityBadge } from './severity-badge'
import { getPersianFindingGuidance } from './persian-finding-guidance'

interface FindingItemProps {
  finding: SecurityFinding
}

export function FindingItem({ finding }: FindingItemProps) {
  const { t, i18n } = useTranslation()
  const persian = (i18n.resolvedLanguage ?? i18n.language)?.startsWith('fa')
  const guidance = persian ? getPersianFindingGuidance(finding.ruleId) : undefined

  const location = [finding.filePath, finding.lineNumber].filter(Boolean).join(':')

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge severity={finding.severity} />
        <code dir="ltr" className="technical-text text-xs font-mono text-muted-foreground">{finding.ruleId}</code>
        {location && (
          <span dir="ltr" className="technical-text break-all text-xs text-muted-foreground">{location}</span>
        )}
      </div>

      {persian && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t('securityAudit.ruleExplanation')}: {guidance?.[0] ?? t('securityAudit.unknownRule')}</p>
          <p className="text-muted-foreground">{guidance?.[1] ?? t('securityAudit.unknownRuleGuidance')}</p>
          <p className="text-xs text-muted-foreground">{t('securityAudit.originalFinding')}</p>
        </div>
      )}
      <p dir="auto" className="break-words text-sm text-foreground">{finding.title}</p>

      {finding.message && (
        <p dir="auto" className="break-words text-sm text-muted-foreground">{finding.message}</p>
      )}

      {finding.codeSnippet && (
        <pre dir="ltr" className="technical-text overflow-x-auto rounded-lg bg-secondary/50 p-3 text-xs font-mono text-muted-foreground">
          {finding.codeSnippet}
        </pre>
      )}

      {finding.remediation && (
        <div className="bg-secondary/50 rounded-xl p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t('securityAudit.remediation')}: </span>
          <span dir="auto" className="break-words">{finding.remediation}</span>
        </div>
      )}
    </div>
  )
}
