import { describe, expect, it } from 'vitest'
import { apiErrorSchema, expressionPickResponseSchema, type Expression } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
})

const request = (seed: Expression[], query = '') => {
  const deps = testDeps({ expressions: new InMemoryExpressionRepository(seed) })
  return createApp(deps).request(`/expressions/pick${query}`, {
    headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
  })
}

const pick = async (seed: Expression[], query = '') => {
  const res = await request(seed, query)
  expect(res.status).toBe(200)
  return expressionPickResponseSchema.parse(await res.json()).items
}

const unpracticed = Array.from({ length: 7 }, (_, i) =>
  expression({ id: `new-${i}`, frequency: 'common', createdAt: new Date(`2025-01-0${i + 1}T00:00:00.000Z`) }),
)

describe('GET /expressions/pick', () => {
  it('returns the due expressions first, earliest due date leading', async () => {
    const items = await pick([
      expression({ id: 'new-common', frequency: 'common' }),
      expression({ id: 'due-later', score: 5, nextTrainingAt: new Date('2025-12-01T00:00:00.000Z') }),
      expression({ id: 'new-very-common', frequency: 'very_common' }),
      expression({ id: 'due-earlier', score: 3, nextTrainingAt: new Date('2025-11-01T00:00:00.000Z') }),
      expression({ id: 'new-moderate', frequency: 'moderate' }),
    ])

    expect(items.map((e) => e.id)).toEqual([
      'due-earlier',
      'due-later',
      'new-very-common',
      'new-common',
      'new-moderate',
    ])
  })

  it('walks the frequency tiers from very common down to formal/academic', async () => {
    const items = await pick([
      expression({ id: 'formal', frequency: 'formal/academic' }),
      expression({ id: 'uncommon', frequency: 'uncommon' }),
      expression({ id: 'moderate', frequency: 'moderate' }),
      expression({ id: 'common', frequency: 'common' }),
      expression({ id: 'very-common', frequency: 'very_common' }),
    ])

    expect(items.map((e) => e.id)).toEqual(['very-common', 'common', 'moderate', 'uncommon', 'formal'])
  })

  it('breaks a tier tie with the older expression', async () => {
    const items = await pick([
      expression({ id: 'newer', frequency: 'common', createdAt: new Date('2025-06-01T00:00:00.000Z') }),
      expression({ id: 'older', frequency: 'common', createdAt: new Date('2025-02-01T00:00:00.000Z') }),
    ])

    expect(items.map((e) => e.id)).toEqual(['older', 'newer'])
  })

  it('leaves out a practiced expression that is not due yet', async () => {
    const items = await pick([
      expression({ id: 'later', score: 9, nextTrainingAt: new Date('2026-06-01T00:00:00.000Z') }),
      expression({ id: 'new', frequency: 'common' }),
    ])

    expect(items.map((e) => e.id)).toEqual(['new'])
  })

  it('counts a zero score as practiced, so a due one leads the new expressions', async () => {
    const items = await pick([
      expression({ id: 'new-very-common', frequency: 'very_common' }),
      expression({
        id: 'zero-due',
        score: 0,
        frequency: 'uncommon',
        nextTrainingAt: new Date('2025-11-01T00:00:00.000Z'),
      }),
    ])

    expect(items.map((e) => e.id)).toEqual(['zero-due', 'new-very-common'])
  })

  it('picks five expressions when no limit is given', async () => {
    const items = await pick(unpracticed)

    expect(items.map((e) => e.id)).toEqual(['new-0', 'new-1', 'new-2', 'new-3', 'new-4'])
  })

  it('honours an explicit limit', async () => {
    expect(await pick(unpracticed, '?limit=2')).toHaveLength(2)
  })

  it('accepts the maximum limit of twenty', async () => {
    expect(await pick(unpracticed, '?limit=20')).toHaveLength(7)
  })

  it.each(['?limit=21', '?limit=0', '?limit=abc', '?limit=2.5'])('rejects %s', async (query) => {
    const res = await request(unpracticed, query)

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('never picks another user’s expressions', async () => {
    const items = await pick([
      expression({ id: 'mine', userId: 'me', frequency: 'common' }),
      expression({ id: 'theirs', userId: 'someone-else', frequency: 'very_common' }),
    ])

    expect(items.map((e) => e.id)).toEqual(['mine'])
  })

  it('rejects a request without a token', async () => {
    const deps = testDeps({ expressions: new InMemoryExpressionRepository([]) })
    const res = await createApp(deps).request('/expressions/pick')

    expect(res.status).toBe(401)
  })
})

describe('picker clock', () => {
  it('reads due-ness from the injected clock, not the wall clock', async () => {
    const seed = [expression({ id: 'due-soon', score: 4, nextTrainingAt: new Date('2026-01-02T00:00:00.000Z') })]
    const before = testDeps({ expressions: new InMemoryExpressionRepository(seed), clock: () => NOW })
    const after = testDeps({
      expressions: new InMemoryExpressionRepository(seed),
      clock: () => new Date('2026-01-03T00:00:00.000Z'),
    })

    const empty = await createApp(before).request('/expressions/pick', {
      headers: { Authorization: bearer(TEST_SECRET, before.clock) },
    })
    const filled = await createApp(after).request('/expressions/pick', {
      headers: { Authorization: bearer(TEST_SECRET, after.clock) },
    })

    expect(expressionPickResponseSchema.parse(await empty.json()).items).toEqual([])
    expect(expressionPickResponseSchema.parse(await filled.json()).items.map((e) => e.id)).toEqual(['due-soon'])
  })
})
