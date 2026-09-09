import { z } from 'zod'
import { PICK_LIMIT_MAX } from './expressions'

export const trainingTypeSchema = z.enum(['chat', 'gaps', 'describe', 'smuggle'])
export const trainingStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'CANCELED'])
export const chatStyleSchema = z.enum(['formal', 'informal'])

/** Text and meaning are snapshotted, so deleting an expression later never breaks a past training. */
export const trainingTargetSchema = z.object({
  expressionId: z.string(),
  expression: z.string(),
  meaning: z.string(),
})

const assessmentCategorySchema = z.object({
  score: z.number().min(0).max(10),
  messageWithSuggestions: z.string(),
})

const targetCorrectnessSchema = assessmentCategorySchema.extend({ correctVersion: z.string() })

/** Keyed by target text: the tutor names the expression it judged, and only attempted targets appear. */
export const assessmentSchema = z.object({
  grammar: assessmentCategorySchema,
  vocabularyDiversity: assessmentCategorySchema,
  sentenceComplexity: assessmentCategorySchema,
  sentenceNaturalness: assessmentCategorySchema,
  targetExpressionCorrectness: z.record(z.string(), targetCorrectnessSchema),
})

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.coerce.date(),
  assessment: assessmentSchema.optional(),
})

const baseTrainingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: trainingStatusSchema,
  targets: z.array(trainingTargetSchema),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  canceledAt: z.coerce.date().optional(),
})

export const chatTrainingSchema = baseTrainingSchema.extend({
  type: z.literal('chat'),
  context: z.string(),
  style: chatStyleSchema,
  messages: z.array(chatMessageSchema),
})

/** The union grows a member per drill type; the discriminator keeps one collection readable. */
export const trainingSchema = z.discriminatedUnion('type', [chatTrainingSchema])

export const createTrainingInputSchema = z.object({
  type: z.literal('chat'),
  context: z.string().trim().min(1).max(500),
  style: chatStyleSchema,
  expressionIds: z.array(z.string()).min(1).max(PICK_LIMIT_MAX).optional(),
  limit: z.number().int().min(1).max(PICK_LIMIT_MAX).optional(),
})

export const sendMessageInputSchema = z.object({ content: z.string().trim().min(1).max(2000) })

export const chatTurnResponseSchema = z.object({
  reply: chatMessageSchema,
  assessment: assessmentSchema,
  training: trainingSchema,
})

export type TrainingType = z.infer<typeof trainingTypeSchema>
export type TrainingStatus = z.infer<typeof trainingStatusSchema>
export type ChatStyle = z.infer<typeof chatStyleSchema>
export type TrainingTarget = z.infer<typeof trainingTargetSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatTraining = z.infer<typeof chatTrainingSchema>
export type Training = z.infer<typeof trainingSchema>
export type CreateTrainingInput = z.infer<typeof createTrainingInputSchema>
export type Assessment = z.infer<typeof assessmentSchema>
export type AssessmentCategory = z.infer<typeof assessmentCategorySchema>
export type TargetCorrectness = z.infer<typeof targetCorrectnessSchema>
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>
export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>
