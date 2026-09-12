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

export const finalAssessmentAveragesSchema = z.object({
  contextCorrectness: z.number(),
  grammarAndSyntax: z.number(),
  vocabularyDiversity: z.number(),
  sentenceComplexity: z.number(),
  sentenceNaturalness: z.number(),
})

export const targetStatSchema = z.object({ used: z.boolean(), usedCorrectly: z.boolean(), score: z.number() })

export const narrativeSchema = z.object({
  strengths: z.string(),
  areasForImprovement: z.string(),
  suggestedFocus: z.string(),
})

export const finalAssessmentSchema = z.object({
  averages: finalAssessmentAveragesSchema,
  targets: z.record(z.string(), targetStatSchema),
  narrative: narrativeSchema,
  computedAt: z.coerce.date(),
})

export const chatTrainingSchema = baseTrainingSchema.extend({
  type: z.literal('chat'),
  context: z.string(),
  style: chatStyleSchema,
  messages: z.array(chatMessageSchema),
  finalAssessment: finalAssessmentSchema.optional(),
})

export const GAPS_BLANK = '___'
export const GAPS_TARGETS_DEFAULT = 4

/** answerKey holds the blanks in order; it is server-only and stripped from a round nobody has answered yet. */
export const gapsMaterialSchema = z.object({
  parts: z.array(z.string()).min(2),
  bank: z.array(z.string()).min(1),
  answerKey: z.array(z.string()).optional(),
})

export const gapsAnswerSchema = z.object({ fills: z.array(z.string()) })

export const gapsVerdictSchema = z.object({
  perBlank: z.array(z.object({ expected: z.string(), given: z.string(), correct: z.boolean() })),
})

export const gapsRoundSchema = z.object({
  index: z.number().int().min(0),
  targets: z.array(trainingTargetSchema),
  material: gapsMaterialSchema,
  answer: gapsAnswerSchema.optional(),
  verdict: gapsVerdictSchema.optional(),
  answeredAt: z.coerce.date().optional(),
})

/** correct and wrong count judged blanks, not rounds, so a partly right round still shows what landed. */
export const drillAggregatesSchema = z.object({
  rounds: z.number().int().min(0),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
})

export const gapsTrainingSchema = baseTrainingSchema.extend({
  type: z.literal('gaps'),
  rounds: z.array(gapsRoundSchema).default([]),
  aggregates: drillAggregatesSchema.optional(),
})

/** The union grows a member per drill type; the discriminator keeps one collection readable. */
export const trainingSchema = z.discriminatedUnion('type', [chatTrainingSchema, gapsTrainingSchema])

export const trainingSummarySchema = baseTrainingSchema.omit({ srsEffects: true }).extend({
  type: trainingTypeSchema,
  context: z.string().optional(),
  style: chatStyleSchema.optional(),
  finalAssessment: z.object({ averages: finalAssessmentAveragesSchema }).optional(),
})

export const TRAININGS_PAGE_MAX = 50

export const trainingListQuerySchema = z.object({
  type: trainingTypeSchema.optional(),
  status: trainingStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(TRAININGS_PAGE_MAX).default(TRAININGS_PAGE_MAX),
  before: z.coerce.date().optional(),
})

export const trainingListResponseSchema = z.object({
  items: z.array(trainingSummarySchema),
  nextBefore: z.coerce.date().optional(),
})

const targetChoiceSchema = z.object({
  expressionIds: z.array(z.string()).min(1).max(PICK_LIMIT_MAX).optional(),
  limit: z.number().int().min(1).max(PICK_LIMIT_MAX).optional(),
})

export const createChatTrainingInputSchema = targetChoiceSchema.extend({
  type: z.literal('chat'),
  context: z.string().trim().min(1).max(500),
  style: chatStyleSchema,
})

export const createGapsTrainingInputSchema = targetChoiceSchema.extend({ type: z.literal('gaps') })

export const createTrainingInputSchema = z.discriminatedUnion('type', [
  createChatTrainingInputSchema,
  createGapsTrainingInputSchema,
])

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

/**
 * Both round replies carry the whole training, so the client renders the next round without a refetch.
 * The round and training members grow into unions as drill types are added.
 */
export const drillRoundResponseSchema = z.object({
  round: gapsRoundSchema,
  training: gapsTrainingSchema,
})

export const drillAnswerResponseSchema = drillRoundResponseSchema.extend({
  verdict: gapsVerdictSchema,
  srsEffects: z.array(srsEffectSchema),
})

export type TrainingType = z.infer<typeof trainingTypeSchema>
export type TrainingStatus = z.infer<typeof trainingStatusSchema>
export type ChatStyle = z.infer<typeof chatStyleSchema>
export type TrainingTarget = z.infer<typeof trainingTargetSchema>
export type SrsEffect = z.infer<typeof srsEffectSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatTraining = z.infer<typeof chatTrainingSchema>
export type Training = z.infer<typeof trainingSchema>
export type FinalAssessmentAverages = z.infer<typeof finalAssessmentAveragesSchema>
export type TargetStat = z.infer<typeof targetStatSchema>
export type Narrative = z.infer<typeof narrativeSchema>
export type FinalAssessment = z.infer<typeof finalAssessmentSchema>
export type TrainingSummary = z.infer<typeof trainingSummarySchema>
export type TrainingListQuery = z.infer<typeof trainingListQuerySchema>
export type TrainingListResponse = z.infer<typeof trainingListResponseSchema>
export type CreateTrainingInput = z.infer<typeof createTrainingInputSchema>
export type CreateChatTrainingInput = z.infer<typeof createChatTrainingInputSchema>
export type CreateGapsTrainingInput = z.infer<typeof createGapsTrainingInputSchema>
export type GapsMaterial = z.infer<typeof gapsMaterialSchema>
export type GapsAnswer = z.infer<typeof gapsAnswerSchema>
export type GapsVerdict = z.infer<typeof gapsVerdictSchema>
export type GapsRound = z.infer<typeof gapsRoundSchema>
export type GapsTraining = z.infer<typeof gapsTrainingSchema>
export type DrillAggregates = z.infer<typeof drillAggregatesSchema>
export type DrillRoundResponse = z.infer<typeof drillRoundResponseSchema>
export type DrillAnswerResponse = z.infer<typeof drillAnswerResponseSchema>

/** What every drill round shares; each drill's own schema fixes the payload types. */
export type DrillRound = {
  index: number
  targets: TrainingTarget[]
  material: unknown
  answer?: unknown
  verdict?: unknown
  answeredAt?: Date
}
export type Assessment = z.infer<typeof assessmentSchema>
export type AssessmentCategory = z.infer<typeof assessmentCategorySchema>
export type TargetCorrectness = z.infer<typeof targetCorrectnessSchema>
export type OverallFeedback = z.infer<typeof overallFeedbackSchema>
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>
export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>
