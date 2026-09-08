import { Hono } from 'hono'
import type { ZodError } from 'zod'
import {
  apiError,
  createExpressionInputSchema,
  expressionListQuerySchema,
  expressionListResponseSchema,
  expressionSchema,
  expressionTagsResponseSchema,
  updateExpressionInputSchema,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

export const expressionRoutes = (deps: Pick<Deps, 'expressions' | 'clock'>) =>
  new Hono<AuthEnv>()
    .get('/expressions', async (c) => {
      const query = expressionListQuerySchema.safeParse(c.req.query())
      if (!query.success) return c.json(apiError('VALIDATION_ERROR', 'Unsupported filter or sort'), 400)

      const items = await deps.expressions.list(c.get('userId'), { ...query.data, now: deps.clock() })

      return c.json(expressionListResponseSchema.parse({ items }))
    })
    .post('/expressions', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = createExpressionInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const userId = c.get('userId')
      const existing = await deps.expressions.findByExpression(userId, input.data.expression)
      if (existing) return c.json(apiError('DUPLICATE', 'That expression is already in your vocabulary'), 409)

      const created = await deps.expressions.create(userId, input.data, deps.clock())

      return c.json(expressionSchema.parse(created), 201)
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
    .patch('/expressions/:id', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const patch = updateExpressionInputSchema.safeParse(body)
      if (!patch.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(patch.error)), 400)

      const updated = await deps.expressions.update(c.get('userId'), c.req.param('id'), patch.data)
      if (!updated) return c.json(apiError('NOT_FOUND', 'No such expression'), 404)

      return c.json(expressionSchema.parse(updated))
    })
    .delete('/expressions/:id', async (c) => {
      const deleted = await deps.expressions.delete(c.get('userId'), c.req.param('id'))
      if (!deleted) return c.json(apiError('NOT_FOUND', 'No such expression'), 404)

      return c.body(null, 204)
    })
