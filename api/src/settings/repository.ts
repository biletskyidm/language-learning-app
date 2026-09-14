import type { Settings } from '@contracts'

export interface SettingsRepository {
  get(userId: string): Promise<Settings>
  put(userId: string, settings: Settings): Promise<Settings>
}
