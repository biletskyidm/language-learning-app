import { Hono } from 'hono'
import { expressionListQuerySchema, expressionListResponseSchema } from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

export const expressionRoutes = (deps: Pick<Deps, 'expressions'>) =>
  new Hono<AuthEnv>().get('/expressions', async (c) => {
    const query = expressionListQuerySchema.parse(c.req.query())
    const items = await deps.expressions.list(c.get('userId'), query)

    return c.json(expressionListResponseSchema.parse({ items }))
  })
