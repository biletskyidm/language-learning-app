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
    return this.trainings.find((training) => training.userId === userId && training.id === id)
  }

  async appendMessages(userId: string, id: string, messages: ChatMessage[]): Promise<Training> {
    const training = await this.findById(userId, id)
    if (!training) throw new Error(`No training ${id} to append to`)

    training.messages = [...training.messages, ...messages]

    return training
  }
}
