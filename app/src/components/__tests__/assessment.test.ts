import type { Assessment, ChatMessage, TrainingTarget } from '@contracts'
import { averagesLine, badgeTone, litTargets, overallScore, readyToEnd } from '../assessment'

const category = (score: number) => ({ score, feedback: 'clear enough', suggestions: 'try this instead' })

const assessment = (scores: number[], targets: Record<string, number> = {}): Assessment => ({
  contextCorrectness: category(scores[0]),
  grammarAndSyntax: category(scores[1]),
  vocabularyDiversity: category(scores[2]),
  sentenceComplexity: category(scores[3]),
  sentenceNaturalness: category(scores[4]),
  targetPhrasesCorrectness: Object.fromEntries(
    Object.entries(targets).map(([expression, score]) => [
      expression,
      { ...category(score), correctVersion: `${expression}, correctly` },
    ]),
  ),
  overallFeedback: { strengths: 'good flow', areasForImprovement: 'watch the tenses' },
})

const userMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'user',
  content: 'hello',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
})

describe('overallScore', () => {
  it('averages the five categories', () => {
    expect(overallScore(assessment([5, 8, 7, 6, 9]))).toBe(7)
  })

  it('ignores target scores', () => {
    expect(overallScore(assessment([4, 4, 4, 4, 4], { 'break the ice': 10 }))).toBe(4)
  })
})

describe('badgeTone', () => {
  it('is good from 7 up', () => {
    expect(badgeTone(7)).toBe('good')
    expect(badgeTone(10)).toBe('good')
  })

  it('is fair between 4 and 7', () => {
    expect(badgeTone(4)).toBe('fair')
    expect(badgeTone(6.9)).toBe('fair')
  })

  it('is poor below 4', () => {
    expect(badgeTone(3.9)).toBe('poor')
    expect(badgeTone(0)).toBe('poor')
  })
})

describe('litTargets', () => {
  it('lights a target scored 7 or more', () => {
    const messages = [userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 7 }) })]

    expect(litTargets(messages)).toEqual(new Set(['break the ice']))
  })

  it('leaves a target attempted badly unlit', () => {
    const messages = [userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 6.9 }) })]

    expect(litTargets(messages)).toEqual(new Set())
  })

  it('keeps a target lit once any message earned it', () => {
    const messages = [
      userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 9 }) }),
      userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 2 }) }),
    ]

    expect(litTargets(messages)).toEqual(new Set(['break the ice']))
  })

  it('ignores messages without an assessment', () => {
    expect(litTargets([userMessage(), { ...userMessage(), role: 'assistant' }])).toEqual(new Set())
  })
})

describe('readyToEnd', () => {
  const target = (expression: string): TrainingTarget => ({ expressionId: expression, expression, meaning: 'a meaning' })
  const targets = [target('break the ice'), target('touch base')]

  it('is ready once every target is lit', () => {
    const messages = [
      userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 8 }) }),
      userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'touch base': 7 }) }),
    ]

    expect(readyToEnd(targets, messages)).toBe(true)
  })

  it('is not ready while a target is still unlit', () => {
    const messages = [userMessage({ assessment: assessment([5, 5, 5, 5, 5], { 'break the ice': 8, 'touch base': 6 }) })]

    expect(readyToEnd(targets, messages)).toBe(false)
  })

  it('is not ready for a session without targets', () => {
    expect(readyToEnd([], [userMessage({ assessment: assessment([9, 9, 9, 9, 9]) })])).toBe(false)
  })
})

describe('averagesLine', () => {
  it('lists the five averages with one decimal', () => {
    expect(
      averagesLine({
        contextCorrectness: 7,
        grammarAndSyntax: 8,
        vocabularyDiversity: 6.25,
        sentenceComplexity: 5,
        sentenceNaturalness: 7.5,
      }),
    ).toBe('Context 7.0 · Grammar 8.0 · Vocabulary 6.3 · Complexity 5.0 · Naturalness 7.5')
  })
})
