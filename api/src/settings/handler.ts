import { Hono } from 'hono'
import type { ZodError } from 'zod'
import { apiError, settingsInputSchema, settingsSchema } from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

export const settingsRoutes = (deps: Pick<Deps, 'settings'>) =>
  new Hono<AuthEnv>()
    .get('/settings', async (c) => c.json(settingsSchema.parse(await deps.settings.get(c.get('userId')))))
    .put('/settings', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = settingsInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      return c.json(settingsSchema.parse(await deps.settings.put(c.get('userId'), input.data)))
    })
