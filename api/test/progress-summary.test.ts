import { describe, expect, it } from 'vitest'
import { progressSummarySchema, type ChatTraining, type Expression, type Training } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'

const day = (n: number) => new Date(Date.UTC(2026, 0, n))

const expression = (id: string, overrides: Partial<Expression> = {}): Expression => ({
  id,
  userId: 'me',
  expression: `phrase ${id}`,
  type: 'idiom',
  meaning: 'a meaning',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: day(1),
  ...overrides,
})

const practiced = (id: string, nextTrainingAt: Date, overrides: Partial<Expression> = {}) =>
  expression(id, { score: 5, timesPracticed: 1, lastTimePracticedAt: day(1), nextTrainingAt, ...overrides })

const training = (id: string, overrides: Partial<ChatTraining> = {}): Training => ({
  id,
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: `context of ${id}`,
  style: 'informal',
  targets: [],
  messages: [],
  srsEffects: [],
  createdAt: day(1),
  ...overrides,
})

const summary = async ({
  expressions = [] as Expression[],
  trainings = [] as Training[],
  now = NOW,
} = {}) => {
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository(expressions),
    trainings: new InMemoryTrainingRepository(trainings),
    clock: () => now,
  })
  const res = await createApp(deps).request('/progress/summary', {
    headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
  })
  expect(res.status).toBe(200)

  return progressSummarySchema.parse(await res.json())
}

describe('GET /progress/summary', () => {
  const now = new Date('2026-03-10T12:00:00.000Z')

  it('counts practiced phrases due by the clock and phrases never practiced', async () => {
    const result = await summary({
      now,
      expressions: [
        practiced('overdue', new Date('2026-03-01T00:00:00.000Z')),
        practiced('due-this-instant', now),
        practiced('later', new Date('2026-03-10T12:00:00.001Z')),
        expression('fresh-1'),
        expression('fresh-2'),
        expression('fresh-3'),
      ],
    })

    expect(result).toMatchObject({ dueNow: 2, unpracticed: 3 })
  })

  it('moves a phrase into due when the clock passes its next training date', async () => {
    const expressions = [practiced('e1', new Date('2026-03-11T00:00:00.000Z'))]

    expect((await summary({ now, expressions })).dueNow).toBe(0)
    expect((await summary({ now: new Date('2026-03-11T00:00:00.000Z'), expressions })).dueNow).toBe(1)
  })

  it('does not count a scheduled phrase with no score as due', async () => {
    const result = await summary({ now, expressions: [expression('e1', { nextTrainingAt: day(1) })] })

    expect(result).toMatchObject({ dueNow: 0, unpracticed: 1 })
  })

  it('lists only active trainings, newest first', async () => {
    const result = await summary({
      trainings: [
        training('t1', { createdAt: day(1) }),
        training('t2', { createdAt: day(3), status: 'COMPLETED', completedAt: day(4) }),
        training('t3', { createdAt: day(4) }),
        training('t4', { createdAt: day(2), status: 'CANCELED', canceledAt: day(2) }),
        training('t5', { createdAt: day(2) }),
      ],
    })

    expect(result.active.map(({ id }) => id)).toEqual(['t3', 't5', 't1'])
    expect(result.active[0]).not.toHaveProperty('messages')
  })

  it("counts and lists only the caller's own data", async () => {
    const result = await summary({
      now,
      expressions: [
        practiced('mine', day(1)),
        practiced('theirs', day(1), { userId: 'someone else' }),
        expression('their-fresh', { userId: 'someone else' }),
      ],
      trainings: [training('t1'), training('x1', { userId: 'someone else' })],
    })

    expect(result).toMatchObject({ dueNow: 1, unpracticed: 0 })
    expect(result.active.map(({ id }) => id)).toEqual(['t1'])
  })

  it('refuses a request without a token', async () => {
    const res = await createApp(testDeps()).request('/progress/summary')

    expect(res.status).toBe(401)
  })
})
