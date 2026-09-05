import type { Deps } from '../src/deps'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryScenarioRepository } from '../src/scenarios/memory-repository'
import { InMemorySettingsRepository } from '../src/settings/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'

export const testDeps = (overrides: Partial<Deps> = {}): Deps => ({
  db: { ping: async () => true },
  expressions: new InMemoryExpressionRepository(),
  trainings: new InMemoryTrainingRepository(),
  settings: new InMemorySettingsRepository(),
  scenarios: new InMemoryScenarioRepository(),
  llm: {},
  tokenVerifier: {},
  clock: () => new Date('2026-01-01T00:00:00.000Z'),
  userId: 'me',
  ...overrides,
})
