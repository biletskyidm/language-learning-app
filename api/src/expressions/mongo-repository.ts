import { ObjectId, type Db, type Document } from 'mongodb'
import type { Expression, Frequency } from '@contracts'
import { toDomain } from './mapper'
import type { ExpressionListParams, ExpressionRepository } from './repository'

export const EXPRESSIONS_COLLECTION = 'expressions'

type Regex = { $regex: string; $options: 'i' }

export type ExpressionListFilter = {
  userId: string
  $or?: [{ expression: Regex }, { meaning: Regex }]
  tags?: string
  frequency?: Frequency
  nextTrainingAt?: { $lte: Date }
}

export type ExpressionIdFilter = { userId: string; _id: ObjectId }

/** An id the driver would reject is not a lookup failure worth a 500 — it is simply nothing to find. */
export const idFilter = (userId: string, id: string): ExpressionIdFilter | undefined =>
  ObjectId.isValid(id) ? { userId, _id: new ObjectId(id) } : undefined

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const listFilter = (userId: string, query: ExpressionListParams): ExpressionListFilter => {
  const filter: ExpressionListFilter = { userId }
  const needle = query.search?.trim()

  if (needle) {
    const $regex = escapeRegex(needle)
    filter.$or = [
      { expression: { $regex, $options: 'i' } },
      { meaning: { $regex, $options: 'i' } },
    ]
  }
  if (query.tag) filter.tags = query.tag
  if (query.frequency) filter.frequency = query.frequency
  if (query.due) filter.nextTrainingAt = { $lte: query.now }

  return filter
}

export const listPipeline = (userId: string, query: ExpressionListParams): Document[] => {
  const stages: Document[] = [{ $match: listFilter(userId, query) }]
  const direction = query.dir === 'asc' ? 1 : -1

  if (query.sort === 'createdAt') {
    stages.push({ $sort: { createdAt: direction, _id: 1 } })
  } else if (query.sort === 'timesPracticed') {
    stages.push(
      { $addFields: { _sortKey: { $ifNull: ['$timesPracticed', 0] } } },
      { $sort: { _sortKey: direction, _id: 1 } },
      { $unset: '_sortKey' },
    )
  } else {
    stages.push(
      { $addFields: { _missing: { $cond: [{ $eq: [{ $ifNull: [`$${query.sort}`, null] }, null] }, 1, 0] } } },
      { $sort: { _missing: 1, [query.sort]: direction, _id: 1 } },
      { $unset: '_missing' },
    )
  }

  return stages
}

export class MongoExpressionRepository implements ExpressionRepository {
  constructor(private readonly db: Db) {}

  async countAll(): Promise<number> {
    return this.db.collection(EXPRESSIONS_COLLECTION).countDocuments()
  }

  async list(userId: string, query: ExpressionListParams): Promise<Expression[]> {
    const docs = await this.db
      .collection(EXPRESSIONS_COLLECTION)
      .aggregate(listPipeline(userId, query))
      .toArray()

    return docs.map((doc) => toDomain(doc as Parameters<typeof toDomain>[0]))
  }

  async findById(userId: string, id: string): Promise<Expression | undefined> {
    const filter = idFilter(userId, id)
    if (!filter) return undefined

    const doc = await this.db.collection(EXPRESSIONS_COLLECTION).findOne(filter)

    return doc ? toDomain(doc as Parameters<typeof toDomain>[0]) : undefined
  }

  async tags(userId: string): Promise<string[]> {
    const tags = await this.db.collection(EXPRESSIONS_COLLECTION).distinct('tags', { userId })

    return tags.filter((tag): tag is string => typeof tag === 'string').sort()
  }
}
