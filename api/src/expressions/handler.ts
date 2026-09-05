import { Hono } from 'hono'
import { expressionListResponseSchema } from '@contracts'
import type { AuthEnv } from '../auth/middleware'

/** Stub behind the auth middleware; ticket 04 returns the real list. */
export const expressionRoutes = () =>
  new Hono<AuthEnv>().get('/expressions', (c) =>
    c.json(expressionListResponseSchema.parse({ userId: c.get('userId'), expressions: [] })),
  )
