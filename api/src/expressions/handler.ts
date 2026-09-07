import { Hono } from 'hono'
import {
  apiError,
  expressionListQuerySchema,
  expressionListResponseSchema,
  expressionSchema,
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
    .get('/expressions/:id', async (c) => {
      const expression = await deps.expressions.findById(c.get('userId'), c.req.param('id'))
      if (!expression) return c.json(apiError('NOT_FOUND', 'No such expression'), 404)

      return c.json(expressionSchema.parse(expression))
    })
