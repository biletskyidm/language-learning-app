import type {
  ChatMessage,
  DrillAggregates,
  DrillRound,
  FinalAssessment,
  SrsEffect,
  Training,
  TrainingListQuery,
  TrainingSummary,
} from '@contracts'

/** Distributes over the union, so each training type keeps its own payload. */
export type NewTraining = Training extends infer T ? (T extends Training ? Omit<T, 'id' | 'userId'> : never) : never

export interface TrainingRepository {
  create(userId: string, training: NewTraining): Promise<Training>
  list(userId: string, query: TrainingListQuery): Promise<TrainingSummary[]>
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
}
