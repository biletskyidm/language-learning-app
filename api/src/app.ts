import { Hono } from 'hono'
import { apiError } from '@contracts'
import { requireAuth, type AuthEnv } from './auth/middleware'
import type { Deps } from './deps'
import { expressionRoutes } from './expressions/handler'
import { healthRoutes } from './health/handler'

export const createApp = (deps: Deps) => {
  const app = new Hono<AuthEnv>()

  // /health is public because it is registered before the middleware and answers without calling next().
  app.route('/', healthRoutes(deps.db))
  app.use('*', requireAuth(deps))
  app.route('/', expressionRoutes())

  app.notFound((c) => c.json(apiError('NOT_FOUND', 'Unknown route'), 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json(apiError('INTERNAL_ERROR', 'Unexpected error'), 500)
  })

  return app
}
