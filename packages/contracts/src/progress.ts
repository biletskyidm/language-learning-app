import { z } from 'zod'
import { trainingSummarySchema } from './trainings'

export const progressSummarySchema = z.object({
  dueNow: z.number().int().min(0),
  unpracticed: z.number().int().min(0),
  active: z.array(trainingSummarySchema),
})

export type ProgressSummary = z.infer<typeof progressSummarySchema>
