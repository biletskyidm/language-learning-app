import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  describeMaterialSchema,
  describeTrainingSchema,
  drillAnswerResponseSchema,
  drillRoundResponseSchema,
  PICK_LIMIT_DEFAULT,
  type DescribeTraining,
  type Expression,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const DAY_MS = 86_400_000
const daysAfter = (days: number) => new Date(NOW.getTime() + days * DAY_MS)

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
  ...overrides,
})

const VOCABULARY = [
  expression(),
  expression({ id: 'e2', expression: 'touch base', meaning: 'to make brief contact' }),
]

/** Uses no word of "break the ice" or "touch base", so the guard lets it through to the judge. */
const DESCRIPTION = 'saying something friendly first so a stiff room warms up'

const judgement = (guess: string) => ({ guess, note: 'Clear and to the point.' })

type Harness = {
  app: ReturnType<typeof createApp>
  clock: () => Date
  llm: FakeLlmGateway
  stored: Training[]
  vocabulary: Expression[]
}

const harness = (llm: FakeLlmGateway, vocabulary = VOCABULARY.map((e) => ({ ...e }))) => {
  const stored: Training[] = []
  const deps = testDeps({
    llm,
    expressions: new InMemoryExpressionRepository(vocabulary),
    trainings: new InMemoryTrainingRepository(stored),
  })

  return { app: createApp(deps), clock: deps.clock, llm, stored, vocabulary } satisfies Harness
}

/** Every call signs a fresh nonce, so a second request to one app is not read as a replay. */
const post = (h: Harness, path: string, body?: unknown) =>
  h.app.request(path, {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, h.clock), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const startDescribe = async (llm = new FakeLlmGateway(), vocabulary?: Expression[]) => {
  const h = harness(llm, vocabulary)
  const res = await post(h, '/trainings', { type: 'describe', expressionIds: ['e1', 'e2'] })
  const training = describeTrainingSchema.parse(await res.json())

  return { ...h, res, training }
}

const firstRound = async (llm?: FakeLlmGateway) => {
  const session = await startDescribe(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds`)

  return { ...session, res, body: await res.json() }
}

const answered = async (description: string, llm?: FakeLlmGateway) => {
  const session = await firstRound(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { description })

  return { ...session, answerRes: res, answer: await res.json() }
}

const materialOf = (round: { material: unknown }) => describeMaterialSchema.parse(round.material)

describe('POST /trainings for a describe session', () => {
  it('opens an active session with the targets snapshotted and no round yet', async () => {
    const { res, training, llm } = await startDescribe()

    expect(res.status).toBe(201)
    expect(training).toMatchObject({ type: 'describe', status: 'ACTIVE', rounds: [], createdAt: NOW })
    expect(training.targets.map(({ expression }) => expression)).toEqual(['break the ice', 'touch base'])
    expect(llm.describeCalls).toEqual([])
  })

  it('lets the picker choose the default pool when no targets are named', async () => {
    const plenty = Array.from({ length: 8 }, (_, i) => expression({ id: `x${i}`, expression: `phrase ${i}` }))
    const h = harness(new FakeLlmGateway(), plenty)

    const res = await post(h, '/trainings', { type: 'describe' })

    expect(res.status).toBe(201)
    expect(describeTrainingSchema.parse(await res.json()).targets).toHaveLength(PICK_LIMIT_DEFAULT)
  })
})

describe('POST /trainings/:id/rounds for a describe session', () => {
  it('asks for one target and offers every session target as a candidate', async () => {
    const { res, body } = await firstRound()

    expect(res.status).toBe(200)
    const { round } = drillRoundResponseSchema.parse(body)
    expect(round.index).toBe(0)
    expect(materialOf(round)).toEqual({
      targetExpressionId: 'e1',
      expression: 'break the ice',
      candidates: ['break the ice', 'touch base'],
    })
    expect(round.targets).toEqual([
      { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
    ])
  })

  it('deals a round without calling the model', async () => {
    const { llm } = await firstRound()

    expect(llm.describeCalls).toEqual([])
  })

  it('moves to the next target rather than repeating one already dealt', async () => {
    const session = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }))

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    const { round } = drillRoundResponseSchema.parse(await res.json())
    expect(round.index).toBe(1)
    expect(materialOf(round).expression).toBe('touch base')
  })

  it('starts the pool again once every target has had a round', async () => {
    const llm = new FakeLlmGateway({
      describeJudgements: [judgement('break the ice'), judgement('touch base')],
    })
    const session = await answered(DESCRIPTION, llm)
    await post(session, `/trainings/${session.training.id}/rounds`)
    await post(session, `/trainings/${session.training.id}/rounds/1/answer`, { description: DESCRIPTION })

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    expect(materialOf(drillRoundResponseSchema.parse(await res.json()).round).expression).toBe('break the ice')
  })

  it('replays the open round instead of dealing another when the response was lost', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    const { round, training } = drillRoundResponseSchema.parse(await res.json())
    expect(round.index).toBe(0)
    expect(training.rounds).toHaveLength(1)
  })
})

describe('POST /trainings/:id/rounds/:index/answer for a describe session', () => {
  it('counts a guess that matches the target, ignoring case and punctuation', async () => {
    const { answerRes, answer } = await answered(
      DESCRIPTION,
      new FakeLlmGateway({ describeJudgements: [judgement('Break the ice!')] }),
    )

    expect(answerRes.status).toBe(200)
    expect(drillAnswerResponseSchema.parse(answer).verdict).toEqual({
      guess: 'Break the ice!',
      correct: true,
      note: 'Clear and to the point.',
    })
  })

  it('counts a guess for another candidate as wrong', async () => {
    const { answer } = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('touch base')] }))

    expect(drillAnswerResponseSchema.parse(answer).verdict).toMatchObject({ guess: 'touch base', correct: false })
  })

  it('hands the judge the description and every session target to choose from', async () => {
    const { llm } = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }))

    expect(llm.describeCalls).toEqual([
      { description: DESCRIPTION, candidates: ['break the ice', 'touch base'] },
    ])
  })

  it('writes 8 for a target the judge recognised', async () => {
    const { answer, vocabulary } = await answered(
      DESCRIPTION,
      new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }),
    )

    expect(drillAnswerResponseSchema.parse(answer).srsEffects).toEqual([
      expect.objectContaining({
        expressionId: 'e1',
        expression: 'break the ice',
        scoreWritten: 8,
        source: { kind: 'round', index: 0 },
        after: { score: 8, timesPracticed: 1, nextTrainingAt: daysAfter(1) },
      }),
    ])
    expect(vocabulary.map(({ score, timesPracticed }) => [score, timesPracticed])).toEqual([
      [8, 1],
      [undefined, undefined],
    ])
  })

  it('writes 2 for a target the judge did not recognise', async () => {
    const { answer, vocabulary } = await answered(
      DESCRIPTION,
      new FakeLlmGateway({ describeJudgements: [judgement('touch base')] }),
    )

    expect(drillAnswerResponseSchema.parse(answer).srsEffects).toEqual([
      expect.objectContaining({ expressionId: 'e1', scoreWritten: 2, after: { score: 2, timesPracticed: 1, nextTrainingAt: NOW } }),
    ])
    expect(vocabulary[1]?.score).toBeUndefined()
  })

  it('keeps the description and verdict on the round it belongs to', async () => {
    const { stored } = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }))

    expect((stored[0] as DescribeTraining).rounds[0]).toMatchObject({
      answer: { description: DESCRIPTION },
      verdict: { guess: 'break the ice', correct: true },
      answeredAt: NOW,
    })
  })

  it('refuses a description that gives away a word of the target, without paying for a judge', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, {
      description: 'when you BREAK a silence at a party and people start talking',
    })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('USES_TARGET_WORDS')
    expect(session.llm.describeCalls).toEqual([])
    expect((session.stored[0] as DescribeTraining).rounds[0]?.answeredAt).toBeUndefined()
  })

  it('lets a function word of the target through, since it gives nothing away', async () => {
    const { answerRes } = await answered(
      'the moment a cold room warms up because someone said something light',
      new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }),
    )

    expect(answerRes.status).toBe(200)
  })

  it('refuses a description too short to be worth judging', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { description: 'dunno' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
    expect(session.llm.describeCalls).toEqual([])
  })

  it('refuses a second answer to the same round', async () => {
    const session = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }))

    const again = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, {
      description: DESCRIPTION,
    })

    expect(again.status).toBe(409)
    expect(apiErrorSchema.parse(await again.json()).error.code).toBe('ROUND_ALREADY_ANSWERED')
  })

  it('retries a judge that fails once', async () => {
    const { answerRes, llm } = await answered(
      DESCRIPTION,
      new FakeLlmGateway({ describeJudgements: [new Error('nope'), judgement('break the ice')] }),
    )

    expect(answerRes.status).toBe(200)
    expect(llm.describeCalls).toHaveLength(2)
  })

  it('stores nothing when the judge stays unavailable', async () => {
    const { answerRes, answer, stored } = await answered(
      DESCRIPTION,
      new FakeLlmGateway({ describeJudgements: [new Error('nope'), new Error('nope again')] }),
    )

    expect(answerRes.status).toBe(502)
    expect(apiErrorSchema.parse(answer).error.code).toBe('LLM_UNAVAILABLE')
    expect((stored[0] as DescribeTraining).rounds[0]?.answeredAt).toBeUndefined()
  })
})

describe('POST /trainings/:id/complete for a describe session', () => {
  it('counts the rounds the judge got right and wrong, without a narrative', async () => {
    const session = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('touch base')] }))

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(res.status).toBe(200)
    const completed = describeTrainingSchema.parse(await res.json())
    expect(completed).toMatchObject({ status: 'COMPLETED', completedAt: NOW })
    expect(completed.aggregates).toEqual({ rounds: 1, correct: 0, wrong: 1 })
    expect(session.llm.narrativeCalls).toEqual([])
  })

  it('leaves a round nobody answered out of the counts', async () => {
    const session = await answered(DESCRIPTION, new FakeLlmGateway({ describeJudgements: [judgement('break the ice')] }))
    await post(session, `/trainings/${session.training.id}/rounds`)

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(describeTrainingSchema.parse(await res.json()).aggregates).toEqual({ rounds: 1, correct: 1, wrong: 0 })
  })

  it('cancels a describe session without any aggregates', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/cancel`)

    expect(res.status).toBe(200)
    const canceled = describeTrainingSchema.parse(await res.json())
    expect(canceled).toMatchObject({ status: 'CANCELED', canceledAt: NOW })
    expect(canceled.aggregates).toBeUndefined()
  })
})
