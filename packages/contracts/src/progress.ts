import { z } from 'zod'
import { expressionSchema } from './expressions'
import { finalAssessmentAveragesSchema, trainingSummarySchema } from './trainings'

export const WEAKEST_LIMIT = 5
export const ACTIVE_LATEST_LIMIT = 2
export const SCORE_TREND_DAYS = 30

export const progressSummaryQuerySchema = z.object({
  /** Minutes as in Date#getTimezoneOffset: UTC minus local, so UTC+3 is -180. */
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
})

export const progressSummarySchema = z.object({
  dueNow: z.number().int().min(0),
  unpracticed: z.number().int().min(0),
  week: z.array(z.number().int().min(0)).length(7),
  weakest: z.array(expressionSchema).max(WEAKEST_LIMIT),
  total: z.number().int().min(0),
  active: z.object({
    count: z.number().int().min(0),
    latest: z.array(trainingSummarySchema).max(ACTIVE_LATEST_LIMIT),
  }),
  scoreTrend: z.array(z.number().nullable()).length(SCORE_TREND_DAYS),
  chatSkills: z.object({
    sessions: z.number().int().min(0),
    averages: finalAssessmentAveragesSchema.optional(),
  }),
})

export type ProgressSummaryQuery = z.infer<typeof progressSummaryQuerySchema>
export type ProgressSummary = z.infer<typeof progressSummarySchema>
