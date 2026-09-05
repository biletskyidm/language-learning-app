import type { Db } from 'mongodb'
import type { ExpressionRepository } from './repository'

export const EXPRESSIONS_COLLECTION = 'expressions'

export class MongoExpressionRepository implements ExpressionRepository {
  constructor(private readonly db: Db) {}

  async countAll(): Promise<number> {
    return this.db.collection(EXPRESSIONS_COLLECTION).countDocuments()
  }
}
