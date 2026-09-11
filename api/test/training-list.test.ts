import { describe, expect, it } from 'vitest'
import { apiErrorSchema, trainingListResponseSchema, type ChatTraining, type Training } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, TEST_SECRET, testDeps } from './deps'

const day = (n: number) => new Date(Date.UTC(2026, 0, n))

const training = (id: string, overrides: Partial<ChatTraining> = {}): Training => ({
  id,
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: `context of ${id}`,
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: day(1) }],
  srsEffects: [],
  createdAt: day(1),
  ...overrides,
})

const SESSIONS = [
  training('t1', { createdAt: day(1), status: 'COMPLETED', completedAt: day(2) }),
  training('t2', { createdAt: day(3) }),
  training('t3', { createdAt: day(2), status: 'CANCELED', canceledAt: day(2) }),
  training('t4', { createdAt: day(4) }),
]

const list = (query = '', stored: Training[] = SESSIONS) => {
  const deps = testDeps({ trainings: new InMemoryTrainingRepository([...stored]) })

  return createApp(deps).request(`/trainings${query}`, { headers: { Authorization: bearer(TEST_SECRET, deps.clock) } })
}

const page = async (query = '', stored: Training[] = SESSIONS) => {
  const res = await list(query, stored)
  expect(res.status).toBe(200)

  return trainingListResponseSchema.parse(await res.json())
}

const ids = async (query = '', stored: Training[] = SESSIONS) => (await page(query, stored)).items.map(({ id }) => id)

describe('GET /trainings', () => {
  it('lists every training newest first', async () => {
    expect(await ids()).toEqual(['t4', 't2', 't3', 't1'])
  })

  it.each([
    ['ACTIVE', ['t4', 't2']],
    ['COMPLETED', ['t1']],
    ['CANCELED', ['t3']],
  ])('narrows to %s trainings', async (status, expected) => {
    expect(await ids(`?status=${status}`)).toEqual(expected)
  })

  it('narrows to one type', async () => {
    expect(await ids('?type=chat')).toEqual(['t4', 't2', 't3', 't1'])
    expect(await ids('?type=gaps')).toEqual([])
  })

  it('combines a type and a status', async () => {
    expect(await ids('?type=chat&status=COMPLETED')).toEqual(['t1'])
  })

  it('leaves the conversation and its srs effects out of each row', async () => {
    const res = await list()
    const [row] = (await res.json()).items

    expect(row).not.toHaveProperty('messages')
    expect(row).not.toHaveProperty('srsEffects')
    expect(row).toMatchObject({ id: 't4', type: 'chat', status: 'ACTIVE', context: 'context of t4', style: 'informal' })
  })

  it('pages backwards from a createdAt cursor', async () => {
    const first = await page('?limit=2')
    expect(first.items.map(({ id }) => id)).toEqual(['t4', 't2'])
    expect(first.nextBefore).toEqual(day(3))

    const second = await page(`?limit=2&before=${first.nextBefore?.toISOString()}`)
    expect(second.items.map(({ id }) => id)).toEqual(['t3', 't1'])
    expect(second.nextBefore).toBeUndefined()
  })

  it('keeps the filter while paging', async () => {
    const first = await page('?status=ACTIVE&limit=1')

    expect(await ids(`?status=ACTIVE&limit=1&before=${first.nextBefore?.toISOString()}`)).toEqual(['t2'])
  })

  it('caps a page at 50 trainings', async () => {
    const many = Array.from({ length: 51 }, (_, i) => training(`m${i}`, { createdAt: new Date(day(1).getTime() + i) }))

    const result = await page('', many)

    expect(result.items).toHaveLength(50)
    expect(result.nextBefore).toEqual(result.items.at(-1)?.createdAt)
  })

  it("shows only the caller's own trainings", async () => {
    expect(await ids('', [...SESSIONS, training('x1', { userId: 'someone else', createdAt: day(5) })])).toEqual([
      't4',
      't2',
      't3',
      't1',
    ])
  })

  it.each([
    ['an unknown status', '?status=DONE'],
    ['an unknown type', '?type=story'],
    ['a zero limit', '?limit=0'],
    ['a limit over 50', '?limit=51'],
    ['a cursor that is not a date', '?before=yesterday'],
  ])('refuses %s', async (_name, query) => {
    const res = await list(query)

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})
