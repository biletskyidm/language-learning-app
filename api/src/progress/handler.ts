import { Hono } from 'hono'
import { apiError, progressSummaryQuerySchema, progressSummarySchema } from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

const DAY = 24 * 60 * 60 * 1000

const weekStart = (now: Date, tzOffset: number) => {
  const local = new Date(now.getTime() - tzOffset * 60_000)
  const sinceMonday = (local.getUTCDay() + 6) % 7
  const localMonday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - sinceMonday)

  return new Date(localMonday + tzOffset * 60_000)
}

export const progressRoutes = (deps: Pick<Deps, 'expressions' | 'trainings' | 'clock'>) =>
  new Hono<AuthEnv>().get('/progress/summary', async (c) => {
    const query = progressSummaryQuerySchema.safeParse(c.req.query())
    if (!query.success) return c.json(apiError('VALIDATION_ERROR', 'tzOffset must be minutes between -840 and 840'), 400)

    const userId = c.get('userId')
    const now = deps.clock()
    const from = weekStart(now, query.data.tzOffset)
    const [counts, effects] = await Promise.all([
      deps.expressions.progressCounts(userId, now),
      deps.trainings.srsEffectsBetween(userId, from, new Date(from.getTime() + 7 * DAY)),
    ])

    const days = Array.from({ length: 7 }, () => new Set<string>())
    for (const { expressionId, at } of effects) days[Math.floor((at.getTime() - from.getTime()) / DAY)]?.add(expressionId)

    return c.json(progressSummarySchema.parse({ ...counts, week: days.map((day) => day.size) }))
  })
