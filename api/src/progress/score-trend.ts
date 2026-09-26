import type { ScoredExpression } from '../expressions/repository'
import type { ScoreEffect } from '../trainings/repository'

const scoreBefore = (expression: ScoredExpression, effects: ScoreEffect[], end: Date) => {
  const past = effects.filter(({ at }) => at < end)
  if (past.length) return past[past.length - 1]!.after.score
  if (effects.length) return effects[0]!.before.score

  return expression.score
}

export const scoreTrend = (expressions: ScoredExpression[], effects: ScoreEffect[], ends: Date[]) => {
  const byExpression = new Map<string, ScoreEffect[]>()
  for (const effect of [...effects].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    byExpression.set(effect.expressionId, [...(byExpression.get(effect.expressionId) ?? []), effect])
  }

  return ends.map((end) => {
    const scores = expressions
      .filter(({ createdAt }) => createdAt < end)
      .map((expression) => scoreBefore(expression, byExpression.get(expression.id) ?? [], end))
      .filter((score) => score !== undefined)

    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
  })
}
