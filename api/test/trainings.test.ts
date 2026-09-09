import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  chatTrainingSchema,
  PICK_LIMIT_DEFAULT,
  PICK_LIMIT_MAX,
  type Expression,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const OPENING = 'Morning — how did yesterday go on the payments ticket?'

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
  ...overrides,
})

const VOCABULARY = [
  expression(),
  expression({ id: 'e2', expression: 'touch base', meaning: 'to make brief contact', frequency: 'very_common' }),
  expression({ id: 'e3', expression: 'ballpark figure', meaning: 'a rough estimate', frequency: 'moderate' }),
]

const start = async (body: unknown, llm = new FakeLlmGateway({ firstMessages: [OPENING] }), expressions = VOCABULARY) => {
  const stored: Training[] = []
  const deps = testDeps({
    llm,
    expressions: new InMemoryExpressionRepository([...expressions]),
    trainings: new InMemoryTrainingRepository(stored),
  })
  const app = createApp(deps)
  const res = await app.request('/trainings', {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return { res, llm, app, deps, stored }
}

const chat = { type: 'chat' as const, context: 'a scrum standup', style: 'informal' as const }

describe('POST /trainings', () => {
  it('snapshots the text and meaning of the expressions it was handed', async () => {
    const { res } = await start({ ...chat, expressionIds: ['e3', 'e1'] })

    expect(res.status).toBe(201)
    const training = chatTrainingSchema.parse(await res.json())
    expect(training.targets).toEqual([
      { expressionId: 'e3', expression: 'ballpark figure', meaning: 'a rough estimate' },
      { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
    ])
  })

  it('opens the training as active, in the given context and style', async () => {
    const { res } = await start({ ...chat, expressionIds: ['e1'] })

    expect(chatTrainingSchema.parse(await res.json())).toMatchObject({
      type: 'chat',
      status: 'ACTIVE',
      context: 'a scrum standup',
      style: 'informal',
      userId: 'me',
      createdAt: NOW,
    })
  })

  it('lets the picker choose when no expressions are named, up to the limit asked for', async () => {
    const { res } = await start({ ...chat, limit: 2 })

    const training = chatTrainingSchema.parse(await res.json())
    expect(training.targets.map((target) => target.expression)).toEqual(['touch base', 'break the ice'])
  })

  it('falls back to the default target count when no limit is given', async () => {
    const plenty = Array.from({ length: 8 }, (_, i) => expression({ id: `x${i}`, expression: `phrase ${i}` }))

    const { res } = await start({ ...chat }, new FakeLlmGateway({ firstMessages: [OPENING] }), plenty)

    expect(chatTrainingSchema.parse(await res.json()).targets).toHaveLength(PICK_LIMIT_DEFAULT)
  })

  it('refuses an expression id that is not in the vocabulary', async () => {
    const { res, llm } = await start({ ...chat, expressionIds: ['e1', 'missing'] })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('EXPRESSION_NOT_FOUND')
    expect(llm.firstMessageCalls).toEqual([])
  })

  it('persists the tutor opening line as the first assistant message', async () => {
    const { res } = await start({ ...chat, expressionIds: ['e1'] })

    expect(chatTrainingSchema.parse(await res.json()).messages).toEqual([
      { role: 'assistant', content: OPENING, createdAt: NOW },
    ])
  })

  it('asks the tutor for an opening line in the context, style and targets of the session', async () => {
    const { llm } = await start({ ...chat, expressionIds: ['e1'] })

    expect(llm.firstMessageCalls).toEqual([
      {
        context: 'a scrum standup',
        style: 'informal',
        targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
      },
    ])
  })

  it('saves nothing when the tutor cannot be reached', async () => {
    const { res, stored } = await start(
      { ...chat, expressionIds: ['e1'] },
      new FakeLlmGateway({ firstMessages: [new Error('timeout')] }),
    )

    expect(res.status).toBe(502)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('LLM_UNAVAILABLE')
    expect(stored).toEqual([])
  })

  it.each([
    ['an empty context', { ...chat, context: '  ' }],
    ['a context over 500 characters', { ...chat, context: 'a'.repeat(501) }],
    ['an unknown style', { ...chat, style: 'chatty' }],
    ['a training type that does not exist yet', { ...chat, type: 'gaps' }],
    ['an empty list of expression ids', { ...chat, expressionIds: [] }],
    [
      'more expression ids than a session can hold',
      { ...chat, expressionIds: Array.from({ length: PICK_LIMIT_MAX + 1 }, (_, i) => `e${i}`) },
    ],
  ])('refuses %s', async (_name, body) => {
    const { res } = await start(body)

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a caller without a token', async () => {
    const res = await createApp(testDeps()).request('/trainings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat),
    })

    expect(res.status).toBe(401)
  })
})

describe('GET /trainings/:id', () => {
  it('gives back the training that was just started', async () => {
    const { res, app, deps } = await start({ ...chat, expressionIds: ['e1'] })
    const { id } = chatTrainingSchema.parse(await res.json())

    const found = await app.request(`/trainings/${id}`, {
      headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
    })

    expect(found.status).toBe(200)
    expect(chatTrainingSchema.parse(await found.json()).id).toBe(id)
  })

  it('answers 404 for a training that does not exist', async () => {
    const { app, deps } = await start({ ...chat, expressionIds: ['e1'] })

    const found = await app.request('/trainings/nope', {
      headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
    })

    expect(found.status).toBe(404)
    expect(apiErrorSchema.parse(await found.json()).error.code).toBe('NOT_FOUND')
  })
})
