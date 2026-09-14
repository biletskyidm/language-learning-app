import { settingsSchema, type Settings } from '@contracts'
import type { SettingsRepository } from './repository'

export class InMemorySettingsRepository implements SettingsRepository {
  constructor(private readonly settings = new Map<string, Settings>()) {}

  async get(userId: string): Promise<Settings> {
    return settingsSchema.parse(this.settings.get(userId) ?? {})
  }

  async put(userId: string, settings: Settings): Promise<Settings> {
    this.settings.set(userId, settings)

    return settings
  }
}
