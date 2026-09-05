import { z } from 'zod'

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    message: z.string(),
  }),
})

export type ApiError = z.infer<typeof apiErrorSchema>

export const apiError = (code: string, message: string): ApiError => ({
  error: { code, message },
})
