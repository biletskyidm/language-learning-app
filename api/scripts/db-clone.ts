import { existsSync } from 'node:fs'
import { loadConfig } from '../src/config'
import { EXPRESSIONS_COLLECTION } from '../src/expressions/mongo-repository'
import { connect } from '../src/mongo/client'

const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)

const config = loadConfig(process.env)
const sandboxUri = process.env.SANDBOX_MONGO_URI ?? 'mongodb://localhost:27017'

const source = await connect(config.MONGO_URI, config.MONGO_DB)
const sandbox = await connect(sandboxUri, config.MONGO_DB)

const docs = await source.db.collection(EXPRESSIONS_COLLECTION).find().toArray()
await sandbox.db.collection(EXPRESSIONS_COLLECTION).deleteMany({})
if (docs.length) await sandbox.db.collection(EXPRESSIONS_COLLECTION).insertMany(docs)

console.log(`copied ${docs.length} expressions into ${sandboxUri}/${config.MONGO_DB}`)

await Promise.all([source.client.close(), sandbox.client.close()])
