import type { CreateScenarioInput, Scenario, UpdateScenarioInput } from '@contracts'

export interface ScenarioRepository {
  list(userId: string): Promise<Scenario[]>
  findById(userId: string, id: string): Promise<Scenario | undefined>
  create(userId: string, input: CreateScenarioInput, createdAt: Date): Promise<Scenario>
  /** Idempotent per name, so two first reads racing each other still leave one set of defaults. */
  seedDefaults(userId: string, presets: CreateScenarioInput[], createdAt: Date): Promise<Scenario[]>
  update(userId: string, id: string, patch: UpdateScenarioInput): Promise<Scenario | undefined>
  delete(userId: string, id: string): Promise<boolean>
}
