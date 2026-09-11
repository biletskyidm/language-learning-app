import type { ChatMessage, SrsEffect, Training, TrainingListQuery, TrainingSummary } from '@contracts'

export type NewTraining = Omit<Training, 'id' | 'userId'>

export interface TrainingRepository {
  create(userId: string, training: NewTraining): Promise<Training>
  list(userId: string, query: TrainingListQuery): Promise<TrainingSummary[]>
  findById(userId: string, id: string): Promise<Training | undefined>
  appendMessages(userId: string, id: string, messages: ChatMessage[], expectedCount: number): Promise<Training | undefined>
  appendSrsEffects(userId: string, id: string, effects: SrsEffect[]): Promise<void>
}
