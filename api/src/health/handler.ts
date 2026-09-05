import { Hono } from 'hono'
import { healthResponseSchema } from '@contracts'
import type { DbHealth } from '../deps'

export const healthRoutes = (db: DbHealth) =>
  new Hono().get('/health', async (c) => {
    const body = healthResponseSchema.parse({
      status: 'ok',
      db: (await db.ping()) ? 'ok' : 'down',
    })
    return c.json(body)
  })
