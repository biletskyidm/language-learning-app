import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { SecretTokenVerifier } from './auth/token-verifier'
import { loadConfig } from './config'
import { InMemoryScenarioRepository } from './scenarios/memory-repository'
import { InMemorySettingsRepository } from './settings/memory-repository'
import { InMemoryTrainingRepository } from './trainings/memory-repository'
import { MongoExpressionRepository } from './expressions/mongo-repository'
import { MongoDbHealth } from './health/mongo-db-health'
import { connect } from './mongo/client'

const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)

const config = loadConfig(process.env)
const clock = () => new Date()
const { db } = await connect(config.MONGO_URI, config.MONGO_DB)

const expressions = new MongoExpressionRepository(db)
console.log(`connected to database "${db.databaseName}" (${await expressions.countAll()} expressions)`)

const app = createApp({
  db: new MongoDbHealth(db),
  expressions,
  trainings: new InMemoryTrainingRepository(),
  settings: new InMemorySettingsRepository(),
  scenarios: new InMemoryScenarioRepository(),
  llm: {},
  tokenVerifier: new SecretTokenVerifier(config.AUTH_SECRET, clock),
  clock,
  userId: config.USER_ID,
})

serve({ fetch: app.fetch, hostname: '0.0.0.0', port: config.PORT }, ({ port }) =>
  console.log(`api listening on http://0.0.0.0:${port}`),
)
