import { existsSync } from 'node:fs'
import { App } from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack'
import { lambdaEnvironment } from '../lib/environment'

const envFile = new URL('../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)

new ApiStack(new App(), 'LanguageLearningApiTsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  environment: lambdaEnvironment(process.env),
})
