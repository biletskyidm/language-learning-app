import { describe, expect, it } from 'vitest'
import {
  expressionHistoryResponseSchema,
  gapsTrainingSchema,
  type ChatTraining,
  type GapsTraining,
  type SrsEffect,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'

const DAY_MS = 86_400_000
const daysAfter = (days: number) => new Date(NOW.getTime() + days * DAY_MS)

const TARGETS = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
  { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
]

const effect = (expressionId: string, scoreWritten: number, at: Date): SrsEffect => ({
  expressionId,
  expression: TARGETS.find((target) => target.expressionId === expressionId)?.expression ?? '',
  scoreWritten,
  source: { kind: 'message', index: 0 },
  before: { score: 6, timesPracticed: 2, nextTrainingAt: NOW },
  after: { score: 7, timesPracticed: 3, nextTrainingAt: daysAfter(7) },
  at,
})

const CHAT: ChatTraining = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'COMPLETED',
  context: 'a scrum standup',
  style: 'informal',
  targets: TARGETS,
  messages: [],
  srsEffects: [effect('e1', 9, daysAfter(1)), effect('e2', 4, daysAfter(1))],
  createdAt: NOW,
  completedAt: daysAfter(1),
}

const GAPS: GapsTraining = {
  id: 't2',
  userId: 'me',
  type: 'gaps',
  status: 'ACTIVE',
  targets: TARGETS,
  rounds: [
    {
      index: 0,
      targets: TARGETS,
      material: {
        parts: ['He tried to ', ' before he went to ', ' with his manager.'],
        bank: ['touch base', 'break the ice'],
        answerKey: ['break the ice', 'touch base'],
      },
      answer: { fills: ['break the ice', 'touch base'] },
      verdict: {
        perBlank: [
          { expected: 'break the ice', given: 'break the ice', correct: true },
          { expected: 'touch base', given: 'touch base', correct: true },
        ],
      },
      answeredAt: daysAfter(2),
    },
    {
      index: 1,
      targets: TARGETS,
      material: {
        parts: ['She likes to ', ' first, then ', ' by email.'],
        bank: ['break the ice', 'touch base'],
        answerKey: ['break the ice', 'touch base'],
      },
    },
  ],
  srsEffects: [effect('e1', 8, daysAfter(2))],
  createdAt: daysAfter(2),
}

const OTHERS: ChatTraining = { ...CHAT, id: 't3', userId: 'someone-else', srsEffects: [effect('e1', 2, daysAfter(3))] }

const app = (trainings: Training[] = [CHAT, GAPS, OTHERS]) => {
  const deps = testDeps({ trainings: new InMemoryTrainingRepository(trainings.map((one) => ({ ...one }))) })

  return { request: createApp(deps).request, auth: { Authorization: bearer(TEST_SECRET, deps.clock) } }
}

describe('GET /expressions/:id/history', () => {
  it('lists every SRS write for that expression across chats and drills, newest first', async () => {
    const { request, auth } = app()

    const res = await request('/expressions/e1/history', { headers: auth })
    const body = expressionHistoryResponseSchema.parse(await res.json())

    expect(res.status).toBe(200)
    expect(body.items).toEqual([
      {
        trainingId: 't2',
        type: 'gaps',
        at: daysAfter(2),
        scoreWritten: 8,
        before: { score: 6, timesPracticed: 2, nextTrainingAt: NOW },
        after: { score: 7, timesPracticed: 3, nextTrainingAt: daysAfter(7) },
      },
      {
        trainingId: 't1',
        type: 'chat',
        at: daysAfter(1),
        scoreWritten: 9,
        before: { score: 6, timesPracticed: 2, nextTrainingAt: NOW },
        after: { score: 7, timesPracticed: 3, nextTrainingAt: daysAfter(7) },
      },
    ])
  })

  it('leaves out the writes another user made', async () => {
    const { request, auth } = app([OTHERS])

    const body = expressionHistoryResponseSchema.parse(await (await request('/expressions/e1/history', { headers: auth })).json())

    expect(body.items).toEqual([])
  })

  it('answers with an empty list for an expression nothing has scored', async () => {
    const { request, auth } = app()

    const body = expressionHistoryResponseSchema.parse(await (await request('/expressions/e9/history', { headers: auth })).json())

    expect(body.items).toEqual([])
  })

  it('rejects a caller without a token', async () => {
    const { request } = app()

    expect((await request('/expressions/e1/history')).status).toBe(401)
  })
})

describe('GET /trainings/:id for a past drill', () => {
  it('keeps the answer key of an answered round and hides it on one still open', async () => {
    const { request, auth } = app()

    const res = await request('/trainings/t2', { headers: auth })
    const training = gapsTrainingSchema.parse(await res.json())

    expect(res.status).toBe(200)
    expect(training.rounds[0]?.material.answerKey).toEqual(['break the ice', 'touch base'])
    expect(training.rounds[1]?.material.answerKey).toBeUndefined()
  })
})
