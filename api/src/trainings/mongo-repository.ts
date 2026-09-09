import { ObjectId, type Db } from 'mongodb'
import type { ChatMessage, Training } from '@contracts'
import { toDomain } from './mapper'
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

  async appendMessages(userId: string, id: string, messages: ChatMessage[]): Promise<Training> {
    const filter = idFilter(userId, id)
    if (!filter) throw new Error(`No training ${id} to append to`)

    const doc = await this.db
      .collection<{ messages: ChatMessage[] }>(TRAININGS_COLLECTION)
      .findOneAndUpdate(filter, { $push: { messages: { $each: messages } } }, { returnDocument: 'after' })
    if (!doc) throw new Error(`No training ${id} to append to`)

    return toDomain(doc as Parameters<typeof toDomain>[0])
  }

  async findById(userId: string, id: string): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(TRAININGS_COLLECTION).findOne(filter)

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }
}
