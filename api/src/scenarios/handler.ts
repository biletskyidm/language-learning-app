import { Hono } from 'hono'
import type { ZodError } from 'zod'
import {
  apiError,
  createScenarioInputSchema,
  DEFAULT_SCENARIOS,
  scenarioListResponseSchema,
  scenarioSchema,
  updateScenarioInputSchema,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

export const scenarioRoutes = (deps: Pick<Deps, 'scenarios' | 'clock'>) =>
  new Hono<AuthEnv>()
    .get('/scenarios', async (c) => {
      const userId = c.get('userId')
      const saved = await deps.scenarios.list(userId)
      const items = saved.length ? saved : await deps.scenarios.seedDefaults(userId, DEFAULT_SCENARIOS, deps.clock())

      return c.json(scenarioListResponseSchema.parse({ items }))
    })
    .post('/scenarios', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = createScenarioInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const created = await deps.scenarios.create(c.get('userId'), input.data, deps.clock())

      return c.json(scenarioSchema.parse(created), 201)
    })
    .patch('/scenarios/:id', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const patch = updateScenarioInputSchema.safeParse(body)
      if (!patch.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(patch.error)), 400)

      const updated = await deps.scenarios.update(c.get('userId'), c.req.param('id'), patch.data)
      if (!updated) return c.json(apiError('NOT_FOUND', 'No such scenario'), 404)

      return c.json(scenarioSchema.parse(updated))
    })
    .delete('/scenarios/:id', async (c) => {
      const deleted = await deps.scenarios.delete(c.get('userId'), c.req.param('id'))
      if (!deleted) return c.json(apiError('NOT_FOUND', 'No such scenario'), 404)

      return c.body(null, 204)
    })
