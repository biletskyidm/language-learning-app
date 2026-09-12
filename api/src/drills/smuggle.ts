import {
  smuggleAnswerSchema,
  smuggleMaterialSchema,
  smuggleVerdictSchema,
  SMUGGLE_MAX_LENGTH,
  SMUGGLE_MIN_LENGTH,
  type DrillAggregates,
  type DrillRound,
  type SmuggleVerdict,
  type TrainingTarget,
} from '@contracts'
import type { LlmGateway } from '../deps'
import { withRetry } from '../llm/retry'
import { norm } from './norm'
import {
  DRILL_CORRECT_SCORE,
  DRILL_WRONG_SCORE,
  type DrillContext,
  type DrillJudgement,
  type DrillStrategy,
} from './strategy'

const JUDGE_ATTEMPTS = 2

/** The judge may skip a target, rename it or invent one; the round's own targets decide what is scored. */
const resultsFor = (judged: SmuggleVerdict['results'], targets: TrainingTarget[]): SmuggleVerdict['results'] => {
  const byNorm = new Map(judged.map((one) => [norm(one.expression), one]))

  return targets.map(({ expression }) => {
    const found = byNorm.get(norm(expression))

    return found ? { ...found, expression } : { expression, ok: false, note: 'not found' }
  })
}

export class SmuggleDrill implements DrillStrategy {
  readonly type = 'smuggle' as const

  constructor(private readonly llm: Pick<LlmGateway, 'judgeSmuggle'>) {}

  async generate({ index, targets }: DrillContext): Promise<DrillRound> {
    return { index, targets, material: { targets } }
  }

  async judge(round: DrillRound, body: unknown): Promise<DrillJudgement> {
    const { targets } = smuggleMaterialSchema.parse(round.material)
    const parsed = smuggleAnswerSchema.safeParse(body)
    if (!parsed.success) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `message: work all three in, ${SMUGGLE_MIN_LENGTH} to ${SMUGGLE_MAX_LENGTH} characters`,
      }
    }

    const { message } = parsed.data
    const { results, reply } = await withRetry(() => this.llm.judgeSmuggle({ targets, message }), {
      attempts: JUDGE_ATTEMPTS,
    })

    return { ok: true, answer: parsed.data, verdict: { results: resultsFor(results, targets), reply } }
  }

  scoresFor(round: DrillRound): Map<string, number> {
    const { results } = smuggleVerdictSchema.parse(round.verdict)
    const byNorm = new Map(results.map(({ expression, ok }) => [norm(expression), ok]))

    return new Map(
      round.targets.map(({ expressionId, expression }) => [
        expressionId,
        byNorm.get(norm(expression)) ? DRILL_CORRECT_SCORE : DRILL_WRONG_SCORE,
      ]),
    )
  }

  redact(round: DrillRound): DrillRound {
    return round
  }

  aggregate(rounds: DrillRound[]): DrillAggregates {
    const judged = rounds.flatMap((round) => {
      const parsed = smuggleVerdictSchema.safeParse(round.verdict)

      return parsed.success ? [parsed.data] : []
    })
    const results = judged.flatMap(({ results }) => results)

    return {
      rounds: judged.length,
      correct: results.filter(({ ok }) => ok).length,
      wrong: results.filter(({ ok }) => !ok).length,
    }
  }
}
