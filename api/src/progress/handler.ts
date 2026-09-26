import { Hono } from 'hono'
import {
  ACTIVE_LATEST_LIMIT,
  apiError,
  finalAssessmentAveragesSchema,
  progressSummaryQuerySchema,
  progressSummarySchema,
  SCORE_TREND_DAYS,
  WEAKEST_LIMIT,
  type FinalAssessmentAverages,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'
import { scoreTrend } from './score-trend'

const DAY = 24 * 60 * 60 * 1000

const localMidnight = (now: Date, tzOffset: number, daysBack = 0) => {
  const local = new Date(now.getTime() - tzOffset * 60_000)
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysBack)

  return new Date(midnight + tzOffset * 60_000)
}

const weekStart = (now: Date, tzOffset: number) => {
  const local = new Date(now.getTime() - tzOffset * 60_000)

  return localMidnight(now, tzOffset, (local.getUTCDay() + 6) % 7)
}

const averageSkills = (sessions: FinalAssessmentAverages[]) =>
  sessions.length
    ? (Object.fromEntries(
        Object.keys(finalAssessmentAveragesSchema.shape).map((category) => [
          category,
          sessions.reduce((sum, session) => sum + session[category as keyof FinalAssessmentAverages], 0) /
            sessions.length,
        ]),
      ) as FinalAssessmentAverages)
    : undefined

export const progressRoutes = (deps: Pick<Deps, 'expressions' | 'trainings' | 'clock'>) =>
  new Hono<AuthEnv>().get('/progress/summary', async (c) => {
    const query = progressSummaryQuerySchema.safeParse(c.req.query())
    if (!query.success) return c.json(apiError('VALIDATION_ERROR', 'tzOffset must be minutes between -840 and 840'), 400)

    const userId = c.get('userId')
    const now = deps.clock()
    const { tzOffset } = query.data
    const from = weekStart(now, tzOffset)
    const trendFrom = localMidnight(now, tzOffset, SCORE_TREND_DAYS - 1)
    const [counts, weakest, effects, activeCount, activeLatest, chats, scores, scoreEffects] = await Promise.all([
      deps.expressions.progressCounts(userId, now),
      deps.expressions.list(userId, { practiced: true, sort: 'score', dir: 'asc', due: false, now }),
      deps.trainings.srsEffectsBetween(userId, from, new Date(from.getTime() + 7 * DAY)),
      deps.trainings.count(userId, 'ACTIVE'),
      deps.trainings.list(userId, { status: 'ACTIVE', limit: ACTIVE_LATEST_LIMIT }),
      deps.trainings.completedChatAverages(userId),
      deps.expressions.scores(userId),
      deps.trainings.scoreEffectsSince(userId, trendFrom),
    ])

    const days = Array.from({ length: 7 }, () => new Set<string>())
    for (const { expressionId, at } of effects) days[Math.floor((at.getTime() - from.getTime()) / DAY)]?.add(expressionId)

    const dayEnds = Array.from({ length: SCORE_TREND_DAYS }, (_, day) => new Date(trendFrom.getTime() + (day + 1) * DAY))

    return c.json(
      progressSummarySchema.parse({
        ...counts,
        weakest: weakest.slice(0, WEAKEST_LIMIT),
        week: days.map((day) => day.size),
        active: { count: activeCount, latest: activeLatest },
        scoreTrend: scoreTrend(scores, scoreEffects, dayEnds),
        chatSkills: { sessions: chats.length, averages: averageSkills(chats) },
      }),
    )
  })
