import type {
  ChatMessage,
  DrillAggregates,
  DrillRound,
  ExpressionHistoryItem,
  FinalAssessment,
  FinalAssessmentAverages,
  SrsEffect,
  Training,
  TrainingListQuery,
  TrainingStatus,
  TrainingSummary,
} from '@contracts'

/** Distributes over the union, so each training type keeps its own payload. */
export type NewTraining = Training extends infer T ? (T extends Training ? Omit<T, 'id' | 'userId'> : never) : never

export type ScoreEffect = Pick<SrsEffect, 'expressionId' | 'at'> & {
  before: Pick<SrsEffect['before'], 'score'>
  after: Pick<SrsEffect['after'], 'score'>
}

export interface TrainingRepository {
  create(userId: string, training: NewTraining): Promise<Training>
  list(userId: string, query: TrainingListQuery): Promise<TrainingSummary[]>
  count(userId: string, status: TrainingStatus): Promise<number>
  findById(userId: string, id: string): Promise<Training | undefined>
  appendMessages(userId: string, id: string, messages: ChatMessage[], expectedCount: number): Promise<Training | undefined>
  appendSrsEffects(userId: string, id: string, effects: SrsEffect[]): Promise<void>
  appendRound(userId: string, id: string, round: DrillRound, expectedCount: number): Promise<Training | undefined>
  /** Writes only while that round is still unanswered; undefined means an answer already landed. */
  answerRound(
    userId: string,
    id: string,
    index: number,
    answered: Required<Pick<DrillRound, 'answer' | 'verdict' | 'answeredAt'>>,
  ): Promise<Training | undefined>
  complete(
    userId: string,
    id: string,
    finalAssessment: FinalAssessment,
    expectedCount: number,
  ): Promise<Training | undefined>
  /** Aggregates are computed from a read, so an answer landing since that read must lose the write. */
  completeDrill(
    userId: string,
    id: string,
    aggregates: DrillAggregates,
    completedAt: Date,
    expected: { rounds: number; answered: number },
  ): Promise<Training | undefined>
  cancel(userId: string, id: string, canceledAt: Date): Promise<Training | undefined>
  srsEffectsBetween(userId: string, from: Date, to: Date): Promise<Pick<SrsEffect, 'expressionId' | 'at'>[]>
  scoreEffectsSince(userId: string, from: Date): Promise<ScoreEffect[]>
  completedChatAverages(userId: string): Promise<FinalAssessmentAverages[]>
  /** Newest first, so an expression's schedule reads as a history. */
  listEffectsForExpression(userId: string, expressionId: string): Promise<ExpressionHistoryItem[]>
}
