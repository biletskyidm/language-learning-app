import { describe, expect, it } from 'vitest'
import { lambdaEnvironment } from '../lib/environment'

const required = {
  AUTH_SECRET: 'a'.repeat(64),
  USER_ID: 'me',
  MONGO_URI: 'mongodb+srv://example',
  MONGO_DB: 'lang-learning',
}

describe('lambdaEnvironment', () => {
  it('passes the required variables through', () => {
    expect(lambdaEnvironment(required)).toMatchObject(required)
  })

  it('omits unset optional variables instead of passing empty strings the API rejects', () => {
    const environment = lambdaEnvironment({ ...required, LANGSMITH_TRACING: '' })
    expect(environment).not.toHaveProperty('LANGSMITH_TRACING')
    expect(environment).not.toHaveProperty('OPENROUTER_API_KEY')
  })

  it('keeps LLM values that are set', () => {
    expect(lambdaEnvironment({ ...required, REPLY_MODEL: 'gpt5.6-luna' })).toMatchObject({
      REPLY_MODEL: 'gpt5.6-luna',
    })
  })

  it('fails loudly when a required variable is missing', () => {
    expect(() => lambdaEnvironment({ ...required, MONGO_URI: undefined })).toThrow(/MONGO_URI/)
  })
})
