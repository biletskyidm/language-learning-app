import type { Db } from 'mongodb'
import type { DbHealth } from '../deps'

const PING_TIMEOUT_MS = 1000

export class MongoDbHealth implements DbHealth {
  constructor(private readonly db: Db) {}

  async ping(): Promise<boolean> {
    try {
      await this.db.command({ ping: 1 }, { timeoutMS: PING_TIMEOUT_MS })
      return true
    } catch {
      return false
    }
  }
}
