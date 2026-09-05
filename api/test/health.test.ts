import { describe, expect, it } from 'vitest'
import { healthResponseSchema } from '@contracts'
import { createApp } from '../src/app'
import { testDeps } from './deps'

describe('GET /health', () => {
  it('reports ok when the database responds to a ping', async () => {
    const app = createApp(testDeps({ db: { ping: async () => true } }))

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(healthResponseSchema.parse(await res.json())).toEqual({ status: 'ok', db: 'ok' })
  })

  it('reports the database down when the ping fails', async () => {
    const app = createApp(testDeps({ db: { ping: async () => false } }))

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', db: 'down' })
  })
})
