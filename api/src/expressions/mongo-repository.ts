import type { Db } from 'mongodb'
import type { Expression, ExpressionListQuery } from '@contracts'
import { toDomain } from './mapper'
import type { ExpressionRepository } from './repository'

export const EXPRESSIONS_COLLECTION = 'expressions'

type Regex = { $regex: string; $options: 'i' }

export type ExpressionListFilter = {
  userId: string
  $or?: [{ expression: Regex }, { meaning: Regex }]
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const listFilter = (userId: string, { search }: ExpressionListQuery): ExpressionListFilter => {
  const needle = search?.trim()
  if (!needle) return { userId }

  const $regex = escapeRegex(needle)
  return {
    userId,
    $or: [
      { expression: { $regex, $options: 'i' } },
      { meaning: { $regex, $options: 'i' } },
    ],
  }
}

export class MongoExpressionRepository implements ExpressionRepository {
  constructor(private readonly db: Db) {}

  async countAll(): Promise<number> {
    return this.db.collection(EXPRESSIONS_COLLECTION).countDocuments()
  }

  async list(userId: string, query: ExpressionListQuery): Promise<Expression[]> {
    const docs = await this.db
      .collection(EXPRESSIONS_COLLECTION)
      .find(listFilter(userId, query))
      .sort({ createdAt: -1 })
      .toArray()

    return docs.map(toDomain)
  }
}
