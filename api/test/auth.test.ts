import { describe, expect, it } from 'vitest'
import { apiErrorSchema, generateToken } from '@contracts'
import { createApp } from '../src/app'
import { NOW, TEST_SECRET, testDeps } from './deps'

const nonces = () => {
  let n = 0
  return (size: number) => Uint8Array.from({ length: size }, (_, i) => (i === 0 ? n++ : i))
}

const bearer = (secret = TEST_SECRET, now: () => Date = () => NOW, random = nonces()) =>
  `Bearer ${generateToken(secret, { now, random })}`

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
    const app = createApp(testDeps({ userId: 'me' }))

    const res = await app.request('/expressions', { headers: { Authorization: bearer() } })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ userId: 'me' })
  })
})
