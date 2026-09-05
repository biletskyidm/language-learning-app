import { Hono } from 'hono'
import { apiError } from '@contracts'
import type { Deps } from './deps'
import { healthRoutes } from './health/handler'

export const createApp = (deps: Deps) => {
  const app = new Hono()

  app.route('/', healthRoutes(deps.db))

  app.notFound((c) => c.json(apiError('NOT_FOUND', 'Unknown route'), 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json(apiError('INTERNAL_ERROR', 'Unexpected error'), 500)
  })

  return app
}
