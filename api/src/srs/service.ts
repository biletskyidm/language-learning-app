import type { SrsEffect, TrainingTarget } from '@contracts'
import type { Clock } from '../deps'
import type { ExpressionRepository } from '../expressions/repository'
import { averageScore, nextTrainingAt } from './scheduler'

/** What was written and what could not be: a failed target must not cost the rest their snapshots. */
export interface SrsOutcome {
  effects: Omit<SrsEffect, 'source'>[]
  failures: { expressionId: string; error: unknown }[]
}

/** Chats and drills share this one path, so a phrase climbs the same ladder whatever practiced it. */
export class SrsService {
  constructor(
    private readonly expressions: ExpressionRepository,
    private readonly clock: Clock,
  ) {}

  async apply(userId: string, targets: TrainingTarget[], scores: Map<string, number>): Promise<SrsOutcome> {
    const effects: SrsOutcome['effects'] = []
    const failures: SrsOutcome['failures'] = []
    const unique = [...new Map(targets.map((target) => [target.expressionId, target])).values()]

    for (const target of unique) {
      const scoreWritten = scores.get(target.expressionId)
      if (scoreWritten === undefined || scoreWritten === 0) continue

      try {
        const expression = await this.expressions.findById(userId, target.expressionId)
        if (!expression) continue

        const now = this.clock()
        const timesPracticed = (expression.timesPracticed ?? 0) + 1
        const score = averageScore(expression.score ?? 0, scoreWritten, timesPracticed)
        const after = { score, timesPracticed, nextTrainingAt: nextTrainingAt(timesPracticed, now, score) }

        await this.expressions.applySrs(userId, expression.id, { ...after, lastTimePracticedAt: now })

        effects.push({
          expressionId: expression.id,
          expression: target.expression,
          scoreWritten,
          before: {
            score: expression.score,
            timesPracticed: expression.timesPracticed,
            nextTrainingAt: expression.nextTrainingAt,
          },
          after,
          at: now,
        })
      } catch (error) {
        failures.push({ expressionId: target.expressionId, error })
      }
    }

    return { effects, failures }
  }
}
