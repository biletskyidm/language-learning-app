import { ObjectId, type Db } from 'mongodb'
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
import { toDomain, toSummary, type TrainingDoc } from './mapper'
import type { NewTraining, TrainingRepository } from './repository'

export const TRAININGS_COLLECTION = 'trainings'

/** An id the driver would reject is not a lookup failure worth a 500 — it is simply nothing to find. */
const idFilter = (userId: string, id: string) =>
  ObjectId.isValid(id) ? { userId, _id: new ObjectId(id) } : undefined

export class MongoTrainingRepository implements TrainingRepository {
  constructor(private readonly db: Db) {}

  async create(userId: string, training: NewTraining): Promise<Training> {
    const doc = { userId, ...training }
    const { insertedId } = await this.db.collection(TRAININGS_COLLECTION).insertOne(doc)

    return toDomain({ ...doc, _id: insertedId })
  }

  async appendMessages(
    userId: string,
    id: string,
    messages: ChatMessage[],
    expectedCount: number,
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db
      .collection<{ messages: ChatMessage[] }>(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE', messages: { $size: expectedCount } },
        { $push: { messages: { $each: messages } } },
        { returnDocument: 'after' },
      )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async appendRound(
    userId: string,
    id: string,
    round: DrillRound,
    expectedCount: number,
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db
      .collection<{ rounds: DrillRound[] }>(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE', rounds: { $size: expectedCount } },
        { $push: { rounds: round } },
        { returnDocument: 'after' },
      )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async answerRound(
    userId: string,
    id: string,
    index: number,
    answered: Required<Pick<DrillRound, 'answer' | 'verdict' | 'answeredAt'>>,
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(TRAININGS_COLLECTION).findOneAndUpdate(
      { ...filter, status: 'ACTIVE', [`rounds.${index}.answeredAt`]: { $exists: false } },
      {
        $set: {
          [`rounds.${index}.answer`]: answered.answer,
          [`rounds.${index}.verdict`]: answered.verdict,
          [`rounds.${index}.answeredAt`]: answered.answeredAt,
        },
      },
      { returnDocument: 'after' },
    )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async completeDrill(
    userId: string,
    id: string,
    aggregates: DrillAggregates,
    completedAt: Date,
    expectedCount: number,
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db
      .collection(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE', rounds: { $size: expectedCount } },
        { $set: { status: 'COMPLETED', completedAt, aggregates } },
        { returnDocument: 'after' },
      )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async appendSrsEffects(userId: string, id: string, effects: SrsEffect[]): Promise<void> {
    const filter = idFilter(userId, id)
    if (!filter) return

    await this.db
      .collection<{ srsEffects: SrsEffect[] }>(TRAININGS_COLLECTION)
      .updateOne(filter, { $push: { srsEffects: { $each: effects } } })
  }

  async complete(
    userId: string,
    id: string,
    finalAssessment: FinalAssessment,
    expectedCount: number,
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db
      .collection(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE', messages: { $size: expectedCount } },
        { $set: { status: 'COMPLETED', completedAt: finalAssessment.computedAt, finalAssessment } },
        { returnDocument: 'after' },
      )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async cancel(userId: string, id: string, canceledAt: Date): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db
      .collection(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE' },
        { $set: { status: 'CANCELED', canceledAt } },
        { returnDocument: 'after' },
      )

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async findById(userId: string, id: string): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(TRAININGS_COLLECTION).findOne(filter)

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async list(userId: string, { type, status, before, limit }: TrainingListQuery): Promise<TrainingSummary[]> {
    const docs = await this.db
      .collection(TRAININGS_COLLECTION)
      .find({
        userId,
        ...(type && { type }),
        ...(status && { status }),
        ...(before && { createdAt: { $lt: before } }),
      })
      .project({ messages: 0, rounds: 0, srsEffects: 0 })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray()

    return docs.map((doc) => toSummary(doc as TrainingDoc))
  }
}
