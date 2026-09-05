import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'
import { ApiStack } from '../lib/api-stack'
import { lambdaEnvironment } from '../lib/environment'

const environment = lambdaEnvironment({
  AUTH_SECRET: 'a'.repeat(64),
  USER_ID: 'me',
  MONGO_URI: 'mongodb+srv://example',
  MONGO_DB: 'lang-learning',
})

// Bundling is skipped so the assertions run without invoking esbuild; `pnpm --filter infra synth` covers the real bundle.
const template = () =>
  Template.fromStack(
    new ApiStack(new App({ context: { 'aws:cdk:bundling-stacks': [] } }), 'TestStack', { environment }),
  )

describe('ApiStack', () => {
  it('deploys exactly one Node 22 ARM64 function sized for two parallel LLM calls', () => {
    template().hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'lang-learning-api-ts',
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      MemorySize: 1024,
      Timeout: 60,
    })
    template().resourceCountIs('AWS::Lambda::Function', 1)
  })

  it('exposes it through a single public Function URL', () => {
    template().hasResourceProperties('AWS::Lambda::Url', { AuthType: 'NONE' })
    template().resourceCountIs('AWS::Lambda::Url', 1)
  })

  it('outputs the Function URL and nothing else', () => {
    expect(Object.keys(template().findOutputs('*'))).toEqual(['ApiUrl'])
  })

  it('wires every environment variable the API reads', () => {
    template().hasResourceProperties('AWS::Lambda::Function', {
      Environment: { Variables: Match.objectLike(environment) },
    })
  })
})
