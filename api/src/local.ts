import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadConfig } from './config'
import { connect } from './mongo/client'
import { realDeps } from './real-deps'

const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)

const config = loadConfig(process.env)
const { db } = await connect(config.MONGO_URI, config.MONGO_DB)
const deps = realDeps(db, config)

console.log(`connected to database "${db.databaseName}" (${await deps.expressions.countAll()} expressions)`)

const app = createApp(deps)

serve({ fetch: app.fetch, hostname: '0.0.0.0', port: config.PORT }, ({ port }) =>
  console.log(`api listening on http://0.0.0.0:${port}`),
)
