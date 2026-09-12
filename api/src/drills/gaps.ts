import { z } from 'zod'
import {
  gapsAnswerSchema,
  gapsMaterialSchema,
  gapsVerdictSchema,
  GAPS_BLANK,
  type DrillAggregates,
  type DrillRound,
  type GapsMaterial,
  type TrainingTarget,
} from '@contracts'
import type { LlmGateway } from '../deps'
import { withRetry } from '../llm/retry'
import {
  DRILL_CORRECT_SCORE,
  DRILL_WRONG_SCORE,
  type DrillContext,
  type DrillJudgement,
  type DrillStrategy,
} from './strategy'

const GENERATE_ATTEMPTS = 2

/** Letters, spaces and apostrophes only, so "Break the ice!" and "break the ice" are the same answer. */
export const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const shuffled = <T>(items: T[]) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }

  return copy
}

/** The model spells a phrase its own way; every blank is still keyed by the vocabulary's wording. */
const answerKeyFor = (answers: string[], targets: TrainingTarget[]): string[] => {
  const byNorm = new Map(targets.map(({ expression }) => [norm(expression), expression]))
  const key = answers.map((answer) => byNorm.get(norm(answer)))

  if (key.length !== targets.length || new Set(key).size !== key.length || key.some((one) => one === undefined)) {
    throw new Error('The gaps paragraph did not blank out every target exactly once')
  }

  return key as string[]
}

const materialFor = (story: string, answers: string[], targets: TrainingTarget[]): GapsMaterial => {
  const answerKey = answerKeyFor(answers, targets)
  const parts = story.split(GAPS_BLANK)
  if (parts.length !== answerKey.length + 1) {
    throw new Error(`The gaps paragraph has ${parts.length - 1} blanks for ${answerKey.length} expressions`)
  }

  return { parts, bank: shuffled(answerKey), answerKey }
}

const storedAnswerKey = (round: DrillRound): string[] => {
  const { answerKey } = gapsMaterialSchema.parse(round.material)
  if (!answerKey) throw new Error('A stored gaps round has no answer key')

  return answerKey
}

export class GapsDrill implements DrillStrategy {
  readonly type = 'gaps' as const

  constructor(private readonly llm: Pick<LlmGateway, 'generateGaps'>) {}

  async generate({ index, targets }: DrillContext): Promise<DrillRound> {
    const material = await withRetry(
      async () => {
        const { story, answers } = await this.llm.generateGaps({ targets })

        return materialFor(story, answers, targets)
      },
      { attempts: GENERATE_ATTEMPTS },
    )

    return { index, targets, material }
  }

  judge(round: DrillRound, body: unknown): DrillJudgement {
    const answerKey = storedAnswerKey(round)
    const parsed = gapsAnswerSchema
      .extend({ fills: z.array(z.string()).length(answerKey.length) })
      .safeParse(body)
    if (!parsed.success) return { ok: false, message: `fills: expected one phrase per blank (${answerKey.length})` }

    const { fills } = parsed.data

    return {
      ok: true,
      answer: parsed.data,
      verdict: {
        perBlank: answerKey.map((expected, blank) => {
          const given = fills[blank] ?? ''

          return { expected, given, correct: norm(given) === norm(expected) }
        }),
      },
    }
  }

  scoresFor(round: DrillRound): Map<string, number> {
    const { perBlank } = gapsVerdictSchema.parse(round.verdict)
    const byNorm = new Map(round.targets.map(({ expression, expressionId }) => [norm(expression), expressionId]))

    return new Map(
      perBlank.flatMap(({ expected, correct }) => {
        const expressionId = byNorm.get(norm(expected))

        return expressionId ? [[expressionId, correct ? DRILL_CORRECT_SCORE : DRILL_WRONG_SCORE] as const] : []
      }),
    )
  }

  redact(round: DrillRound): DrillRound {
    if (round.answeredAt) return round
    const { parts, bank } = gapsMaterialSchema.parse(round.material)

    return { ...round, material: { parts, bank } }
  }

  aggregate(rounds: DrillRound[]): DrillAggregates {
    const answered = rounds.flatMap((round) => {
      const parsed = gapsVerdictSchema.safeParse(round.verdict)

      return parsed.success ? [parsed.data] : []
    })
    const blanks = answered.flatMap(({ perBlank }) => perBlank)

    return {
      rounds: answered.length,
      correct: blanks.filter(({ correct }) => correct).length,
      wrong: blanks.filter(({ correct }) => !correct).length,
    }
  }
}
