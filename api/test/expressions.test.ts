import { describe, expect, it } from 'vitest'
import { expressionListResponseSchema, type Expression } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { bearer, testDeps } from './deps'

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

const list = async (seed: Expression[], query = '') => {
  const app = createApp(testDeps({ expressions: new InMemoryExpressionRepository(seed) }))
  const res = await app.request(`/expressions${query}`, { headers: { Authorization: bearer() } })
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
    const app = createApp(
      testDeps({ expressions: new InMemoryExpressionRepository([expression({ id: 'fresh' })]) }),
    )

    const res = await app.request('/expressions', { headers: { Authorization: bearer() } })
    const body = (await res.json()) as { items: Record<string, unknown>[] }

    expect(body.items[0]).not.toHaveProperty('score')
  })
})
