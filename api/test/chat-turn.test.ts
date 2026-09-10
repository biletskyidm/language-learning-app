import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  chatTurnResponseSchema,
  type Assessment,
  type ChatMessage,
  type ChatTraining,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import type { TutorReplyInput } from '../src/deps'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const OPENING = 'Morning — how did yesterday go on the payments ticket?'
const REPLY = 'Nice one. Did the client come back with numbers yet?'

const category = { score: 8, feedback: 'The tenses hold up.', suggestions: 'I broke the ice with the client.' }

const OVERALL = { strengths: 'You opened confidently.', areasForImprovement: 'Vary your sentence openings.' }

const assessment = (targetPhrasesCorrectness: Assessment['targetPhrasesCorrectness'] = {}): Assessment => ({
  contextCorrectness: category,
  grammarAndSyntax: category,
  vocabularyDiversity: category,
  sentenceComplexity: category,
  sentenceNaturalness: category,
  targetPhrasesCorrectness,
  overallFeedback: OVERALL,
})

const USED = {
  score: 9,
  feedback: 'Used naturally and in the right tense.',
  suggestions: 'I broke the ice with the client.',
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
const TURN_ID = 'turn-1'

/** Lets a test land another turn while this one is still waiting on the tutor. */
class RacingLlmGateway extends FakeLlmGateway {
  constructor(private readonly meanwhile: () => void) {
    super({ replies: [REPLY], assessments: [assessment()] })
  }

  async tutorReply(input: TutorReplyInput): Promise<string> {
    this.meanwhile()

    return super.tutorReply(input)
  }
}

describe('POST /trainings/:id/messages', () => {
  it('answers with the tutor reply and the assessment of the message just sent', async () => {
    const { res } = await send({ content: CONTENT, turnId: TURN_ID })

    expect(res.status).toBe(200)
    const turn = chatTurnResponseSchema.parse(await res.json())
    expect(turn.reply).toEqual({ role: 'assistant', content: REPLY, createdAt: NOW })
    expect(turn.assessment.contextCorrectness.score).toBe(8)
    expect(turn.assessment.grammarAndSyntax.score).toBe(8)
    expect(turn.assessment.overallFeedback).toEqual(OVERALL)
  })

  it('appends the message and the reply to the conversation as one turn', async () => {
    const { stored } = await send({ content: CONTENT, turnId: TURN_ID })

    expect(stored.messages).toEqual([
      { role: 'assistant', content: OPENING, createdAt: NOW },
      { role: 'user', content: CONTENT, turnId: TURN_ID, createdAt: NOW, assessment: assessment() },
      { role: 'assistant', content: REPLY, createdAt: NOW },
    ])
  })

  it('asks the tutor and the assessor about the same message, in the context and style of the session', async () => {
    const { llm } = await send({ content: CONTENT, turnId: TURN_ID })

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
      { context: 'a scrum standup', style: 'informal', targets, userContent: CONTENT, tutorMessage: OPENING },
    ])
  })

  it('keeps only the targets of this session when the assessor invents a key', async () => {
    const invented = assessment({ 'break the ice': USED, 'jump the gun': USED })

    const { res, stored } = await send(
      { content: CONTENT, turnId: TURN_ID },
      new FakeLlmGateway({ replies: [REPLY], assessments: [invented] }),
    )

    const turn = chatTurnResponseSchema.parse(await res.json())
    expect(Object.keys(turn.assessment.targetPhrasesCorrectness)).toEqual(['break the ice'])
    expect(Object.keys(stored.messages[1]?.assessment?.targetPhrasesCorrectness ?? {})).toEqual(['break the ice'])
  })

  it('takes the reply of a second attempt when the first one fails', async () => {
    const { res, stored } = await send(
      { content: CONTENT, turnId: TURN_ID },
      new FakeLlmGateway({ replies: [new Error('timeout'), REPLY], assessments: [assessment()] }),
    )

    expect(res.status).toBe(200)
    expect(stored.messages).toHaveLength(3)
  })

  it('saves nothing when the tutor cannot be reached twice', async () => {
    const { res, stored } = await send(
      { content: CONTENT, turnId: TURN_ID },
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
      { content: CONTENT, turnId: TURN_ID },
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
      { content: CONTENT, turnId: TURN_ID },
      new FakeLlmGateway({ replies: [REPLY], assessments: [assessment()] }),
      training({ status: 'COMPLETED', completedAt: NOW }),
    )

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
    expect(stored.messages).toHaveLength(1)
  })

  it('saves nothing when another turn landed while the tutor was thinking', async () => {
    const existing = training()
    const meanwhile: ChatMessage = { role: 'assistant', content: 'Still there?', createdAt: NOW }

    const { res, stored } = await send(
      { content: CONTENT, turnId: TURN_ID },
      new RacingLlmGateway(() => existing.messages.push(meanwhile)),
      existing,
    )

    expect(res.status).toBe(409)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('TURN_CONFLICT')
    expect(stored.messages).toEqual([{ role: 'assistant', content: OPENING, createdAt: NOW }, meanwhile])
  })

  it('replays a turn that already landed instead of answering the same message twice', async () => {
    const existing = training()
    const llm = new FakeLlmGateway({ replies: [REPLY], assessments: [assessment()] })
    const stored: Training[] = [existing]
    const deps = testDeps({ llm, trainings: new InMemoryTrainingRepository(stored) })
    const app = createApp(deps)
    const post = () =>
      app.request('/trainings/t1/messages', {
        method: 'POST',
        headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: CONTENT, turnId: TURN_ID }),
      })

    const first = chatTurnResponseSchema.parse(await (await post()).json())
    const retry = await post()

    expect(retry.status).toBe(200)
    expect(chatTurnResponseSchema.parse(await retry.json()).reply).toEqual(first.reply)
    expect((stored[0] as ChatTraining).messages).toHaveLength(3)
    expect(llm.replyCalls).toHaveLength(1)
  })

  it('treats a different send as its own turn even when the words repeat', async () => {
    const existing = training()
    const llm = new FakeLlmGateway({ replies: [REPLY, REPLY], assessments: [assessment(), assessment()] })
    const stored: Training[] = [existing]
    const deps = testDeps({ llm, trainings: new InMemoryTrainingRepository(stored) })
    const app = createApp(deps)
    const post = (turnId: string) =>
      app.request('/trainings/t1/messages', {
        method: 'POST',
        headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: CONTENT, turnId }),
      })

    await post('turn-1')
    await post('turn-2')

    expect((stored[0] as ChatTraining).messages).toHaveLength(5)
  })

  it('answers 404 for a training that does not exist', async () => {
    const deps = testDeps()
    const res = await createApp(deps).request('/trainings/nope/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: CONTENT, turnId: TURN_ID }),
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
      body: JSON.stringify({ content: CONTENT, turnId: TURN_ID }),
    })

    expect(res.status).toBe(401)
  })
})
