import { handle } from 'hono/aws-lambda'
import { createApp } from './app'
import { loadConfig } from './config'
import { createClient } from './mongo/client'
import { realDeps } from './real-deps'

const config = loadConfig(process.env)

// One client per container, connected lazily: an unreachable database degrades /health to
// `db: down` instead of failing init and turning every route into a 502.
const db = createClient(config.MONGO_URI).db(config.MONGO_DB)

export const handler = handle(createApp(realDeps(db, config)))
