import type { ChatMessage, Training } from '@contracts'

export type NewTraining = Omit<Training, 'id' | 'userId'>

export interface TrainingRepository {
  create(userId: string, training: NewTraining): Promise<Training>
  findById(userId: string, id: string): Promise<Training | undefined>
  appendMessages(userId: string, id: string, messages: ChatMessage[], expectedCount: number): Promise<Training | undefined>
}
