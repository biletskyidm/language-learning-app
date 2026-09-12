import {
  describeAnswerSchema,
  describeMaterialSchema,
  describeVerdictSchema,
  DESCRIBE_PASS_SCORE,
  type DrillAggregates,
  type DrillRound,
} from '@contracts'
import type { LlmGateway } from '../deps'
import { withRetry } from '../llm/retry'
import { norm } from './norm'
import { type DrillContext, type DrillJudgement, type DrillStrategy } from './strategy'

const JUDGE_ATTEMPTS = 2
const GIVEAWAY_MIN_LENGTH = 3

/** A written 0 means "not attempted" to the SRS service, so the worst description still counts as practice. */
const SRS_FLOOR = 1

/** Words of a target that carry none of its meaning, so a description may use them freely. */
const FUNCTION_WORDS = new Set([
  'the', 'and', 'but', 'nor', 'not', 'for', 'out', 'off', 'its', 'our', 'your', 'you', 'his', 'her', 'him', 'she',
  'they', 'them', 'their', 'that', 'this', 'with', 'from', 'into', 'onto', 'are', 'was', 'were', 'been', 'have',
  'has', 'had', 'all',
])

const words = (text: string) => norm(text).split(' ').filter(Boolean)

const giveawaysIn = (description: string, expression: string) => {
  const said = new Set(words(description))

  return words(expression).filter(
    (word) => word.length >= GIVEAWAY_MIN_LENGTH && !FUNCTION_WORDS.has(word) && said.has(word),
  )
}

export class DescribeDrill implements DrillStrategy {
  readonly type = 'describe' as const

  constructor(private readonly llm: Pick<LlmGateway, 'judgeDescription'>) {}

  /** Cycles the pool so no target comes up twice before the rest have had a turn. */
  async generate({ index, targets }: DrillContext): Promise<DrillRound> {
    const target = targets[index % targets.length]
    if (!target) throw new Error('A describe session needs at least one target')

    return {
      index,
      targets: [target],
      material: { targetExpressionId: target.expressionId, expression: target.expression },
    }
  }

  async judge(round: DrillRound, body: unknown): Promise<DrillJudgement> {
    const { expression } = describeMaterialSchema.parse(round.material)
    const meaning = round.targets[0]?.meaning ?? ''
    const parsed = describeAnswerSchema.safeParse(body)
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'description: say it in your own words, 10 to 600 characters' }
    }

    const { description } = parsed.data
    const giveaways = giveawaysIn(description, expression)
    if (giveaways.length) {
      return {
        ok: false,
        code: 'USES_TARGET_WORDS',
        message: `Describe it without saying ${giveaways.join(', ')}`,
      }
    }

    const verdict = await withRetry(() => this.llm.judgeDescription({ expression, meaning, description }), {
      attempts: JUDGE_ATTEMPTS,
    })

    return { ok: true, answer: parsed.data, verdict }
  }

  scoresFor(round: DrillRound): Map<string, number> {
    const { score } = describeVerdictSchema.parse(round.verdict)
    const { targetExpressionId } = describeMaterialSchema.parse(round.material)

    return new Map([[targetExpressionId, Math.max(score, SRS_FLOOR)]])
  }

  redact(round: DrillRound): DrillRound {
    return round
  }

  aggregate(rounds: DrillRound[]): DrillAggregates {
    const judged = rounds.flatMap((round) => {
      const parsed = describeVerdictSchema.safeParse(round.verdict)

      return parsed.success ? [parsed.data] : []
    })

    return {
      rounds: judged.length,
      correct: judged.filter(({ score }) => score >= DESCRIBE_PASS_SCORE).length,
      wrong: judged.filter(({ score }) => score < DESCRIBE_PASS_SCORE).length,
    }
  }
}
