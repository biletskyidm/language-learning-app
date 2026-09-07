import { existsSync } from 'node:fs'
import { loadConfig } from '../src/config'
import { migrateExpressions } from '../src/expressions/migration'
import { EXPRESSIONS_COLLECTION } from '../src/expressions/mongo-repository'
import { connect } from '../src/mongo/client'

const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)

const dryRun = process.argv.includes('--dry-run')
const config = loadConfig(process.env)
const { client, db } = await connect(config.MONGO_URI, config.MONGO_DB)

console.log(
  `${dryRun ? 'dry run' : 'migrating'}: database "${db.databaseName}", collection "${EXPRESSIONS_COLLECTION}", userId "${config.USER_ID}"`,
)

const report = await migrateExpressions(db.collection(EXPRESSIONS_COLLECTION), config.USER_ID, { dryRun })

console.log(`  userId stamped:     ${report.ownership}`)
console.log(`  tags defaulted:     ${report.tags}`)
console.log(`  examples defaulted: ${report.examples}`)
if (dryRun) console.log('nothing written — re-run without --dry-run to apply')

await client.close()
