import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  chatTurnResponseSchema,
  type Assessment,
  type ChatTraining,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const OPENING = 'Morning — how did yesterday go on the payments ticket?'
const REPLY = 'Nice one. Did the client come back with numbers yet?'

const category = { score: 8, messageWithSuggestions: 'I broke the ice with the client.' }

const assessment = (targetExpressionCorrectness: Assessment['targetExpressionCorrectness'] = {}): Assessment => ({
  grammar: category,
  vocabularyDiversity: category,
  sentenceComplexity: category,
  sentenceNaturalness: category,
  targetExpressionCorrectness,
})

const USED = {
  score: 9,
  messageWithSuggestions: 'I broke the ice with the client.',
  correctVersion: 'I broke the ice by asking about their weekend.',
}

const training = (overrides: Partial<ChatTraining> = {}): ChatTraining => ({
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [
    { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
    { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
  ],
  messages: [{ role: 'assistant', content: OPENING, createdAt: NOW }],
  createdAt: NOW,
  ...overrides,
})

const send = async (
  body: unknown,
  llm = new FakeLlmGateway({ replies: [REPLY], assessments: [assessment()] }),
  existing: Training = training(),
) => {
  const stored: Training[] = [existing]
  const deps = testDeps({ llm, trainings: new InMemoryTrainingRepository(stored) })
  const res = await createApp(deps).request(`/trainings/${existing.id}/messages`, {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return { res, llm, stored: stored[0] as ChatTraining }
}

const CONTENT = 'I broke the ice with the client yesterday.'

describe('POST /trainings/:id/messages', () => {
  it('answers with the tutor reply and the assessment of the message just sent', async () => {
    const { res } = await send({ content: CONTENT })

    expect(res.status).toBe(200)
    const turn = chatTurnResponseSchema.parse(await res.json())
    expect(turn.reply).toEqual({ role: 'assistant', content: REPLY, createdAt: NOW })
    expect(turn.assessment.grammar.score).toBe(8)
  })

  it('appends the message and the reply to the conversation as one turn', async () => {
    const { stored } = await send({ content: CONTENT })

    expect(stored.messages).toEqual([
      { role: 'assistant', content: OPENING, createdAt: NOW },
      { role: 'user', content: CONTENT, createdAt: NOW, assessment: assessment() },
      { role: 'assistant', content: REPLY, createdAt: NOW },
    ])
  })

  it('asks the tutor and the assessor about the same message, in the context and style of the session', async () => {
    const { llm } = await send({ content: CONTENT })

    const targets = training().targets
    expect(llm.replyCalls).toEqual([
      {
        context: 'a scrum standup',
        style: 'informal',
        targets,
        history: [{ role: 'assistant', content: OPENING, createdAt: NOW }],
        userContent: CONTENT,
      },
    ])
    expect(llm.assessmentCalls).toEqual([
      { context: 'a scrum standup', style: 'informal', targets, userContent: CONTENT },
    ])
  })

  it('keeps only the targets of this session when the assessor invents a key', async () => {
    const invented = assessment({ 'break the ice': USED, 'jump the gun': USED })

    const { res, stored } = await send(
      { content: CONTENT },
      new FakeLlmGateway({ replies: [REPLY], assessments: [invented] }),
    )

    const turn = chatTurnResponseSchema.parse(await res.json())
    expect(Object.keys(turn.assessment.targetExpressionCorrectness)).toEqual(['break the ice'])
    expect(Object.keys(stored.messages[1]?.assessment?.targetExpressionCorrectness ?? {})).toEqual(['break the ice'])
  })

  it('takes the reply of a second attempt when the first one fails', async () => {
    const { res, stored } = await send(
      { content: CONTENT },
      new FakeLlmGateway({ replies: [new Error('timeout'), REPLY], assessments: [assessment()] }),
    )

    expect(res.status).toBe(200)
    expect(stored.messages).toHaveLength(3)
  })

  it('saves nothing when the tutor cannot be reached twice', async () => {
    const { res, stored } = await send(
      { content: CONTENT },
      new FakeLlmGateway({
        replies: [new Error('timeout'), new Error('timeout')],
        assessments: [assessment()],
      }),
    )

    expect(res.status).toBe(502)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('LLM_UNAVAILABLE')
    expect(stored.messages).toHaveLength(1)
  })

  it('saves nothing when the assessment cannot be reached twice', async () => {
    const { res, stored } = await send(
      { content: CONTENT },
      new FakeLlmGateway({
        replies: [REPLY, REPLY],
        assessments: [new Error('timeout'), new Error('timeout')],
      }),
    )

    expect(res.status).toBe(502)
    expect(stored.messages).toHaveLength(1)
  })

  it('refuses to add a turn to a session that is already over', async () => {
    const { res, stored } = await send(
      { content: CONTENT },
      new FakeLlmGateway({ replies: [REPLY], assessments: [assessment()] }),
      training({ status: 'COMPLETED', completedAt: NOW }),
    )

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
    expect(stored.messages).toHaveLength(1)
  })

  it('answers 404 for a training that does not exist', async () => {
    const deps = testDeps()
    const res = await createApp(deps).request('/trainings/nope/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: CONTENT }),
    })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it.each([
    ['an empty message', { content: '   ' }],
    ['a message over 2000 characters', { content: 'a'.repeat(2001) }],
    ['a body without content', {}],
  ])('refuses %s without calling the tutor', async (_name, body) => {
    const { res, llm } = await send(body)

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
    expect(llm.replyCalls).toEqual([])
  })

  it('rejects a caller without a token', async () => {
    const res = await createApp(testDeps()).request('/trainings/t1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: CONTENT }),
    })

    expect(res.status).toBe(401)
  })
})
