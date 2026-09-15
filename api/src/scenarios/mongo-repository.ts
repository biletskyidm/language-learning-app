import { ObjectId, type Db } from 'mongodb'
import { scenarioSchema, type CreateScenarioInput, type Scenario, type UpdateScenarioInput } from '@contracts'
import type { ScenarioRepository } from './repository'

export const SCENARIOS_COLLECTION = 'scenarios'

/**
 * Seeded presets carry a `seedKey` that the user can never change, and the index covers only those
 * docs — so the upserts below converge on one set of defaults without constraining the names of
 * scenarios the user creates or renames himself.
 */
export const SEED_INDEX = {
  name: 'userId_seedKey_unique',
  keys: { userId: 1, seedKey: 1 } as const,
  partialFilterExpression: { seedKey: { $exists: true } },
}

const DUPLICATE_KEY = 11000

const isDuplicateKey = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const { code, writeErrors } = error as { code?: unknown; writeErrors?: { code?: unknown }[] }

  if (code === DUPLICATE_KEY) return true

  return Array.isArray(writeErrors) && writeErrors.length > 0 && writeErrors.every((e) => e.code === DUPLICATE_KEY)
}

type ScenarioDoc = { _id: ObjectId } & Record<string, unknown>

const toDomain = ({ _id, ...rest }: ScenarioDoc): Scenario => scenarioSchema.parse({ ...rest, id: _id.toHexString() })

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

  async seedDefaults(userId: string, presets: CreateScenarioInput[], createdAt: Date): Promise<Scenario[]> {
    const collection = this.db.collection(SCENARIOS_COLLECTION)
    await collection.createIndex(SEED_INDEX.keys, { ...SEED_INDEX, unique: true })

    try {
      await collection.bulkWrite(
        presets.map((preset) => ({
          updateOne: {
            filter: { userId, seedKey: preset.name },
            update: { $setOnInsert: { userId, createdAt, seedKey: preset.name, ...preset } },
            upsert: true,
          },
        })),
        { ordered: false },
      )
    } catch (error) {
      if (!isDuplicateKey(error)) throw error
    }

    return this.list(userId)
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
