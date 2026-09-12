import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  drillAnswerResponseSchema,
  drillRoundResponseSchema,
  smuggleMaterialSchema,
  smuggleTrainingSchema,
  smuggleVerdictSchema,
  SMUGGLE_TARGETS_DEFAULT,
  type Expression,
  type SmuggleTraining,
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
  expression({ id: 'e3', expression: 'a ballpark figure', meaning: 'a rough estimate' }),
]

const MESSAGE =
  'I tried to break the ice with a joke, then said we should touch base on Friday once I have a ballpark figure.'

const result = (expression: string, ok: boolean) => ({ expression, ok, note: ok ? 'Natural fit.' : 'Not quite.' })

const judgement = (results: { expression: string; ok: boolean; note: string }[], reply = 'Sounds good — Friday works.') => ({
  results,
  reply,
})

const ALL_OK = judgement([
  result('break the ice', true),
  result('touch base', true),
  result('a ballpark figure', true),
])

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

const startSmuggle = async (llm = new FakeLlmGateway(), vocabulary?: Expression[]) => {
  const h = harness(llm, vocabulary)
  const res = await post(h, '/trainings', { type: 'smuggle', expressionIds: ['e1', 'e2', 'e3'] })

  return { ...h, res, training: smuggleTrainingSchema.parse(await res.json()) }
}

const firstRound = async (llm?: FakeLlmGateway) => {
  const session = await startSmuggle(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds`)

  return { ...session, res, body: await res.json() }
}

const answered = async (message: string, llm?: FakeLlmGateway) => {
  const session = await firstRound(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { message })

  return { ...session, answerRes: res, answer: await res.json() }
}

describe('POST /trainings for a smuggle session', () => {
  it('opens an active session with the targets snapshotted and no round yet', async () => {
    const { res, training, llm } = await startSmuggle()

    expect(res.status).toBe(201)
    expect(training).toMatchObject({ type: 'smuggle', status: 'ACTIVE', rounds: [], createdAt: NOW })
    expect(training.targets.map(({ expression }) => expression)).toEqual([
      'break the ice',
      'touch base',
      'a ballpark figure',
    ])
    expect(llm.smuggleCalls).toEqual([])
  })

  it('lets the picker choose three targets when none are named', async () => {
    const plenty = Array.from({ length: 8 }, (_, i) => expression({ id: `x${i}`, expression: `phrase ${i}` }))
    const h = harness(new FakeLlmGateway(), plenty)

    const res = await post(h, '/trainings', { type: 'smuggle' })

    expect(res.status).toBe(201)
    expect(smuggleTrainingSchema.parse(await res.json()).targets).toHaveLength(SMUGGLE_TARGETS_DEFAULT)
  })
})

describe('POST /trainings/:id/rounds for a smuggle session', () => {
  it('puts all three targets in the round without calling the model', async () => {
    const { res, body, llm } = await firstRound()

    expect(res.status).toBe(200)
    const { round } = drillRoundResponseSchema.parse(body)
    expect(round.index).toBe(0)
    expect(smuggleMaterialSchema.parse(round.material).targets.map(({ expression }) => expression)).toEqual([
      'break the ice',
      'touch base',
      'a ballpark figure',
    ])
    expect(round.targets).toHaveLength(3)
    expect(llm.smuggleCalls).toEqual([])
  })

  it('replays the open round instead of dealing another when the response was lost', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    const { round, training } = drillRoundResponseSchema.parse(await res.json())
    expect(round.index).toBe(0)
    expect(training.rounds).toHaveLength(1)
  })

  it('deals a second round on the same three targets', async () => {
    const session = await answered(MESSAGE, new FakeLlmGateway({ smuggleJudgements: [ALL_OK] }))

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    expect(drillRoundResponseSchema.parse(await res.json()).round.index).toBe(1)
  })
})

describe('POST /trainings/:id/rounds/:index/answer for a smuggle session', () => {
  it('hands the judge the round targets and the message', async () => {
    const { llm } = await answered(MESSAGE, new FakeLlmGateway({ smuggleJudgements: [ALL_OK] }))

    expect(llm.smuggleCalls).toEqual([
      {
        message: MESSAGE,
        targets: [
          { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
          { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
          { expressionId: 'e3', expression: 'a ballpark figure', meaning: 'a rough estimate' },
        ],
      },
    ])
  })

  it('keeps the tutor reply on the verdict', async () => {
    const { answerRes, answer } = await answered(MESSAGE, new FakeLlmGateway({ smuggleJudgements: [ALL_OK] }))

    expect(answerRes.status).toBe(200)
    const { verdict } = drillAnswerResponseSchema.parse(answer)
    expect(smuggleVerdictSchema.parse(verdict).reply).toBe('Sounds good — Friday works.')
  })

  it('answers with one result per target, in the round order', async () => {
    const { answer } = await answered(
      MESSAGE,
      new FakeLlmGateway({
        smuggleJudgements: [
          judgement([result('touch base', true), result('break the ice', false), result('a ballpark figure', true)]),
        ],
      }),
    )

    expect(smuggleVerdictSchema.parse(drillAnswerResponseSchema.parse(answer).verdict).results).toEqual([
      result('break the ice', false),
      result('touch base', true),
      result('a ballpark figure', true),
    ])
  })

  it('marks a target the judge said nothing about as not found', async () => {
    const { answer } = await answered(
      MESSAGE,
      new FakeLlmGateway({ smuggleJudgements: [judgement([result('break the ice', true), result('touch base', true)])] }),
    )

    const { results } = smuggleVerdictSchema.parse(drillAnswerResponseSchema.parse(answer).verdict)
    expect(results).toHaveLength(3)
    expect(results[2]).toEqual({ expression: 'a ballpark figure', ok: false, note: 'not found' })
  })

  it('drops a result for a phrase that was never a target of this round', async () => {
    const { answer } = await answered(
      MESSAGE,
      new FakeLlmGateway({
        smuggleJudgements: [
          judgement([
            result('break the ice', true),
            result('touch base', true),
            result('a ballpark figure', true),
            result('raise the bar', true),
          ]),
        ],
      }),
    )

    const { results } = smuggleVerdictSchema.parse(drillAnswerResponseSchema.parse(answer).verdict)
    expect(results.map(({ expression }) => expression)).toEqual(['break the ice', 'touch base', 'a ballpark figure'])
  })

  it('writes 8 for every target that landed and 2 for the one that did not', async () => {
    const { answer, vocabulary } = await answered(
      MESSAGE,
      new FakeLlmGateway({
        smuggleJudgements: [
          judgement([result('break the ice', true), result('touch base', false), result('a ballpark figure', true)]),
        ],
      }),
    )

    expect(drillAnswerResponseSchema.parse(answer).srsEffects).toEqual([
      expect.objectContaining({
        expressionId: 'e1',
        scoreWritten: 8,
        source: { kind: 'round', index: 0 },
        after: { score: 8, timesPracticed: 1, nextTrainingAt: daysAfter(1) },
      }),
      expect.objectContaining({
        expressionId: 'e2',
        scoreWritten: 2,
        after: { score: 2, timesPracticed: 1, nextTrainingAt: NOW },
      }),
      expect.objectContaining({ expressionId: 'e3', scoreWritten: 8 }),
    ])
    expect(vocabulary.map(({ score }) => score)).toEqual([8, 2, 8])
  })

  it('keeps the message and verdict on the round it belongs to', async () => {
    const { stored } = await answered(MESSAGE, new FakeLlmGateway({ smuggleJudgements: [ALL_OK] }))

    expect((stored[0] as SmuggleTraining).rounds[0]).toMatchObject({
      answer: { message: MESSAGE },
      answeredAt: NOW,
    })
  })

  it('refuses a message too short to have smuggled anything', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { message: 'too short' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
    expect(session.llm.smuggleCalls).toEqual([])
  })

  it('refuses a second answer to the same round', async () => {
    const session = await answered(MESSAGE, new FakeLlmGateway({ smuggleJudgements: [ALL_OK] }))

    const again = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { message: MESSAGE })

    expect(again.status).toBe(409)
    expect(apiErrorSchema.parse(await again.json()).error.code).toBe('ROUND_ALREADY_ANSWERED')
  })

  it('retries a judge that fails once', async () => {
    const { answerRes, llm } = await answered(
      MESSAGE,
      new FakeLlmGateway({ smuggleJudgements: [new Error('nope'), ALL_OK] }),
    )

    expect(answerRes.status).toBe(200)
    expect(llm.smuggleCalls).toHaveLength(2)
  })

  it('stores nothing when the judge stays unavailable', async () => {
    const { answerRes, answer, stored } = await answered(
      MESSAGE,
      new FakeLlmGateway({ smuggleJudgements: [new Error('nope'), new Error('again')] }),
    )

    expect(answerRes.status).toBe(502)
    expect(apiErrorSchema.parse(answer).error.code).toBe('LLM_UNAVAILABLE')
    expect((stored[0] as SmuggleTraining).rounds[0]?.answeredAt).toBeUndefined()
  })
})

describe('POST /trainings/:id/complete for a smuggle session', () => {
  it('counts the targets that landed across rounds, without a narrative', async () => {
    const session = await answered(
      MESSAGE,
      new FakeLlmGateway({
        smuggleJudgements: [
          judgement([result('break the ice', true), result('touch base', false), result('a ballpark figure', true)]),
        ],
      }),
    )

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(res.status).toBe(200)
    const completed = smuggleTrainingSchema.parse(await res.json())
    expect(completed).toMatchObject({ status: 'COMPLETED', completedAt: NOW })
    expect(completed.aggregates).toEqual({ rounds: 1, correct: 2, wrong: 1 })
    expect(session.llm.narrativeCalls).toEqual([])
  })

  it('cancels a smuggle session without any aggregates', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/cancel`)

    expect(res.status).toBe(200)
    expect(smuggleTrainingSchema.parse(await res.json())).toMatchObject({ status: 'CANCELED', canceledAt: NOW })
  })
})
