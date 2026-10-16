/**
 * Formats a timestamp as a compact relative time string for notification UI.
 * Keeps existing compact formats and uses Intl for Persian relative time.
 */
export function formatRelativeTime(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  const isChinese = lang.startsWith('zh')
  const isRussian = lang.startsWith('ru')
  const isPersian = lang.startsWith('fa')

  if (isPersian) {
    if (minutes < 1) return 'همین حالا'
    const formatter = new Intl.RelativeTimeFormat('fa', { numeric: 'always' })
    if (minutes < 60) return formatter.format(-minutes, 'minute')
    if (hours < 24) return formatter.format(-hours, 'hour')
    if (days < 30) return formatter.format(-days, 'day')
    return new Date(dateStr).toLocaleDateString('fa-IR', { calendar: 'persian', numberingSystem: 'arabext' })
  }

  if (minutes < 1) {
    if (isChinese) return '刚刚'
    if (isRussian) return 'только что'
    return 'just now'
  }
  if (minutes < 60) {
    if (isChinese) return `${minutes}分钟`
    if (isRussian) return `${minutes} мин`
    return `${minutes}m`
  }
  if (hours < 24) {
    if (isChinese) return `${hours}小时`
    if (isRussian) return `${hours} ч`
    return `${hours}h`
  }
  if (days < 30) {
    if (isChinese) return `${days}天`
    if (isRussian) return `${days} д`
    return `${days}d`
  }
  return new Date(dateStr).toLocaleDateString(isRussian ? 'ru-RU' : undefined)
}
