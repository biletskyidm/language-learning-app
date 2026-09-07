import { Hono } from 'hono'
import {
  apiError,
  expressionListQuerySchema,
  expressionListResponseSchema,
  expressionTagsResponseSchema,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

export const expressionRoutes = (deps: Pick<Deps, 'expressions' | 'clock'>) =>
  new Hono<AuthEnv>()
    .get('/expressions', async (c) => {
      const query = expressionListQuerySchema.safeParse(c.req.query())
      if (!query.success) return c.json(apiError('VALIDATION_ERROR', 'Unsupported filter or sort'), 400)

      const items = await deps.expressions.list(c.get('userId'), { ...query.data, now: deps.clock() })

      return c.json(expressionListResponseSchema.parse({ items }))
    })
    .get('/expressions/tags', async (c) => {
      const items = await deps.expressions.tags(c.get('userId'))

      return c.json(expressionTagsResponseSchema.parse({ items }))
    })
