import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  expressionListResponseSchema,
  expressionSchema,
  expressionTagsResponseSchema,
  type Expression,
} from '@contracts'
import { createApp } from '../src/app'
import type { Deps } from '../src/deps'
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

describe('GET /expressions/:id', () => {
  it('returns the expression with every stored field', async () => {
    const res = await request(
      [
        expression({
          id: '65a1b2c3d4e5f60718293a4b',
          partOfSpeech: 'verb',
          examples: ['Someone had to break the ice.'],
          tags: ['work'],
          score: 7.5,
          timesPracticed: 3,
          lastTimePracticedAt: new Date('2026-01-05T00:00:00.000Z'),
          nextTrainingAt: new Date('2026-01-12T00:00:00.000Z'),
        }),
      ],
      '/expressions/65a1b2c3d4e5f60718293a4b',
    )

    expect(res.status).toBe(200)
    expect(expressionSchema.parse(await res.json())).toMatchObject({
      id: '65a1b2c3d4e5f60718293a4b',
      expression: 'break the ice',
      partOfSpeech: 'verb',
      examples: ['Someone had to break the ice.'],
      tags: ['work'],
      score: 7.5,
      timesPracticed: 3,
    })
  })

  it('hides an expression owned by someone else', async () => {
    const res = await request([expression({ id: 'theirs', userId: 'someone-else' })], '/expressions/theirs')

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('answers a malformed id with a not found instead of an error', async () => {
    const res = await request([expression({ id: 'e1' })], '/expressions/not-an-object-id')

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })
})

describe('POST /expressions', () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    expression: 'hit the nail on the head',
    type: 'idiom',
    meaning: 'to describe exactly what is causing a problem',
    frequency: 'common',
    ...overrides,
  })

  const post = async (payload: unknown, seed: Expression[] = [], overrides: Partial<Deps> = {}) => {
    const deps = testDeps({ expressions: new InMemoryExpressionRepository(seed), ...overrides })
    return createApp(deps).request('/expressions', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  it('stores the expression and answers with the created document', async () => {
    const res = await post(body({ partOfSpeech: 'verb', examples: ['You hit the nail on the head.'], tags: ['work'] }))

    expect(res.status).toBe(201)
    const created = expressionSchema.parse(await res.json())
    expect(created).toMatchObject({
      userId: 'me',
      expression: 'hit the nail on the head',
      type: 'idiom',
      partOfSpeech: 'verb',
      meaning: 'to describe exactly what is causing a problem',
      examples: ['You hit the nail on the head.'],
      tags: ['work'],
      frequency: 'common',
      createdAt: NOW,
    })
    expect(created.id).toBeTruthy()
  })

  it('makes the new expression readable through the list', async () => {
    const deps = testDeps()
    const app = createApp(deps)
    const headers = { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' }
    await app.request('/expressions', { method: 'POST', headers, body: JSON.stringify(body()) })

    const res = await app.request('/expressions', {
      headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
    })

    const items = expressionListResponseSchema.parse(await res.json()).items
    expect(items.map((e) => e.expression)).toEqual(['hit the nail on the head'])
  })

  it('leaves every SRS field absent on the created expression', async () => {
    const res = await post(body())
    const created = (await res.json()) as Record<string, unknown>

    expect(created).not.toHaveProperty('score')
    expect(created).not.toHaveProperty('timesPracticed')
    expect(created).not.toHaveProperty('lastTimePracticedAt')
    expect(created).not.toHaveProperty('nextTrainingAt')
  })

  it('defaults examples and tags to empty lists', async () => {
    const res = await post(body())

    expect(expressionSchema.parse(await res.json())).toMatchObject({ examples: [], tags: [] })
  })

  it('trims the text fields', async () => {
    const res = await post(
      body({ expression: '  hit the nail on the head  ', meaning: ' spot on  ', tags: [' work '] }),
    )

    expect(expressionSchema.parse(await res.json())).toMatchObject({
      expression: 'hit the nail on the head',
      meaning: 'spot on',
      tags: ['work'],
    })
  })

  it('names the offending field when a required one is missing', async () => {
    const res = await post({ ...body(), meaning: undefined })

    expect(res.status).toBe(400)
    const { error } = apiErrorSchema.parse(await res.json())
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toContain('meaning')
  })

  it('rejects a blank expression', async () => {
    const res = await post(body({ expression: '   ' }))

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('expression')
  })

  it('rejects an unknown frequency', async () => {
    const res = await post(body({ frequency: 'sometimes' }))

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('frequency')
  })

  it('rejects an unknown type', async () => {
    const res = await post(body({ type: 'proverb' }))

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('type')
  })

  it('rejects a body that is not JSON', async () => {
    const deps = testDeps()
    const res = await createApp(deps).request('/expressions', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: 'not json',
    })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('refuses an expression the caller already has', async () => {
    const res = await post(body(), [expression({ id: 'existing', expression: 'hit the nail on the head' })])

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('DUPLICATE')
  })

  it('allows an expression another user already has', async () => {
    const res = await post(body(), [
      expression({ id: 'theirs', userId: 'someone-else', expression: 'hit the nail on the head' }),
    ])

    expect(res.status).toBe(201)
  })
})

describe('PATCH /expressions/:id', () => {
  const stored = expression({
    id: 'e1',
    partOfSpeech: 'verb',
    examples: ['Someone had to break the ice.'],
    tags: ['work'],
    score: 7.5,
    timesPracticed: 3,
  })

  const patch = async (id: string, payload: unknown, seed: Expression[] = [stored]) => {
    const deps = testDeps({ expressions: new InMemoryExpressionRepository(seed) })
    return createApp(deps).request(`/expressions/${id}`, {
      method: 'PATCH',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  it('changes the named field and leaves every other one alone', async () => {
    const res = await patch('e1', { meaning: 'to make people feel at ease' })

    expect(res.status).toBe(200)
    expect(expressionSchema.parse(await res.json())).toMatchObject({
      id: 'e1',
      expression: 'break the ice',
      type: 'idiom',
      partOfSpeech: 'verb',
      meaning: 'to make people feel at ease',
      examples: ['Someone had to break the ice.'],
      tags: ['work'],
      frequency: 'common',
    })
  })

  it('leaves the SRS fields untouched', async () => {
    const res = await patch('e1', { expression: 'break the ice with someone' })

    expect(expressionSchema.parse(await res.json())).toMatchObject({ score: 7.5, timesPracticed: 3 })
  })

  it('makes the change readable through the detail endpoint', async () => {
    const deps = testDeps({ expressions: new InMemoryExpressionRepository([stored]) })
    const app = createApp(deps)
    await app.request('/expressions/e1', {
      method: 'PATCH',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['work', 'small-talk'] }),
    })

    const res = await app.request('/expressions/e1', { headers: { Authorization: bearer(TEST_SECRET, deps.clock) } })

    expect(expressionSchema.parse(await res.json()).tags).toEqual(['work', 'small-talk'])
  })

  it('replaces a list field wholesale', async () => {
    const res = await patch('e1', { examples: [] })

    expect(expressionSchema.parse(await res.json()).examples).toEqual([])
  })

  it('clears the part of speech when it is sent as null', async () => {
    const res = await patch('e1', { partOfSpeech: null })

    expect((await res.json()) as Record<string, unknown>).not.toHaveProperty('partOfSpeech')
  })

  it('trims the text fields', async () => {
    const res = await patch('e1', { expression: '  break the ice  ', tags: [' work '] })

    expect(expressionSchema.parse(await res.json())).toMatchObject({ expression: 'break the ice', tags: ['work'] })
  })

  it('refuses to write an SRS field', async () => {
    const res = await patch('e1', { score: 10 })

    expect(res.status).toBe(400)
    const { error } = apiErrorSchema.parse(await res.json())
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toContain('score')
  })

  it('refuses to reassign the owner', async () => {
    const res = await patch('e1', { userId: 'someone-else' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a blank expression', async () => {
    const res = await patch('e1', { expression: '   ' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('expression')
  })

  it('rejects an unknown frequency', async () => {
    const res = await patch('e1', { frequency: 'sometimes' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('frequency')
  })

  it('rejects a body that is not JSON', async () => {
    const deps = testDeps({ expressions: new InMemoryExpressionRepository([stored]) })
    const res = await createApp(deps).request('/expressions/e1', {
      method: 'PATCH',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: 'not json',
    })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('hides an expression owned by someone else', async () => {
    const res = await patch('theirs', { meaning: 'mine now' }, [expression({ id: 'theirs', userId: 'someone-else' })])

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('answers an unknown id with a not found', async () => {
    const res = await patch('missing', { meaning: 'nothing to patch' })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })
})
