import type { TrainingTarget } from '@contracts'
import type { Clock } from '../deps'
import type { ExpressionRepository } from '../expressions/repository'
import { averageScore, nextTrainingAt } from './scheduler'

export interface SrsEffect {
  expressionId: string
  expression: string
  scoreWritten: number
  before: { score?: number; timesPracticed?: number; nextTrainingAt?: Date }
  after: { score: number; timesPracticed: number; nextTrainingAt: Date }
}

/** Chats and drills share this one path, so a phrase climbs the same ladder whatever practiced it. */
export class SrsService {
  constructor(
    private readonly expressions: ExpressionRepository,
    private readonly clock: Clock,
  ) {}

  async apply(userId: string, targets: TrainingTarget[], scores: Map<string, number>): Promise<SrsEffect[]> {
    const effects: SrsEffect[] = []
    const unique = [...new Map(targets.map((target) => [target.expressionId, target])).values()]
    const failed: string[] = []
    let firstError: unknown

    for (const target of unique) {
      const scoreWritten = scores.get(target.expressionId)
      if (scoreWritten === undefined || scoreWritten === 0) continue

      try {
        const expression = await this.expressions.findById(userId, target.expressionId)
        if (!expression) continue

        const now = this.clock()
        const timesPracticed = (expression.timesPracticed ?? 0) + 1
        const score = averageScore(expression.score ?? 0, scoreWritten, timesPracticed)
        const after = {
          score,
          timesPracticed,
          lastTimePracticedAt: now,
          nextTrainingAt: nextTrainingAt(timesPracticed, now, score),
        }

        await this.expressions.applySrs(userId, expression.id, after)

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
        })
      } catch (error) {
        failed.push(target.expressionId)
        firstError ??= error
      }
    }

    if (failed.length) {
      throw new Error(`SRS update failed for ${failed.join(', ')}`, { cause: firstError })
    }

    return effects
  }
}
