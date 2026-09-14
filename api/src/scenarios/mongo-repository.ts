import { ObjectId, type Db } from 'mongodb'
import { scenarioSchema, type CreateScenarioInput, type Scenario, type UpdateScenarioInput } from '@contracts'
import type { ScenarioRepository } from './repository'

export const SCENARIOS_COLLECTION = 'scenarios'

type ScenarioDoc = { _id: ObjectId } & Record<string, unknown>

const toDomain = ({ _id, ...rest }: ScenarioDoc): Scenario => scenarioSchema.parse({ ...rest, id: _id.toHexString() })

/** An id the driver would reject is not a lookup failure worth a 500 — it is simply nothing to find. */
const idFilter = (userId: string, id: string) => (ObjectId.isValid(id) ? { userId, _id: new ObjectId(id) } : undefined)

export class MongoScenarioRepository implements ScenarioRepository {
  constructor(private readonly db: Db) {}

  async list(userId: string): Promise<Scenario[]> {
    const docs = await this.db
      .collection(SCENARIOS_COLLECTION)
      .find({ userId })
      .sort({ createdAt: 1, _id: 1 })
      .toArray()

    return docs.map((doc) => toDomain(doc as ScenarioDoc))
  }

  async findById(userId: string, id: string): Promise<Scenario | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(SCENARIOS_COLLECTION).findOne(filter)

    return doc ? toDomain(doc as ScenarioDoc) : undefined
  }

  async create(userId: string, input: CreateScenarioInput, createdAt: Date): Promise<Scenario> {
    const doc = { userId, createdAt, ...input }
    const { insertedId } = await this.db.collection(SCENARIOS_COLLECTION).insertOne(doc)

    return toDomain({ ...doc, _id: insertedId })
  }

  async update(userId: string, id: string, patch: UpdateScenarioInput): Promise<Scenario | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined
    if (!Object.keys(patch).length) return this.findById(userId, id)

    const doc = await this.db
      .collection(SCENARIOS_COLLECTION)
      .findOneAndUpdate(filter, { $set: patch }, { returnDocument: 'after' })

    return doc ? toDomain(doc as ScenarioDoc) : undefined
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const filter = idFilter(userId, id)
    if (!filter) return false

    const { deletedCount } = await this.db.collection(SCENARIOS_COLLECTION).deleteOne(filter)

    return deletedCount === 1
  }
}
