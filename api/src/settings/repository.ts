import type { Settings } from '@contracts'

export interface SettingsRepository {
  /** Answers with the defaults for a user who has never saved any. */
  get(userId: string): Promise<Settings>
  put(userId: string, settings: Settings): Promise<Settings>
}
