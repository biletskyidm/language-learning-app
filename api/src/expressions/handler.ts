import { Hono } from 'hono'
import { expressionListResponseSchema } from '@contracts'
import type { AuthEnv } from '../auth/middleware'

export const expressionRoutes = () =>
  new Hono<AuthEnv>().get('/expressions', (c) =>
    c.json(expressionListResponseSchema.parse({ userId: c.get('userId'), expressions: [] })),
  )
