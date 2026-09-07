import { describe, expect, it } from 'vitest'
import { apiErrorSchema, expressionListResponseSchema, expressionTagsResponseSchema, type Expression } from '@contracts'
import { createApp } from '../src/app'
import type { Deps } from '../src/deps'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { bearer, TEST_SECRET, testDeps } from './deps'

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

const request = (seed: Expression[], path: string, overrides: Partial<Deps> = {}) => {
  const deps = testDeps({ expressions: new InMemoryExpressionRepository(seed), ...overrides })
  return createApp(deps).request(path, { headers: { Authorization: bearer(TEST_SECRET, deps.clock) } })
}

const list = async (seed: Expression[], query = '', overrides: Partial<Deps> = {}) => {
  const res = await request(seed, `/expressions${query}`, overrides)
  expect(res.status).toBe(200)
  return expressionListResponseSchema.parse(await res.json()).items
}

describe('GET /expressions', () => {
  it('returns only the expressions owned by the caller', async () => {
    const items = await list([
      expression({ id: 'mine', userId: 'me' }),
      expression({ id: 'theirs', userId: 'someone-else' }),
    ])

    expect(items.map((e) => e.id)).toEqual(['mine'])
  })

  it('returns newest first', async () => {
    const items = await list([
      expression({ id: 'older', createdAt: new Date('2025-06-01T00:00:00.000Z') }),
      expression({ id: 'newer', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
    ])

    expect(items.map((e) => e.id)).toEqual(['newer', 'older'])
  })

  it('matches the expression text case-insensitively', async () => {
    const items = await list(
      [expression({ id: 'ice', expression: 'Break The Ice' }), expression({ id: 'other', expression: 'hit the sack' })],
      '?search=BREAK',
    )

    expect(items.map((e) => e.id)).toEqual(['ice'])
  })

  it('matches the meaning case-insensitively', async () => {
    const items = await list(
      [
        expression({ id: 'ice', meaning: 'to get a Conversation started' }),
        expression({ id: 'other', meaning: 'to go to bed' }),
      ],
      '?search=conversation',
    )

    expect(items.map((e) => e.id)).toEqual(['ice'])
  })

  it('treats regex metacharacters in the search as literal text', async () => {
    const items = await list(
      [expression({ id: 'literal', expression: 'a.b*c' }), expression({ id: 'other', expression: 'axbxc' })],
      '?search=a.b*',
    )

    expect(items.map((e) => e.id)).toEqual(['literal'])
  })

  it('leaves the score field absent for a never-practiced expression', async () => {
    const res = await request([expression({ id: 'fresh' })], '/expressions')
    const body = (await res.json()) as { items: Record<string, unknown>[] }

    expect(body.items[0]).not.toHaveProperty('score')
  })
})

describe('GET /expressions filters', () => {
  const seed = [
    expression({ id: 'work-common', tags: ['work', 'meetings'], frequency: 'common' }),
    expression({ id: 'work-rare', tags: ['work'], frequency: 'uncommon' }),
    expression({ id: 'travel-common', tags: ['travel'], frequency: 'common' }),
    expression({ id: 'untagged', tags: [] }),
  ]

  it('keeps only the expressions carrying the tag', async () => {
    const items = await list(seed, '?tag=work')

    expect(items.map((e) => e.id).sort()).toEqual(['work-common', 'work-rare'])
  })

  it('keeps only the expressions of the frequency', async () => {
    const items = await list(seed, '?frequency=uncommon')

    expect(items.map((e) => e.id)).toEqual(['work-rare'])
  })

  it('combines tag, frequency and search', async () => {
    const items = await list(
      [
        expression({ id: 'match', expression: 'run late', tags: ['work'], frequency: 'common' }),
        expression({ id: 'wrong-tag', expression: 'run late', tags: ['travel'], frequency: 'common' }),
        expression({ id: 'wrong-frequency', expression: 'run late', tags: ['work'], frequency: 'uncommon' }),
        expression({ id: 'wrong-text', expression: 'hit the sack', tags: ['work'], frequency: 'common' }),
      ],
      '?tag=work&frequency=common&search=run',
    )

    expect(items.map((e) => e.id)).toEqual(['match'])
  })

  it('keeps only expressions due against the injected clock', async () => {
    const clock = () => new Date('2026-03-01T00:00:00.000Z')
    const items = await list(
      [
        expression({ id: 'overdue', score: 5, nextTrainingAt: new Date('2026-02-01T00:00:00.000Z') }),
        expression({ id: 'later', score: 5, nextTrainingAt: new Date('2026-04-01T00:00:00.000Z') }),
        expression({ id: 'never-practiced' }),
      ],
      '?due=true',
      { clock },
    )

    expect(items.map((e) => e.id)).toEqual(['overdue'])
  })

  it('ignores the due filter when it is false', async () => {
    const items = await list([expression({ id: 'never-practiced' })], '?due=false')

    expect(items.map((e) => e.id)).toEqual(['never-practiced'])
  })

  it('rejects an unknown frequency', async () => {
    const res = await request(seed, '/expressions?frequency=sometimes')

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an unknown sort field', async () => {
    const res = await request(seed, '/expressions?sort=vibes')

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an unknown direction', async () => {
    const res = await request(seed, '/expressions?dir=sideways')

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /expressions sorting', () => {
  const scored = [
    expression({ id: 'low', score: 3, timesPracticed: 9, nextTrainingAt: new Date('2026-05-01T00:00:00.000Z') }),
    expression({ id: 'high', score: 8, timesPracticed: 1, nextTrainingAt: new Date('2026-02-01T00:00:00.000Z') }),
    expression({ id: 'fresh' }),
  ]

  it('sorts by creation date ascending on request', async () => {
    const items = await list(
      [
        expression({ id: 'older', createdAt: new Date('2025-06-01T00:00:00.000Z') }),
        expression({ id: 'newer', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
      ],
      '?sort=createdAt&dir=asc',
    )

    expect(items.map((e) => e.id)).toEqual(['older', 'newer'])
  })

  it('sorts by score descending and leaves the unscored last', async () => {
    const items = await list(scored, '?sort=score&dir=desc')

    expect(items.map((e) => e.id)).toEqual(['high', 'low', 'fresh'])
  })

  it('keeps the unscored last when the score sort is ascending', async () => {
    const items = await list(scored, '?sort=score&dir=asc')

    expect(items.map((e) => e.id)).toEqual(['low', 'high', 'fresh'])
  })

  it('keeps the unscheduled last when sorting by next due date', async () => {
    const items = await list(scored, '?sort=nextTrainingAt&dir=asc')

    expect(items.map((e) => e.id)).toEqual(['high', 'low', 'fresh'])
  })

  it('sorts by times practiced counting a never-practiced expression as zero', async () => {
    const items = await list(scored, '?sort=timesPracticed&dir=desc')

    expect(items.map((e) => e.id)).toEqual(['low', 'high', 'fresh'])
  })
})

describe('GET /expressions/tags', () => {
  it('returns the caller’s distinct tags in alphabetical order', async () => {
    const res = await request(
      [
        expression({ id: 'a', tags: ['work', 'meetings'] }),
        expression({ id: 'b', tags: ['work'] }),
        expression({ id: 'c', tags: ['travel'], userId: 'someone-else' }),
        expression({ id: 'd', tags: [] }),
      ],
      '/expressions/tags',
    )

    expect(res.status).toBe(200)
    expect(expressionTagsResponseSchema.parse(await res.json()).items).toEqual(['meetings', 'work'])
  })
})
