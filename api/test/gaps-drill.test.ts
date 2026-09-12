import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  drillAnswerResponseSchema,
  drillRoundResponseSchema,
  gapsTrainingSchema,
  GAPS_TARGETS_DEFAULT,
  type Expression,
  type GapsTraining,
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

const STORY = 'He tried to ___ over coffee, then went off to ___ with his manager about the numbers.'

const generation = { story: STORY, answers: ['break the ice', 'touch base'] }

const PARTS = ['He tried to ', ' over coffee, then went off to ', ' with his manager about the numbers.']

type Harness = {
  app: ReturnType<typeof createApp>
  clock: () => Date
  llm: FakeLlmGateway
  stored: Training[]
  vocabulary: Expression[]
}

const harness = async (llm: FakeLlmGateway, vocabulary = VOCABULARY.map((e) => ({ ...e }))) => {
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

const startGaps = async (llm = new FakeLlmGateway({ gapsGenerations: [generation] }), vocabulary?: Expression[]) => {
  const h = await harness(llm, vocabulary)
  const res = await post(h, '/trainings', { type: 'gaps', expressionIds: ['e1', 'e2'] })
  const training = gapsTrainingSchema.parse(await res.json())

  return { ...h, res, training }
}

const firstRound = async (llm?: FakeLlmGateway) => {
  const session = await startGaps(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds`)

  return { ...session, res, body: await res.json() }
}

describe('POST /trainings for a drill', () => {
  it('opens an active gaps session with the targets snapshotted and no round yet', async () => {
    const { res, training, llm } = await startGaps()

    expect(res.status).toBe(201)
    expect(training).toMatchObject({ type: 'gaps', status: 'ACTIVE', rounds: [], createdAt: NOW })
    expect(training.targets.map(({ expression }) => expression)).toEqual(['break the ice', 'touch base'])
    expect(llm.gapsCalls).toEqual([])
  })

  it('lets the picker choose the default number of gaps targets when none are named', async () => {
    const plenty = Array.from({ length: 8 }, (_, i) => expression({ id: `x${i}`, expression: `phrase ${i}` }))
    const h = await harness(new FakeLlmGateway(), plenty)

    const res = await post(h, '/trainings', { type: 'gaps' })

    expect(res.status).toBe(201)
    expect(gapsTrainingSchema.parse(await res.json()).targets).toHaveLength(GAPS_TARGETS_DEFAULT)
  })

  it('refuses a drill type that has no strategy yet', async () => {
    const h = await harness(new FakeLlmGateway())

    const res = await post(h, '/trainings', { type: 'smuggle', expressionIds: ['e1'] })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /trainings/:id/rounds', () => {
  it('splits the generated story into the segments around each blank', async () => {
    const { res, body } = await firstRound()

    expect(res.status).toBe(200)
    const { round } = drillRoundResponseSchema.parse(body)
    expect(round.index).toBe(0)
    expect(round.material.parts).toEqual(PARTS)
  })

  it('offers every target in the bank', async () => {
    const { body } = await firstRound()

    const { round } = drillRoundResponseSchema.parse(body)
    expect([...round.material.bank].sort()).toEqual(['break the ice', 'touch base'])
  })

  it('keeps the answer key off an unanswered round, so the blanks cannot be read off the wire', async () => {
    const { body } = await firstRound()

    expect(body.round.material.answerKey).toBeUndefined()
    expect(body.training.rounds[0].material.answerKey).toBeUndefined()
  })

  it('asks for a paragraph built from the session targets', async () => {
    const { llm } = await firstRound()

    expect(llm.gapsCalls).toEqual([
      {
        targets: [
          { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
          { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
        ],
      },
    ])
  })

  it('stores the round on the training so a resumed session shows it', async () => {
    const { stored, body } = await firstRound()

    expect((stored[0] as GapsTraining).rounds).toHaveLength(1)
    expect(body.training.rounds).toHaveLength(1)
  })

  it('numbers a second round after the first', async () => {
    const session = await startGaps(
      new FakeLlmGateway({ gapsGenerations: [generation, { ...generation }] }),
    )
    await post(session, `/trainings/${session.training.id}/rounds`)

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    expect(drillRoundResponseSchema.parse(await res.json()).round.index).toBe(1)
  })

  it('retries a generation whose answers are not the session targets', async () => {
    const { res, llm } = await firstRound(
      new FakeLlmGateway({
        gapsGenerations: [{ story: STORY, answers: ['break the ice', 'raise the bar'] }, generation],
      }),
    )

    expect(res.status).toBe(200)
    expect(llm.gapsCalls).toHaveLength(2)
  })

  it('retries a generation whose blank count does not match its answers', async () => {
    const { res, llm } = await firstRound(
      new FakeLlmGateway({
        gapsGenerations: [{ story: 'He tried to ___ over coffee.', answers: ['break the ice', 'touch base'] }, generation],
      }),
    )

    expect(res.status).toBe(200)
    expect(llm.gapsCalls).toHaveLength(2)
  })

  it('stores no round when the generation stays unusable', async () => {
    const unusable = { story: STORY, answers: ['break the ice', 'break the ice'] }
    const { res, body, stored } = await firstRound(new FakeLlmGateway({ gapsGenerations: [unusable, { ...unusable }] }))

    expect(res.status).toBe(502)
    expect(apiErrorSchema.parse(body).error.code).toBe('LLM_UNAVAILABLE')
    expect((stored[0] as GapsTraining).rounds).toEqual([])
  })

  it('refuses a round on a session that is over', async () => {
    const session = await startGaps()
    await post(session, `/trainings/${session.training.id}/cancel`)

    const res = await post(session, `/trainings/${session.training.id}/rounds`)

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
  })

  it('answers 404 for a session that does not exist', async () => {
    const session = await startGaps()

    const res = await post(session, '/trainings/nope/rounds')

    expect(res.status).toBe(404)
  })

  it('refuses a round on a chat, which has no drill strategy', async () => {
    const h = await harness(new FakeLlmGateway({ firstMessages: ['Morning — how did yesterday go?'] }))
    const created = await post(h, '/trainings', {
      type: 'chat',
      context: 'a scrum standup',
      style: 'informal',
      expressionIds: ['e1'],
    })
    const { id } = await created.json()

    const res = await post(h, `/trainings/${id}/rounds`)

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_A_DRILL')
  })
})

const played = async (fills: string[], llm?: FakeLlmGateway) => {
  const session = await firstRound(llm)
  const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, { fills })

  return { ...session, answerRes: res, answer: await res.json() }
}

describe('POST /trainings/:id/rounds/:index/answer', () => {
  it('judges each blank against the phrase that belongs in it', async () => {
    const { answerRes, answer } = await played(['break the ice', 'ballpark figure'])

    expect(answerRes.status).toBe(200)
    expect(drillAnswerResponseSchema.parse(answer).verdict.perBlank).toEqual([
      { expected: 'break the ice', given: 'break the ice', correct: true },
      { expected: 'touch base', given: 'ballpark figure', correct: false },
    ])
  })

  it('ignores case and punctuation the user typed around a phrase', async () => {
    const { answer } = await played(['Break the ice!', '  touch base  '])

    expect(answer.verdict.perBlank.map(({ correct }: { correct: boolean }) => correct)).toEqual([true, true])
  })

  it('writes 8 for a blank the user got right and 2 for one they did not', async () => {
    const { answer, vocabulary } = await played(['break the ice', 'ballpark figure'])

    expect(drillAnswerResponseSchema.parse(answer).srsEffects).toEqual([
      expect.objectContaining({
        expressionId: 'e1',
        expression: 'break the ice',
        scoreWritten: 8,
        source: { kind: 'round', index: 0 },
        after: { score: 8, timesPracticed: 1, nextTrainingAt: daysAfter(1) },
      }),
      expect.objectContaining({
        expressionId: 'e2',
        expression: 'touch base',
        scoreWritten: 2,
        source: { kind: 'round', index: 0 },
        after: { score: 2, timesPracticed: 1, nextTrainingAt: NOW },
      }),
    ])
    expect(vocabulary.map(({ score, timesPracticed }) => [score, timesPracticed])).toEqual([
      [8, 1],
      [2, 1],
    ])
  })

  it('keeps the answer and verdict on the round it belongs to', async () => {
    const { stored } = await played(['break the ice', 'touch base'])

    expect((stored[0] as GapsTraining).rounds[0]).toMatchObject({
      answer: { fills: ['break the ice', 'touch base'] },
      answeredAt: NOW,
    })
  })

  it('reveals the answer key once the round is answered', async () => {
    const { answer } = await played(['break the ice', 'touch base'])

    expect(answer.round.material.answerKey).toEqual(['break the ice', 'touch base'])
  })

  it('refuses a second answer to the same round', async () => {
    const session = await played(['break the ice', 'touch base'])

    const again = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, {
      fills: ['touch base', 'break the ice'],
    })

    expect(again.status).toBe(409)
    expect(apiErrorSchema.parse(await again.json()).error.code).toBe('ROUND_ALREADY_ANSWERED')
    expect((session.stored[0] as GapsTraining).srsEffects).toHaveLength(2)
  })

  it('refuses an answer that does not fill every blank', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds/0/answer`, {
      fills: ['break the ice'],
    })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('answers 404 for a round that was never generated', async () => {
    const session = await firstRound()

    const res = await post(session, `/trainings/${session.training.id}/rounds/4/answer`, {
      fills: ['break the ice', 'touch base'],
    })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('ROUND_NOT_FOUND')
  })

  it('judges without calling the model at all', async () => {
    const { llm } = await played(['break the ice', 'touch base'])

    expect(llm.gapsCalls).toHaveLength(1)
  })
})

describe('POST /trainings/:id/complete for a drill', () => {
  it('counts the blanks that landed and the ones that did not, without asking the model', async () => {
    const session = await played(['break the ice', 'ballpark figure'])

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(res.status).toBe(200)
    const completed = gapsTrainingSchema.parse(await res.json())
    expect(completed.status).toBe('COMPLETED')
    expect(completed.completedAt).toEqual(NOW)
    expect(completed.aggregates).toEqual({ rounds: 1, correct: 1, wrong: 1 })
    expect(session.llm.narrativeCalls).toEqual([])
  })

  it('leaves a round nobody answered out of the counts', async () => {
    const session = await played(['break the ice', 'touch base'], new FakeLlmGateway({ gapsGenerations: [generation, { ...generation }] }))
    await post(session, `/trainings/${session.training.id}/rounds`)

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(gapsTrainingSchema.parse(await res.json()).aggregates).toEqual({ rounds: 1, correct: 2, wrong: 0 })
  })

  it('refuses to complete a session twice', async () => {
    const session = await played(['break the ice', 'touch base'])
    await post(session, `/trainings/${session.training.id}/complete`)

    const res = await post(session, `/trainings/${session.training.id}/complete`)

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
  })

  it('cancels a gaps session without any aggregates', async () => {
    const session = await played(['break the ice', 'touch base'])

    const res = await post(session, `/trainings/${session.training.id}/cancel`)

    expect(res.status).toBe(200)
    const canceled = gapsTrainingSchema.parse(await res.json())
    expect(canceled).toMatchObject({ status: 'CANCELED', canceledAt: NOW })
    expect(canceled.aggregates).toBeUndefined()
  })
})
