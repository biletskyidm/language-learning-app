import {
  trainingSummarySchema,
  type ChatMessage,
  type DrillAggregates,
  type DrillRound,
  type FinalAssessment,
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
    if (training?.type !== 'chat' || training.status !== 'ACTIVE' || training.messages.length !== expectedCount) {
      return undefined
    }

    training.messages = [...training.messages, ...messages]

    return copy(training)
  }

  async appendRound(
    userId: string,
    id: string,
    round: DrillRound,
    expectedCount: number,
  ): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    const drill = asDrill(training)
    if (!training || !drill || training.status !== 'ACTIVE' || drill.rounds.length !== expectedCount) return undefined

    drill.rounds = [...drill.rounds, round]

    return copy(training)
  }

  async answerRound(
    userId: string,
    id: string,
    index: number,
    answered: Required<Pick<DrillRound, 'answer' | 'verdict' | 'answeredAt'>>,
  ): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    const drill = asDrill(training)
    const round = drill?.rounds[index]
    if (!training || !drill || !round || training.status !== 'ACTIVE' || round.answeredAt) return undefined

    drill.rounds = drill.rounds.map((one, at) => (at === index ? { ...one, ...answered } : one))

    return copy(training)
  }

  async completeDrill(
    userId: string,
    id: string,
    aggregates: DrillAggregates,
    completedAt: Date,
    expected: { rounds: number; answered: number },
  ): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    const drill = asDrill(training)
    if (!training || !drill || training.status !== 'ACTIVE' || drill.rounds.length !== expected.rounds) return undefined
    if (drill.rounds.filter((round) => round.answeredAt).length !== expected.answered) return undefined

    training.status = 'COMPLETED'
    training.completedAt = completedAt
    drill.aggregates = aggregates

    return copy(training)
  }

  async appendSrsEffects(userId: string, id: string, effects: SrsEffect[]): Promise<void> {
    const training = this.stored(userId, id)
    if (training) training.srsEffects = [...training.srsEffects, ...effects]
  }

  async complete(
    userId: string,
    id: string,
    finalAssessment: FinalAssessment,
    expectedCount: number,
  ): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    if (training?.type !== 'chat' || training.status !== 'ACTIVE' || training.messages.length !== expectedCount) {
      return undefined
    }

    training.status = 'COMPLETED'
    training.completedAt = finalAssessment.computedAt
    training.finalAssessment = finalAssessment

    return copy(training)
  }

  async cancel(userId: string, id: string, canceledAt: Date): Promise<Training | undefined> {
    const training = this.stored(userId, id)
    if (!training || training.status !== 'ACTIVE') return undefined

    training.status = 'CANCELED'
    training.canceledAt = canceledAt

    return copy(training)
  }

  private stored(userId: string, id: string) {
    return this.trainings.find((training) => training.userId === userId && training.id === id)
  }
}

/** The repository is generic over drill types, so a stored round is only structurally typed here. */
const asDrill = (training?: Training) =>
  training && training.type !== 'chat'
    ? (training as unknown as { rounds: DrillRound[]; aggregates?: DrillAggregates })
    : undefined

/** Handed out like a decoded document, so a caller cannot reach the stored turns by reference. */
const copy = (training?: Training): Training | undefined => {
  if (!training) return undefined
  const base = { ...training, srsEffects: [...training.srsEffects] }

  return base.type === 'chat' ? { ...base, messages: [...base.messages] } : { ...base, rounds: [...base.rounds] }
}
