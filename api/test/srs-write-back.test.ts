import { describe, expect, it } from 'vitest'
import type { Assessment, ChatTraining, Expression, TargetCorrectness } from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryTrainingRepository } from '../src/trainings/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const DAY_MS = 86_400_000
const daysAfter = (days: number) => new Date(NOW.getTime() + days * DAY_MS)

const category = { score: 8, feedback: 'The tenses hold up.', suggestions: 'I broke the ice with the client.' }

const correctness = (score: number): TargetCorrectness => ({
  score,
  feedback: 'Used in the right place.',
  suggestions: 'I broke the ice with the client.',
  correctVersion: 'I broke the ice by asking about their weekend.',
})

const assessment = (targetPhrasesCorrectness: Assessment['targetPhrasesCorrectness']): Assessment => ({
  contextCorrectness: category,
  grammarAndSyntax: category,
  vocabularyDiversity: category,
  sentenceComplexity: category,
  sentenceNaturalness: category,
  targetPhrasesCorrectness,
  overallFeedback: { strengths: 'You opened confidently.', areasForImprovement: 'Vary your openings.' },
})

const expression = (overrides: Partial<Expression>): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: NOW,
  ...overrides,
})

const NEVER_PRACTICED = expression({})
const PRACTICED = expression({
  id: 'e2',
  expression: 'touch base',
  meaning: 'to make brief contact',
  score: 8,
  timesPracticed: 3,
  lastTimePracticedAt: daysAfter(-7),
  nextTrainingAt: NOW,
})

const training: ChatTraining = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [NEVER_PRACTICED, PRACTICED].map(({ id, expression: text, meaning }) => ({
    expressionId: id,
    expression: text,
    meaning,
  })),
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: NOW }],
  createdAt: NOW,
}

const turn = async (scores: Assessment['targetPhrasesCorrectness'], expressions = [NEVER_PRACTICED, PRACTICED]) => {
  const stored = expressions.map((e) => ({ ...e }))
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository(stored),
    trainings: new InMemoryTrainingRepository([{ ...training }]),
    llm: new FakeLlmGateway({ replies: ['Any numbers back yet?'], assessments: [assessment(scores)] }),
  })
  const res = await createApp(deps).request('/trainings/t1/messages', {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'I broke the ice with the client yesterday.' }),
  })

  return { res, stored, find: (id: string) => stored.find((e) => e.id === id) as Expression }
}

describe('SRS write-back after a chat turn', () => {
  it('schedules a phrase used for the first time and starts its counter', async () => {
    const { res, find } = await turn({ 'break the ice': correctness(8) })

    expect(res.status).toBe(200)
    expect(find('e1')).toMatchObject({
      score: 8,
      timesPracticed: 1,
      lastTimePracticedAt: NOW,
      nextTrainingAt: daysAfter(1),
    })
  })

  it('leaves a target the message did not use untouched', async () => {
    const { find } = await turn({ 'break the ice': correctness(8), 'touch base': correctness(0) })

    expect(find('e2')).toEqual(PRACTICED)
  })

  it('leaves a target the assessor said nothing about untouched', async () => {
    const { find } = await turn({ 'break the ice': correctness(8) })

    expect(find('e2')).toEqual(PRACTICED)
  })

  it('folds the new score into the running average and climbs the ladder', async () => {
    const { find } = await turn({ 'touch base': correctness(4) })

    expect(find('e2')).toMatchObject({
      score: 7,
      timesPracticed: 4,
      lastTimePracticedAt: NOW,
      nextTrainingAt: daysAfter(14),
    })
  })

  it('writes nothing when the turn itself fails', async () => {
    const stored = [{ ...NEVER_PRACTICED }]
    const deps = testDeps({
      expressions: new InMemoryExpressionRepository(stored),
      trainings: new InMemoryTrainingRepository([{ ...training }]),
      llm: new FakeLlmGateway({
        replies: [new Error('timeout'), new Error('timeout')],
        assessments: [assessment({ 'break the ice': correctness(8) })],
      }),
    })
    const res = await createApp(deps).request('/trainings/t1/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'I broke the ice with the client yesterday.' }),
    })

    expect(res.status).toBe(502)
    expect(stored[0]).toEqual(NEVER_PRACTICED)
  })
})
