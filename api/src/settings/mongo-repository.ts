import type { Db } from 'mongodb'
import { settingsSchema, type Settings } from '@contracts'
import type { SettingsRepository } from './repository'

export const SETTINGS_COLLECTION = 'settings'

export class MongoSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  async get(userId: string): Promise<Settings> {
    const doc = await this.db.collection(SETTINGS_COLLECTION).findOne({ userId })

    return settingsSchema.parse(doc ?? {})
  }

  async put(userId: string, settings: Settings): Promise<Settings> {
    await this.db
      .collection(SETTINGS_COLLECTION)
      .updateOne({ userId }, { $set: { userId, ...settings } }, { upsert: true })

    return settings
  }
}
