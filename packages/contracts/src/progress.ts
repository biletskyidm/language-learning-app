import { z } from 'zod'

export const progressSummaryQuerySchema = z.object({
  /** Minutes as in Date#getTimezoneOffset: UTC minus local, so UTC+3 is -180. */
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
})

export const progressSummarySchema = z.object({
  dueNow: z.number().int().min(0),
  unpracticed: z.number().int().min(0),
  week: z.array(z.number().int().min(0)).length(7),
})

export type ProgressSummaryQuery = z.infer<typeof progressSummaryQuerySchema>
export type ProgressSummary = z.infer<typeof progressSummarySchema>
