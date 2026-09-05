import type { Db } from 'mongodb'
import { SecretTokenVerifier } from './auth/token-verifier'
import type { Config } from './config'
import type { Deps } from './deps'
import { MongoExpressionRepository } from './expressions/mongo-repository'
import { MongoDbHealth } from './health/mongo-db-health'
import { InMemoryScenarioRepository } from './scenarios/memory-repository'
import { InMemorySettingsRepository } from './settings/memory-repository'
import { InMemoryTrainingRepository } from './trainings/memory-repository'

export const realDeps = (db: Db, config: Config): Deps => {
  const clock = () => new Date()

  return {
    db: new MongoDbHealth(db),
    expressions: new MongoExpressionRepository(db),
    trainings: new InMemoryTrainingRepository(),
    settings: new InMemorySettingsRepository(),
    scenarios: new InMemoryScenarioRepository(),
    llm: {},
    tokenVerifier: new SecretTokenVerifier(config.AUTH_SECRET, clock),
    clock,
    userId: config.USER_ID,
  }
}
