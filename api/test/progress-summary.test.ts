import { describe, expect, it } from 'vitest'
import { progressSummarySchema, type ChatTraining, type Expression, type SrsEffect, type Training } from '@contracts'
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

const effect = (expressionId: string, at: string): SrsEffect => ({
  expressionId,
  expression: `phrase ${expressionId}`,
  scoreWritten: 7,
  source: { kind: 'message', index: 0 },
  before: {},
  after: { score: 7, timesPracticed: 1, nextTrainingAt: new Date(at) },
  at: new Date(at),
})

const request = ({
  expressions = [] as Expression[],
  trainings = [] as Training[],
  now = NOW,
  query = '',
} = {}) => {
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository(expressions),
    trainings: new InMemoryTrainingRepository(trainings),
    clock: () => now,
  })

  return createApp(deps).request(`/progress/summary${query}`, {
    headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
  })
}

const summary = async (options: Parameters<typeof request>[0] = {}) => {
  const res = await request(options)
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

  describe('weakest', () => {
    it('returns the five lowest-scoring practiced phrases, weakest first', async () => {
      const result = await summary({
        now,
        expressions: [
          practiced('s9', day(20), { score: 9 }),
          practiced('s1', day(20), { score: 1 }),
          practiced('s7', day(20), { score: 7 }),
          practiced('s3', day(20), { score: 3 }),
          practiced('s5', day(20), { score: 5 }),
          practiced('s8', day(20), { score: 8 }),
        ],
      })

      expect(result.weakest.map((e) => e.id)).toEqual(['s1', 's3', 's5', 's7', 's8'])
    })

    it('leaves out phrases that were never practiced', async () => {
      const result = await summary({ now, expressions: [expression('fresh'), practiced('scored', day(20), { score: 6 })] })

      expect(result.weakest.map((e) => e.id)).toEqual(['scored'])
    })
  })

  describe('week', () => {
    const wednesday = new Date('2026-03-11T12:00:00.000Z')

    it('counts distinct phrases practiced each day from Monday to Sunday', async () => {
      const result = await summary({
        now: wednesday,
        trainings: [
          training('t1', {
            srsEffects: [
              effect('e1', '2026-03-09T08:00:00.000Z'),
              effect('e1', '2026-03-09T09:00:00.000Z'),
              effect('e2', '2026-03-09T23:59:59.999Z'),
              effect('e1', '2026-03-11T10:00:00.000Z'),
            ],
          }),
          training('t2', {
            status: 'COMPLETED',
            srsEffects: [effect('e1', '2026-03-09T20:00:00.000Z'), effect('e3', '2026-03-11T11:00:00.000Z')],
          }),
        ],
      })

      expect(result.week).toEqual([2, 0, 2, 0, 0, 0, 0])
    })

    it('leaves out practice from before this Monday', async () => {
      const result = await summary({
        now: wednesday,
        trainings: [training('t1', { srsEffects: [effect('e1', '2026-03-08T23:59:59.999Z')] })],
      })

      expect(result.week).toEqual([0, 0, 0, 0, 0, 0, 0])
    })

    it('splits days at local midnight of the given timezone offset', async () => {
      const trainings = [training('t1', { srsEffects: [effect('e1', '2026-03-08T22:30:00.000Z')] })]

      expect((await summary({ now: wednesday, trainings })).week).toEqual([0, 0, 0, 0, 0, 0, 0])
      expect((await summary({ now: wednesday, trainings, query: '?tzOffset=-180' })).week).toEqual([
        1, 0, 0, 0, 0, 0, 0,
      ])
    })

    it('starts a new week once local time passes Sunday midnight', async () => {
      const result = await summary({
        now: new Date('2026-03-15T21:30:00.000Z'),
        query: '?tzOffset=-180',
        trainings: [training('t1', { srsEffects: [effect('e1', '2026-03-15T21:10:00.000Z')] })],
      })

      expect(result.week).toEqual([1, 0, 0, 0, 0, 0, 0])
    })

    it('rejects an offset outside the range of real timezones', async () => {
      const res = await request({ query: '?tzOffset=900' })

      expect(res.status).toBe(400)
    })
  })

  it('counts every phrase of the caller as the total', async () => {
    const result = await summary({
      now,
      expressions: [practiced('p1', day(20)), expression('f1'), expression('x1', { userId: 'someone else' })],
    })

    expect(result.total).toBe(2)
  })

  describe('active', () => {
    it('counts every active training and lists the two newest first', async () => {
      const result = await summary({
        now,
        trainings: [
          training('old', { createdAt: day(2) }),
          training('newest', { createdAt: day(5) }),
          training('done', { status: 'COMPLETED', createdAt: day(6) }),
          training('middle', { createdAt: day(4) }),
          training('theirs', { userId: 'someone else', createdAt: day(7) }),
        ],
      })

      expect(result.active.count).toBe(3)
      expect(result.active.latest.map((t) => t.id)).toEqual(['newest', 'middle'])
    })
  })

  describe('chatSkills', () => {
    const averages = (score: number) => ({
      contextCorrectness: score,
      grammarAndSyntax: score + 1,
      vocabularyDiversity: score,
      sentenceComplexity: score,
      sentenceNaturalness: score,
    })
    const completed = (id: string, score: number, overrides: Partial<ChatTraining> = {}) =>
      training(id, {
        status: 'COMPLETED',
        finalAssessment: {
          averages: averages(score),
          targets: {},
          narrative: { strengths: '', areasForImprovement: '', suggestedFocus: '' },
          computedAt: day(3),
        },
        ...overrides,
      })

    it('averages completed chats with each session weighted equally', async () => {
      const result = await summary({
        now,
        trainings: [
          completed('c1', 4, { messages: Array(20).fill({ role: 'user', content: 'hi', at: day(2) }) }),
          completed('c2', 8),
          completed('active', 1, { status: 'ACTIVE' }),
          completed('theirs', 1, { userId: 'someone else' }),
          training('no-assessment', { status: 'COMPLETED' }),
        ],
      })

      expect(result.chatSkills).toEqual({ sessions: 2, averages: averages(6) })
    })

    it('has no averages before any chat is completed', async () => {
      const result = await summary({ now, trainings: [training('active')] })

      expect(result.chatSkills).toEqual({ sessions: 0 })
    })
  })

  describe('scoreTrend', () => {
    it('covers 30 days and stays empty before the first scored day', async () => {
      const result = await summary({
        now,
        expressions: [practiced('e1', day(20), { score: 7, createdAt: new Date('2026-03-01T00:00:00.000Z') })],
        trainings: [training('t1', { srsEffects: [effect('e1', '2026-03-08T08:00:00.000Z')] })],
      })

      expect(result.scoreTrend).toEqual([...Array(27).fill(null), 7, 7, 7])
    })

    it('ends each day at local midnight of the given timezone offset', async () => {
      const options = {
        now,
        expressions: [practiced('e1', day(20), { score: 7, createdAt: new Date('2026-03-01T00:00:00.000Z') })],
        trainings: [training('t1', { srsEffects: [effect('e1', '2026-03-08T22:30:00.000Z')] })],
      }

      expect((await summary(options)).scoreTrend.slice(-3)).toEqual([7, 7, 7])
      expect((await summary({ ...options, query: '?tzOffset=-180' })).scoreTrend.slice(-3)).toEqual([null, 7, 7])
    })
  })

  it("counts only the caller's own data", async () => {
    const result = await summary({
      now,
      expressions: [
        practiced('mine', day(1)),
        practiced('theirs', day(1), { userId: 'someone else' }),
        expression('their-fresh', { userId: 'someone else' }),
      ],
      trainings: [
        training('t1', { srsEffects: [effect('mine', '2026-03-10T08:00:00.000Z')] }),
        training('x1', { userId: 'someone else', srsEffects: [effect('theirs', '2026-03-10T08:00:00.000Z')] }),
      ],
    })

    expect(result).toMatchObject({ dueNow: 1, unpracticed: 0, week: [0, 1, 0, 0, 0, 0, 0] })
  })

  it('refuses a request without a token', async () => {
    const res = await createApp(testDeps()).request('/progress/summary')

    expect(res.status).toBe(401)
  })
})
