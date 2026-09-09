import type { Assessment, ChatMessage } from '@contracts'
import { badgeTone, litTargets, overallScore } from '../assessment'

const category = (score: number) => ({ score, messageWithSuggestions: 'try this instead' })

const assessment = (scores: number[], targets: Record<string, number> = {}): Assessment => ({
  grammar: category(scores[0]),
  vocabularyDiversity: category(scores[1]),
  sentenceComplexity: category(scores[2]),
  sentenceNaturalness: category(scores[3]),
  targetExpressionCorrectness: Object.fromEntries(
    Object.entries(targets).map(([expression, score]) => [
      expression,
      { ...category(score), correctVersion: `${expression}, correctly` },
    ]),
  ),
})

const userMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'user',
  content: 'hello',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
})

describe('overallScore', () => {
  it('averages the four categories', () => {
    expect(overallScore(assessment([8, 7, 6, 9]))).toBe(7.5)
  })

  it('ignores target scores', () => {
    expect(overallScore(assessment([4, 4, 4, 4], { 'break the ice': 10 }))).toBe(4)
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
    const messages = [userMessage({ assessment: assessment([5, 5, 5, 5], { 'break the ice': 7 }) })]

    expect(litTargets(messages)).toEqual(new Set(['break the ice']))
  })

  it('leaves a target attempted badly unlit', () => {
    const messages = [userMessage({ assessment: assessment([5, 5, 5, 5], { 'break the ice': 6.9 }) })]

    expect(litTargets(messages)).toEqual(new Set())
  })

  it('keeps a target lit once any message earned it', () => {
    const messages = [
      userMessage({ assessment: assessment([5, 5, 5, 5], { 'break the ice': 9 }) }),
      userMessage({ assessment: assessment([5, 5, 5, 5], { 'break the ice': 2 }) }),
    ]

    expect(litTargets(messages)).toEqual(new Set(['break the ice']))
  })

  it('ignores messages without an assessment', () => {
    expect(litTargets([userMessage(), { ...userMessage(), role: 'assistant' }])).toEqual(new Set())
  })
})
