import { describe, expect, it } from 'vitest'
import { apiErrorSchema, expressionDraftSchema, type ExpressionDraft } from '@contracts'
import { createApp } from '../src/app'
import { bearer, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const DRAFT: ExpressionDraft = {
  type: 'idiom',
  partOfSpeech: 'verb',
  meaning: 'to do something in the easiest, cheapest way',
  examples: ['They cut corners to ship on time.'],
  tags: ['work'],
  frequency: 'common',
}

const draft = async (body: unknown, llm = new FakeLlmGateway([DRAFT])) => {
  const deps = testDeps({ llm })
  const res = await createApp(deps).request('/expressions/from-text', {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return { res, llm }
}

describe('POST /expressions/from-text', () => {
  it('drafts the fields for the text it was given, without saving anything', async () => {
    const { res, llm } = await draft({ text: 'cut corners' })

    expect(res.status).toBe(200)
    expect(expressionDraftSchema.parse(await res.json())).toEqual(DRAFT)
    expect(llm.draftCalls).toEqual(['cut corners'])
  })

  it('refuses empty text', async () => {
    const { res } = await draft({ text: '   ' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('refuses text longer than 200 characters', async () => {
    const { res } = await draft({ text: 'a'.repeat(201) })

    expect(res.status).toBe(400)
  })

  it('retries once, so a single flaky call still answers with a draft', async () => {
    const { res, llm } = await draft({ text: 'cut corners' }, new FakeLlmGateway([new Error('timeout'), DRAFT]))

    expect(res.status).toBe(200)
    expect(llm.draftCalls).toEqual(['cut corners', 'cut corners'])
  })

  it('gives up after the retry', async () => {
    const { res } = await draft(
      { text: 'cut corners' },
      new FakeLlmGateway([new Error('timeout'), new Error('timeout')]),
    )

    expect(res.status).toBe(502)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('LLM_UNAVAILABLE')
  })

  it('rejects a caller without a token', async () => {
    const res = await createApp(testDeps()).request('/expressions/from-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'cut corners' }),
    })

    expect(res.status).toBe(401)
  })
})
