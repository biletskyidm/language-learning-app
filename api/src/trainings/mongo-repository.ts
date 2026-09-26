import { ObjectId, type Db } from 'mongodb'
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
import { toDomain, toSummary, type TrainingDoc } from './mapper'
import type { NewTraining, ScoreEffect, TrainingRepository } from './repository'

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
    expected: { rounds: number; answered: number },
  ): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const answered = {
      $expr: {
        $eq: [
          { $size: { $filter: { input: '$rounds', cond: { $ne: [{ $ifNull: ['$$this.answeredAt', null] }, null] } } } },
          expected.answered,
        ],
      },
    }
    const doc = await this.db
      .collection(TRAININGS_COLLECTION)
      .findOneAndUpdate(
        { ...filter, status: 'ACTIVE', rounds: { $size: expected.rounds }, ...answered },
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

  async srsEffectsBetween(userId: string, from: Date, to: Date): Promise<Pick<SrsEffect, 'expressionId' | 'at'>[]> {
    const range = { $gte: from, $lt: to }

    return this.db
      .collection(TRAININGS_COLLECTION)
      .aggregate<Pick<SrsEffect, 'expressionId' | 'at'>>([
        { $match: { userId, 'srsEffects.at': range } },
        { $unwind: '$srsEffects' },
        { $match: { 'srsEffects.at': range } },
        { $project: { _id: 0, expressionId: '$srsEffects.expressionId', at: '$srsEffects.at' } },
      ])
      .toArray()
  }

  async scoreEffectsSince(userId: string, from: Date): Promise<ScoreEffect[]> {
    const range = { $gte: from }

    return this.db
      .collection(TRAININGS_COLLECTION)
      .aggregate<ScoreEffect>([
        { $match: { userId, 'srsEffects.at': range } },
        { $unwind: '$srsEffects' },
        { $match: { 'srsEffects.at': range } },
        {
          $project: {
            _id: 0,
            expressionId: '$srsEffects.expressionId',
            at: '$srsEffects.at',
            before: { score: '$srsEffects.before.score' },
            after: { score: '$srsEffects.after.score' },
          },
        },
      ])
      .toArray()
  }

  async completedChatAverages(userId: string): Promise<FinalAssessmentAverages[]> {
    const docs = await this.db
      .collection(TRAININGS_COLLECTION)
      .find({ userId, type: 'chat', status: 'COMPLETED', finalAssessment: { $exists: true } })
      .project<{ finalAssessment: { averages: FinalAssessmentAverages } }>({ _id: 0, 'finalAssessment.averages': 1 })
      .toArray()

    return docs.map(({ finalAssessment }) => finalAssessment.averages)
  }

  async count(userId: string, status: TrainingStatus): Promise<number> {
    return this.db.collection(TRAININGS_COLLECTION).countDocuments({ userId, status })
  }

  async listEffectsForExpression(userId: string, expressionId: string): Promise<ExpressionHistoryItem[]> {
    const mine = { 'srsEffects.expressionId': expressionId }

    return this.db
      .collection(TRAININGS_COLLECTION)
      .aggregate<ExpressionHistoryItem>([
        { $match: { userId, ...mine } },
        { $unwind: '$srsEffects' },
        { $match: mine },
        {
          $project: {
            _id: 0,
            trainingId: { $toString: '$_id' },
            type: '$type',
            status: '$status',
            scoreWritten: '$srsEffects.scoreWritten',
            before: '$srsEffects.before',
            after: '$srsEffects.after',
            at: '$srsEffects.at',
          },
        },
        { $sort: { at: -1 } },
      ])
      .toArray()
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
