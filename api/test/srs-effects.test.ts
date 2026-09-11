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

const NEVER_PRACTICED: Expression = {
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: NOW,
}

const PRACTICED: Expression = {
  ...NEVER_PRACTICED,
  id: 'e2',
  expression: 'touch base',
  meaning: 'to make brief contact',
  score: 8,
  timesPracticed: 3,
  lastTimePracticedAt: daysAfter(-7),
  nextTrainingAt: NOW,
}

const training: ChatTraining = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [NEVER_PRACTICED, PRACTICED].map(({ id, expression, meaning }) => ({
    expressionId: id,
    expression,
    meaning,
  })),
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: NOW }],
  srsEffects: [],
  createdAt: NOW,
}

const turn = async (scores: Assessment['targetPhrasesCorrectness']) => {
  const trainings = [{ ...training }]
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository([{ ...NEVER_PRACTICED }, { ...PRACTICED }]),
    trainings: new InMemoryTrainingRepository(trainings),
    llm: new FakeLlmGateway({ replies: ['Any numbers back yet?'], assessments: [assessment(scores)] }),
  })
  const res = await createApp(deps).request('/trainings/t1/messages', {
    method: 'POST',
    headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'I broke the ice, then touched base with the client.', turnId: 'turn-1' }),
  })

  return { res, body: await res.json(), stored: trainings[0] as ChatTraining }
}

describe('SRS effect snapshots on the training', () => {
  it('records one effect per attempted target with its before and after', async () => {
    const { res, body, stored } = await turn({
      'break the ice': correctness(8),
      'touch base': correctness(4),
    })

    expect(res.status).toBe(200)
    expect(stored.srsEffects).toEqual([
      {
        expressionId: 'e1',
        expression: 'break the ice',
        scoreWritten: 8,
        source: { kind: 'message', index: 1 },
        before: {},
        after: { score: 8, timesPracticed: 1, nextTrainingAt: daysAfter(1) },
        at: NOW,
      },
      {
        expressionId: 'e2',
        expression: 'touch base',
        scoreWritten: 4,
        source: { kind: 'message', index: 1 },
        before: { score: 8, timesPracticed: 3, nextTrainingAt: NOW },
        after: { score: 7, timesPracticed: 4, nextTrainingAt: daysAfter(14) },
        at: NOW,
      },
    ])
    expect(body.srsEffects).toHaveLength(2)
  })

  it('records nothing for a target the message did not use', async () => {
    const { stored } = await turn({ 'break the ice': correctness(8), 'touch base': correctness(0) })

    expect(stored.srsEffects.map(({ expressionId }) => expressionId)).toEqual(['e1'])
  })

  it('keeps effects from earlier turns and points each at its own message', async () => {
    const trainings = [{ ...training }]
    const deps = testDeps({
      expressions: new InMemoryExpressionRepository([{ ...NEVER_PRACTICED }, { ...PRACTICED }]),
      trainings: new InMemoryTrainingRepository(trainings),
      llm: new FakeLlmGateway({
        replies: ['Any numbers back yet?', 'And the client?'],
        assessments: [assessment({ 'break the ice': correctness(8) }), assessment({ 'touch base': correctness(9) })],
      }),
    })
    const app = createApp(deps)
    const send = (content: string, turnId: string) =>
      app.request('/trainings/t1/messages', {
        method: 'POST',
        headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, turnId }),
      })

    await send('I broke the ice.', 'turn-1')
    const res = await send('Then I touched base.', 'turn-2')

    expect(res.status).toBe(200)
    expect((trainings[0] as ChatTraining).srsEffects.map(({ expressionId, source }) => [expressionId, source.index]))
      .toEqual([
        ['e1', 1],
        ['e2', 3],
      ])
  })

  it('reports the same effects again when a turn is replayed, without writing them twice', async () => {
    const trainings = [{ ...training }]
    const deps = testDeps({
      expressions: new InMemoryExpressionRepository([{ ...NEVER_PRACTICED }, { ...PRACTICED }]),
      trainings: new InMemoryTrainingRepository(trainings),
      llm: new FakeLlmGateway({
        replies: ['Any numbers back yet?'],
        assessments: [assessment({ 'break the ice': correctness(8) })],
      }),
    })
    const app = createApp(deps)
    const post = () =>
      app.request('/trainings/t1/messages', {
        method: 'POST',
        headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'I broke the ice.', turnId: 'turn-1' }),
      })

    const first = await (await post()).json()
    const replay = await (await post()).json()

    expect(replay.srsEffects).toEqual(first.srsEffects)
    expect((trainings[0] as ChatTraining).srsEffects).toHaveLength(1)
  })

  it('records the effects it managed to write when one target cannot be written', async () => {
    class PartlyUnwritable extends InMemoryExpressionRepository {
      async applySrs(...args: Parameters<InMemoryExpressionRepository['applySrs']>) {
        if (args[1] === 'e1') throw new Error('connection reset')

        return super.applySrs(...args)
      }
    }

    const trainings = [{ ...training }]
    const deps = testDeps({
      expressions: new PartlyUnwritable([{ ...NEVER_PRACTICED }, { ...PRACTICED }]),
      trainings: new InMemoryTrainingRepository(trainings),
      llm: new FakeLlmGateway({
        replies: ['Any numbers back yet?'],
        assessments: [assessment({ 'break the ice': correctness(8), 'touch base': correctness(4) })],
      }),
    })
    const res = await createApp(deps).request('/trainings/t1/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'I broke the ice, then touched base.', turnId: 'turn-1' }),
    })

    expect(res.status).toBe(200)
    expect((trainings[0] as ChatTraining).srsEffects.map(({ expressionId }) => expressionId)).toEqual(['e2'])
  })

  it('snapshots what the write really changed when another turn scored the phrase first', async () => {
    const stored = [{ ...PRACTICED }]

    class RacedOnce extends InMemoryExpressionRepository {
      private raced = false

      async applySrs(...args: Parameters<InMemoryExpressionRepository['applySrs']>) {
        if (!this.raced) {
          this.raced = true
          stored[0] = { ...(stored[0] as Expression), score: 10, timesPracticed: 4, nextTrainingAt: daysAfter(14) }
        }

        return super.applySrs(...args)
      }
    }

    const trainings = [{ ...training }]
    const deps = testDeps({
      expressions: new RacedOnce(stored),
      trainings: new InMemoryTrainingRepository(trainings),
      llm: new FakeLlmGateway({
        replies: ['Any numbers back yet?'],
        assessments: [assessment({ 'touch base': correctness(5) })],
      }),
    })
    const res = await createApp(deps).request('/trainings/t1/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Then I touched base.', turnId: 'turn-1' }),
    })

    expect(res.status).toBe(200)
    expect(stored[0]).toMatchObject({ score: 9, timesPracticed: 5 })
    expect((trainings[0] as ChatTraining).srsEffects).toEqual([
      expect.objectContaining({
        before: { score: 10, timesPracticed: 4, nextTrainingAt: daysAfter(14) },
        after: expect.objectContaining({ score: 9, timesPracticed: 5 }),
      }),
    ])
  })

  it('does not report effects on the training that could not be stored on it', async () => {
    class UnappendableTrainings extends InMemoryTrainingRepository {
      async appendSrsEffects(): Promise<void> {
        throw new Error('connection reset')
      }
    }

    const deps = testDeps({
      expressions: new InMemoryExpressionRepository([{ ...NEVER_PRACTICED }, { ...PRACTICED }]),
      trainings: new UnappendableTrainings([{ ...training }]),
      llm: new FakeLlmGateway({
        replies: ['Any numbers back yet?'],
        assessments: [assessment({ 'break the ice': correctness(8) })],
      }),
    })
    const app = createApp(deps)
    const res = await app.request('/trainings/t1/messages', {
      method: 'POST',
      headers: { Authorization: bearer(TEST_SECRET, deps.clock), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'I broke the ice.', turnId: 'turn-1' }),
    })
    const body = await res.json()
    const reopened = await (
      await app.request('/trainings/t1', { headers: { Authorization: bearer(TEST_SECRET, deps.clock) } })
    ).json()

    expect(res.status).toBe(200)
    expect(body.training.srsEffects).toEqual(reopened.srsEffects)
  })
})
