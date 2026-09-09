import type { ChatMessage, Training } from '@contracts'
import type { NewTraining, TrainingRepository } from './repository'

export class InMemoryTrainingRepository implements TrainingRepository {
  constructor(private readonly trainings: Training[] = []) {}

  async create(userId: string, training: NewTraining): Promise<Training> {
    const created: Training = { ...training, id: crypto.randomUUID(), userId }
    this.trainings.push(created)

    return created
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

  private stored(userId: string, id: string) {
    return this.trainings.find((training) => training.userId === userId && training.id === id)
  }
}

/** Handed out like a decoded document, so a caller cannot reach the stored messages by reference. */
const copy = (training?: Training): Training | undefined =>
  training && { ...training, messages: [...training.messages] }
