import type { Expression, Frequency } from '@contracts'

export const EXCLUDED_PRIORITY = 99

const tierPriority: Record<Frequency, number> = {
  very_common: 2,
  common: 3,
  moderate: 4,
  uncommon: 5,
  'formal/academic': 6,
}

export const FREQUENCY_TIERS = Object.entries(tierPriority) as [Frequency, number][]

export const priorityOf = (expression: Expression, now: Date): number => {
  if (expression.score !== undefined) {
    const due = expression.nextTrainingAt !== undefined && expression.nextTrainingAt <= now
    return due ? 1 : EXCLUDED_PRIORITY
  }

  return tierPriority[expression.frequency] ?? EXCLUDED_PRIORITY
}
