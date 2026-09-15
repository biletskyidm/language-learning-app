import { Hono } from 'hono'
import { progressSummarySchema, TRAININGS_PAGE_MAX } from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

export const progressRoutes = (deps: Pick<Deps, 'expressions' | 'trainings' | 'clock'>) =>
  new Hono<AuthEnv>().get('/progress/summary', async (c) => {
    const userId = c.get('userId')
    const [counts, active] = await Promise.all([
      deps.expressions.progressCounts(userId, deps.clock()),
      deps.trainings.list(userId, { status: 'ACTIVE', limit: TRAININGS_PAGE_MAX }),
    ])

    return c.json(progressSummarySchema.parse({ ...counts, active }))
  })
