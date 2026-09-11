import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  trainingListResponseSchema,
  trainingSchema,
  type ChatTraining,
  type Expression,
  type SrsEffect,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const LATER = new Date('2026-01-01T00:30:00.000Z')

const EFFECT: SrsEffect = {
  expressionId: 'e1',
  expression: 'break the ice',
  scoreWritten: 9,
  source: { kind: 'message', index: 1 },
  before: { score: 6, timesPracticed: 1 },
  after: { score: 7.5, timesPracticed: 2, nextTrainingAt: new Date('2026-01-08T00:00:00.000Z') },
  at: NOW,
}

const training = (overrides: Partial<ChatTraining> = {}): ChatTraining => ({
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [
    { role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: NOW },
    { role: 'user', content: 'I broke the ice with the client.', createdAt: NOW },
    { role: 'assistant', content: 'Nice — how did they react?', createdAt: NOW },
  ],
  srsEffects: [EFFECT],
  createdAt: NOW,
  ...overrides,
})

const VOCABULARY: Expression[] = [
  {
    id: 'e1',
    userId: 'me',
    expression: 'break the ice',
    type: 'idiom',
    meaning: 'to get a conversation started',
    examples: [],
    tags: [],
    frequency: 'common',
    score: 7.5,
    timesPracticed: 2,
    nextTrainingAt: new Date('2026-01-08T00:00:00.000Z'),
    createdAt: NOW,
  },
]

const setup = (existing: Training = training()) => {
  const stored: Training[] = [existing]
  const vocabulary = VOCABULARY.map((expression) => ({ ...expression }))
  const llm = new FakeLlmGateway()
  const deps = testDeps({
    llm,
    clock: () => LATER,
    trainings: new InMemoryTrainingRepository(stored),
    expressions: new InMemoryExpressionRepository(vocabulary),
  })
  const app = createApp(deps)
  const auth = () => ({ Authorization: bearer(TEST_SECRET, deps.clock) })
  const cancel = (id = existing.id) => app.request(`/trainings/${id}/cancel`, { method: 'POST', headers: auth() })

  return { app, auth, llm, stored, vocabulary, cancel }
}

describe('POST /trainings/:id/cancel', () => {
  it('cancels an active session and stamps when', async () => {
    const { cancel, stored } = setup()

    const res = await cancel()

    expect(res.status).toBe(200)
    const canceled = trainingSchema.parse(await res.json())
    expect(canceled).toMatchObject({ status: 'CANCELED', canceledAt: LATER })
    expect(canceled).not.toHaveProperty('finalAssessment')
    expect(canceled).not.toHaveProperty('completedAt')
    expect(stored[0]).toMatchObject({ status: 'CANCELED', canceledAt: LATER })
  })

  it('asks the tutor for nothing', async () => {
    const { cancel, llm } = setup()

    await cancel()

    expect(llm.replyCalls).toEqual([])
    expect(llm.assessmentCalls).toEqual([])
    expect(llm.narrativeCalls).toEqual([])
  })

  it('keeps the messages and the schedule changes the turns already made', async () => {
    const { cancel, stored, vocabulary } = setup()

    const res = await cancel()

    const canceled = trainingSchema.parse(await res.json())
    expect(canceled.messages).toHaveLength(3)
    expect(canceled.srsEffects).toEqual([EFFECT])
    expect(stored[0]?.srsEffects).toEqual([EFFECT])
    expect(vocabulary).toEqual(VOCABULARY)
  })

  it('files the session under Canceled', async () => {
    const { app, auth, cancel } = setup()

    await cancel()
    const res = await app.request('/trainings?status=CANCELED', { headers: auth() })

    expect(trainingListResponseSchema.parse(await res.json()).items.map(({ id }) => id)).toEqual(['t1'])
  })

  it('refuses another turn once canceled', async () => {
    const { app, auth, cancel } = setup()

    await cancel()
    const res = await app.request('/trainings/t1/messages', {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Anyway, where were we?', turnId: 'turn-2' }),
    })

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
  })

  it('refuses to cancel a completed session', async () => {
    const { cancel, stored } = setup(training({ status: 'COMPLETED', completedAt: NOW }))

    const res = await cancel()

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
    expect(stored[0]).toMatchObject({ status: 'COMPLETED' })
    expect(stored[0]).not.toHaveProperty('canceledAt')
  })

  it('refuses to cancel a session a second time', async () => {
    const { cancel } = setup()

    await cancel()
    const second = await cancel()

    expect(second.status).toBe(409)
    expect(apiErrorSchema.parse(await second.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
  })

  it('answers 404 for a training that does not exist', async () => {
    const { cancel } = setup()

    const res = await cancel('nope')

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('rejects a caller without a token', async () => {
    const { app } = setup()

    const res = await app.request('/trainings/t1/cancel', { method: 'POST' })

    expect(res.status).toBe(401)
  })
})
