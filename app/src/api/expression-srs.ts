import type { Expression } from '@contracts'

const DAY_MS = 86_400_000

export const relativeDays = (date: Date, now: Date) => {
  const days = Math.round((date.getTime() - now.getTime()) / DAY_MS)

  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'

  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const shortDate = (date: Date, now: Date) => {
  const day = `${MONTHS[date.getMonth()]} ${date.getDate()}`

  return date.getFullYear() === now.getFullYear() ? day : `${day}, ${date.getFullYear()}`
}

export const srsSummary = (expression: Expression, now: Date): string => {
  if (expression.score === undefined) return `New · ${expression.frequency.replace('_', ' ')}`

  const due = expression.nextTrainingAt

  return [
    `Score ${expression.score.toFixed(1)}`,
    `Trained ${expression.timesPracticed ?? 0}×`,
    due ? `Due ${shortDate(due, now)}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}
