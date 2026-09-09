import { ObjectId, type Db } from 'mongodb'
import type { Training } from '@contracts'
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

  async findById(userId: string, id: string): Promise<Training | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(TRAININGS_COLLECTION).findOne(filter)

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }
}
