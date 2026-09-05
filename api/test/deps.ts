import { SecretTokenVerifier } from '../src/auth/token-verifier'
import type { Deps } from '../src/deps'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryScenarioRepository } from '../src/scenarios/memory-repository'
import { InMemorySettingsRepository } from '../src/settings/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'

export const NOW = new Date('2026-01-01T00:00:00.000Z')
export const TEST_SECRET = 'a'.repeat(64)

export const testDeps = (overrides: Partial<Deps> = {}): Deps => {
  const clock = overrides.clock ?? (() => NOW)

  return {
    db: { ping: async () => true },
    expressions: new InMemoryExpressionRepository(),
    trainings: new InMemoryTrainingRepository(),
    settings: new InMemorySettingsRepository(),
    scenarios: new InMemoryScenarioRepository(),
    llm: {},
    tokenVerifier: new SecretTokenVerifier(TEST_SECRET, clock),
    clock,
    userId: 'me',
    ...overrides,
  }
}
