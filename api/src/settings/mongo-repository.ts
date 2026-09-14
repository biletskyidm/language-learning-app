import type { Db } from 'mongodb'
import { settingsSchema, type Settings } from '@contracts'
import type { SettingsRepository } from './repository'

export const SETTINGS_COLLECTION = 'settings'

type SettingsDoc = Settings & { _id: string; userId: string }

export class MongoSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  async get(userId: string): Promise<Settings> {
    const doc = await this.db.collection<SettingsDoc>(SETTINGS_COLLECTION).findOne({ _id: userId })

    return settingsSchema.parse(doc ?? {})
  }

  async put(userId: string, settings: Settings): Promise<Settings> {
    await this.db
      .collection<SettingsDoc>(SETTINGS_COLLECTION)
      .updateOne({ _id: userId }, { $set: { userId, ...settings } }, { upsert: true })

    return settings
  }
}
