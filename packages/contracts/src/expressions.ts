import { z } from 'zod'

export const expressionTypeSchema = z.enum(['word', 'phrase', 'idiom', 'sentence', 'collocation', 'phrasal_verb'])
export const partOfSpeechSchema = z.enum(['noun', 'verb', 'adjective', 'adverb'])
export const frequencySchema = z.enum(['very_common', 'common', 'moderate', 'uncommon', 'formal/academic'])

/** SRS fields stay optional: an absent `score` means never practiced and the picker relies on it. */
export const expressionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expression: z.string(),
  type: expressionTypeSchema,
  partOfSpeech: partOfSpeechSchema.optional(),
  meaning: z.string(),
  examples: z.array(z.string()),
  tags: z.array(z.string()),
  frequency: frequencySchema,
  createdAt: z.coerce.date(),
  score: z.number().optional(),
  timesPracticed: z.number().optional(),
  lastTimePracticedAt: z.coerce.date().optional(),
  nextTrainingAt: z.coerce.date().optional(),
})

const trimmed = z.string().trim().min(1)

export const createExpressionInputSchema = z.object({
  expression: trimmed,
  type: expressionTypeSchema,
  partOfSpeech: partOfSpeechSchema.optional(),
  meaning: trimmed,
  examples: z.array(trimmed).default([]),
  tags: z.array(trimmed).default([]),
  frequency: frequencySchema,
})

export const expressionSortSchema = z.enum(['createdAt', 'score', 'nextTrainingAt', 'timesPracticed'])
export const sortDirectionSchema = z.enum(['asc', 'desc'])

export const expressionListQuerySchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
  frequency: frequencySchema.optional(),
  due: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  sort: expressionSortSchema.default('createdAt'),
  dir: sortDirectionSchema.default('desc'),
})

export const expressionListResponseSchema = z.object({
  items: z.array(expressionSchema),
})

export const expressionTagsResponseSchema = z.object({
  items: z.array(z.string()),
})

export type ExpressionType = z.infer<typeof expressionTypeSchema>
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>
export type Frequency = z.infer<typeof frequencySchema>
export type Expression = z.infer<typeof expressionSchema>
export type CreateExpressionInput = z.infer<typeof createExpressionInputSchema>
export type ExpressionSort = z.infer<typeof expressionSortSchema>
export type SortDirection = z.infer<typeof sortDirectionSchema>
export type ExpressionListQuery = z.infer<typeof expressionListQuerySchema>
export type ExpressionListResponse = z.infer<typeof expressionListResponseSchema>
export type ExpressionTagsResponse = z.infer<typeof expressionTagsResponseSchema>
