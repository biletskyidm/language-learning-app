import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  trainingListResponseSchema,
  trainingSchema,
  type Assessment,
  type ChatMessage,
  type ChatTraining,
  type Expression,
  type Narrative,
  type Training,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const category = (score: number) => ({ score, feedback: 'clear enough', suggestions: 'try this instead' })

const assessed = (score: number, targets: Record<string, number>): ChatMessage => {
  const assessment: Assessment = {
    contextCorrectness: category(score),
    grammarAndSyntax: category(score),
    vocabularyDiversity: category(score),
    sentenceComplexity: category(score),
    sentenceNaturalness: category(score),
    targetPhrasesCorrectness: Object.fromEntries(
      Object.entries(targets).map(([expression, target]) => [
        expression,
        { ...category(target), correctVersion: `${expression}, correctly` },
      ]),
    ),
    overallFeedback: { strengths: 'good flow', areasForImprovement: 'watch the tenses' },
  }

  return { role: 'user', content: 'I broke the ice.', createdAt: NOW, assessment }
}

const tutor: ChatMessage = { role: 'assistant', content: 'How did it go?', createdAt: NOW }

const NARRATIVE: Narrative = {
  strengths: 'You kept the conversation moving.',
  areasForImprovement: 'Your sentences stayed short.',
  suggestedFocus: 'Try touch base in your next standup.',
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
  messages: [tutor, assessed(6, { 'break the ice': 9 }), tutor, assessed(8, { 'break the ice': 7 }), tutor],
  srsEffects: [],
  createdAt: NOW,
  ...overrides,
})

const VOCABULARY: Expression[] = [
  {
    id: 'e1',
    userId: 'me',
    expression: 'break the ice',
    type: 'idiom',
    meaning: 'to get a conversation started',
    examples: [],
    tags: [],
    frequency: 'common',
    score: 8,
    timesPracticed: 2,
    createdAt: NOW,
  },
]

const setup = (llm = new FakeLlmGateway({ narratives: [NARRATIVE] }), existing: Training = training()) => {
  const stored: Training[] = [existing]
  const vocabulary = VOCABULARY.map((expression) => ({ ...expression }))
  const deps = testDeps({
    llm,
    trainings: new InMemoryTrainingRepository(stored),
    expressions: new InMemoryExpressionRepository(vocabulary),
  })
  const app = createApp(deps)
  const complete = (id = existing.id) =>
    app.request(`/trainings/${id}/complete`, {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
    })

  return { app, deps, llm, stored, vocabulary, complete }
}

describe('POST /trainings/:id/complete', () => {
  it('ends the session with its averages, per-target stats and the narrative', async () => {
    const { complete, stored } = setup()

    const res = await complete()

    expect(res.status).toBe(200)
    const completed = trainingSchema.parse(await res.json())
    const expected = {
      averages: {
        contextCorrectness: 7,
        grammarAndSyntax: 7,
        vocabularyDiversity: 7,
        sentenceComplexity: 7,
        sentenceNaturalness: 7,
      },
      targets: {
        'break the ice': { used: true, usedCorrectly: true, score: 8 },
        'touch base': { used: false, usedCorrectly: false, score: 0 },
      },
      narrative: NARRATIVE,
      computedAt: NOW,
    }
    expect(completed).toMatchObject({ status: 'COMPLETED', completedAt: NOW, finalAssessment: expected })
    expect(stored[0]).toMatchObject({ status: 'COMPLETED', completedAt: NOW, finalAssessment: expected })
  })

  it('asks for the narrative from the computed numbers', async () => {
    const { complete, llm } = setup()

    await complete()

    expect(llm.narrativeCalls).toEqual([
      {
        averages: {
          contextCorrectness: 7,
          grammarAndSyntax: 7,
          vocabularyDiversity: 7,
          sentenceComplexity: 7,
          sentenceNaturalness: 7,
        },
        targets: {
          'break the ice': { used: true, usedCorrectly: true, score: 8 },
          'touch base': { used: false, usedCorrectly: false, score: 0 },
        },
      },
    ])
  })

  it('shows the averages on the session row once it is over', async () => {
    const { app, deps, complete } = setup()

    await complete()
    const res = await app.request('/trainings?status=COMPLETED', {
      headers: { Authorization: bearer(TEST_SECRET, deps.clock) },
    })

    const [row] = trainingListResponseSchema.parse(await res.json()).items
    expect(row?.finalAssessment?.averages.grammarAndSyntax).toBe(7)
  })

  it('refuses to end a session a second time', async () => {
    const { complete, llm } = setup(new FakeLlmGateway({ narratives: [NARRATIVE, NARRATIVE] }))

    await complete()
    const second = await complete()

    expect(second.status).toBe(409)
    expect(apiErrorSchema.parse(await second.json()).error.code).toBe('TRAINING_NOT_ACTIVE')
    expect(llm.narrativeCalls).toHaveLength(1)
  })

  it('refuses to end a canceled session', async () => {
    const { complete, stored } = setup(
      undefined,
      training({ status: 'CANCELED', canceledAt: NOW }),
    )

    const res = await complete()

    expect(res.status).toBe(409)
    expect(stored[0]).not.toHaveProperty('finalAssessment')
  })

  it('takes the narrative of a second attempt when the first one fails', async () => {
    const { complete, stored } = setup(new FakeLlmGateway({ narratives: [new Error('timeout'), NARRATIVE] }))

    const res = await complete()

    expect(res.status).toBe(200)
    expect(stored[0]?.status).toBe('COMPLETED')
  })

  it('keeps the session active and stores nothing when the narrative cannot be reached twice', async () => {
    const { complete, stored } = setup(
      new FakeLlmGateway({ narratives: [new Error('timeout'), new Error('timeout')] }),
    )

    const res = await complete()

    expect(res.status).toBe(502)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('LLM_UNAVAILABLE')
    expect(stored[0]?.status).toBe('ACTIVE')
    expect(stored[0]).not.toHaveProperty('finalAssessment')
    expect(stored[0]).not.toHaveProperty('completedAt')
  })

  it('leaves the schedule of every target as the turns left it', async () => {
    const { complete, stored, vocabulary } = setup()

    await complete()

    expect(vocabulary).toEqual(VOCABULARY)
    expect(stored[0]?.srsEffects).toEqual([])
  })

  it('answers 404 for a training that does not exist', async () => {
    const { complete } = setup()

    const res = await complete('nope')

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('rejects a caller without a token', async () => {
    const { app } = setup()

    const res = await app.request('/trainings/t1/complete', { method: 'POST' })

    expect(res.status).toBe(401)
  })
})
