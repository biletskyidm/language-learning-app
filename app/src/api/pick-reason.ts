import type { Expression } from '@contracts'

export const pickReason = (expression: Expression): string =>
  expression.score !== undefined ? 'due' : `new · ${expression.frequency.replace('_', ' ')}`
