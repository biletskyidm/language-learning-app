import { z } from 'zod'

/** Stub until ticket 04 defines the expression shape and list query. */
export const expressionListResponseSchema = z.object({
  userId: z.string(),
  expressions: z.array(z.unknown()),
})

export type ExpressionListResponse = z.infer<typeof expressionListResponseSchema>
