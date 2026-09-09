import type { Training } from '@contracts'
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
}
