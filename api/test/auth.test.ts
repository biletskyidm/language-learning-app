import { describe, expect, it } from 'vitest'
import { apiErrorSchema } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { NOW, TEST_SECRET, bearer, testDeps } from './deps'

const owned = (userId: string) => ({
  id: userId,
  userId,
  expression: 'break the ice',
  type: 'idiom' as const,
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common' as const,
  createdAt: NOW,
})

describe('auth middleware', () => {
  it('lets an anonymous request through to /health', async () => {
    const res = await createApp(testDeps()).request('/health')

    expect(res.status).toBe(200)
  })

  it('rejects a request with no Authorization header', async () => {
    const res = await createApp(testDeps()).request('/expressions')

    expect(res.status).toBe(401)
    expect(apiErrorSchema.parse(await res.json())).toEqual({
      error: { code: 'UNAUTHORIZED', message: expect.any(String) },
    })
  })

  it('rejects a token signed with the wrong secret', async () => {
    const res = await createApp(testDeps()).request('/expressions', {
      headers: { Authorization: bearer('b'.repeat(64)) },
    })

    expect(res.status).toBe(401)
  })

  it('rejects a stale token', async () => {
    const minutesAgo = new Date(NOW.getTime() - 3 * 60_000)
    const res = await createApp(testDeps()).request('/expressions', {
      headers: { Authorization: bearer(TEST_SECRET, () => minutesAgo) },
    })

    expect(res.status).toBe(401)
  })

  it('rejects a replayed token', async () => {
    const app = createApp(testDeps())
    const header = bearer()

    expect((await app.request('/expressions', { headers: { Authorization: header } })).status).toBe(200)
    expect((await app.request('/expressions', { headers: { Authorization: header } })).status).toBe(401)
  })

  it('accepts a freshly generated token and stamps the configured userId', async () => {
    const app = createApp(
      testDeps({
        userId: 'me',
        expressions: new InMemoryExpressionRepository([owned('me'), owned('someone-else')]),
      }),
    )

    const res = await app.request('/expressions', { headers: { Authorization: bearer() } })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ items: [{ userId: 'me' }] })
  })
})
