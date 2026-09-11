import {
  trainingSummarySchema,
  type ChatMessage,
  type SrsEffect,
  type Training,
  type TrainingListQuery,
  type TrainingSummary,
} from '@contracts'
import type { NewTraining, TrainingRepository } from './repository'

export class InMemoryTrainingRepository implements TrainingRepository {
  constructor(private readonly trainings: Training[] = []) {}

  async create(userId: string, training: NewTraining): Promise<Training> {
    const created: Training = { ...training, id: crypto.randomUUID(), userId }
    this.trainings.push(created)

    return created
  }

  async list(userId: string, { type, status, before, limit }: TrainingListQuery): Promise<TrainingSummary[]> {
    return this.trainings
      .filter(
        (training) =>
          training.userId === userId &&
          (!type || training.type === type) &&
          (!status || training.status === status) &&
          (!before || training.createdAt < before),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((training) => trainingSummarySchema.parse(training))
  }

  async findById(userId: string, id: string): Promise<Training | undefined> {
    return copy(this.stored(userId, id))
  }

  async appendMessages(
    userId: string,
    id: string,
    messages: ChatMessage[],
    expectedCount: number,
  ): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    if (!training || training.messages.length !== expectedCount) return undefined

    training.messages = [...training.messages, ...messages]

    return copy(training)
  }

  async appendSrsEffects(userId: string, id: string, effects: SrsEffect[]): Promise<void> {
    const training = this.stored(userId, id)
    if (training) training.srsEffects = [...training.srsEffects, ...effects]
  }

  private stored(userId: string, id: string) {
    return this.trainings.find((training) => training.userId === userId && training.id === id)
  }
}

/** Handed out like a decoded document, so a caller cannot reach the stored messages by reference. */
const copy = (training?: Training): Training | undefined =>
  training && { ...training, messages: [...training.messages], srsEffects: [...training.srsEffects] }
