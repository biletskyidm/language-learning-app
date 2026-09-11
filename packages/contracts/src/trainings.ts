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
  feedback: z.string(),
  suggestions: z.string(),
})

const targetCorrectnessSchema = assessmentCategorySchema.extend({ correctVersion: z.string() })

const overallFeedbackSchema = z.object({ strengths: z.string(), areasForImprovement: z.string() })

/** targetPhrasesCorrectness is keyed by target text: the tutor names the expression it judged, and only attempted targets appear. */
export const assessmentSchema = z.object({
  contextCorrectness: assessmentCategorySchema,
  grammarAndSyntax: assessmentCategorySchema,
  vocabularyDiversity: assessmentCategorySchema,
  sentenceComplexity: assessmentCategorySchema,
  sentenceNaturalness: assessmentCategorySchema,
  targetPhrasesCorrectness: z.record(z.string(), targetCorrectnessSchema),
  overallFeedback: overallFeedbackSchema,
})

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.coerce.date(),
  assessment: assessmentSchema.optional(),
  /** Carried by user messages: the client's id for the send that produced this turn. */
  turnId: z.string().optional(),
})

/** One SRS write, kept on the training that caused it so a phrase's schedule can be audited. */
export const srsEffectSchema = z.object({
  expressionId: z.string(),
  expression: z.string(),
  scoreWritten: z.number(),
  source: z.object({ kind: z.enum(['message', 'round']), index: z.number().int().min(0) }),
  before: z.object({
    score: z.number().optional(),
    timesPracticed: z.number().optional(),
    nextTrainingAt: z.coerce.date().optional(),
  }),
  after: z.object({
    score: z.number(),
    timesPracticed: z.number(),
    nextTrainingAt: z.coerce.date(),
  }),
  at: z.coerce.date(),
})

const baseTrainingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: trainingStatusSchema,
  targets: z.array(trainingTargetSchema),
  srsEffects: z.array(srsEffectSchema).default([]),
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

/** turnId is the client's idempotency key: resending it replays the turn instead of starting a second one. */
export const sendMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  turnId: z.string().min(1).max(100),
})

export const chatTurnResponseSchema = z.object({
  reply: chatMessageSchema,
  assessment: assessmentSchema,
  srsEffects: z.array(srsEffectSchema),
  training: trainingSchema,
})

export type TrainingType = z.infer<typeof trainingTypeSchema>
export type TrainingStatus = z.infer<typeof trainingStatusSchema>
export type ChatStyle = z.infer<typeof chatStyleSchema>
export type TrainingTarget = z.infer<typeof trainingTargetSchema>
export type SrsEffect = z.infer<typeof srsEffectSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatTraining = z.infer<typeof chatTrainingSchema>
export type Training = z.infer<typeof trainingSchema>
export type CreateTrainingInput = z.infer<typeof createTrainingInputSchema>
export type Assessment = z.infer<typeof assessmentSchema>
export type AssessmentCategory = z.infer<typeof assessmentCategorySchema>
export type TargetCorrectness = z.infer<typeof targetCorrectnessSchema>
export type OverallFeedback = z.infer<typeof overallFeedbackSchema>
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>
export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>
