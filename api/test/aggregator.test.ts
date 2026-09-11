import { describe, expect, it } from 'vitest'
import type { Assessment, ChatMessage, TrainingTarget } from '@contracts'
import { aggregateSession } from '../src/trainings/aggregator'

const NOW = new Date('2026-01-01T00:00:00.000Z')

const TARGETS: TrainingTarget[] = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
  { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
]

const category = (score: number) => ({ score, feedback: 'clear enough', suggestions: 'try this instead' })

const assessed = (scores: number[], targets: Record<string, number> = {}): ChatMessage => {
  const assessment: Assessment = {
    contextCorrectness: category(scores[0] ?? 0),
    grammarAndSyntax: category(scores[1] ?? 0),
    vocabularyDiversity: category(scores[2] ?? 0),
    sentenceComplexity: category(scores[3] ?? 0),
    sentenceNaturalness: category(scores[4] ?? 0),
    targetPhrasesCorrectness: Object.fromEntries(
      Object.entries(targets).map(([expression, score]) => [
        expression,
        { ...category(score), correctVersion: `${expression}, correctly` },
      ]),
    ),
    overallFeedback: { strengths: 'good flow', areasForImprovement: 'watch the tenses' },
  }

  return { role: 'user', content: 'hello', createdAt: NOW, assessment }
}

const tutor: ChatMessage = { role: 'assistant', content: 'How did it go?', createdAt: NOW }

const UNUSED = { used: false, usedCorrectly: false, score: 0 }

describe('aggregateSession', () => {
  it('scores zero everywhere and leaves every target unused when nothing was assessed', () => {
    expect(aggregateSession([tutor, { role: 'user', content: 'hi', createdAt: NOW }], TARGETS)).toEqual({
      averages: {
        contextCorrectness: 0,
        grammarAndSyntax: 0,
        vocabularyDiversity: 0,
        sentenceComplexity: 0,
        sentenceNaturalness: 0,
      },
      targets: { 'break the ice': UNUSED, 'touch base': UNUSED },
    })
  })

  it('averages each category over the assessed messages only', () => {
    const { averages } = aggregateSession(
      [tutor, assessed([6, 8, 4, 5, 7]), tutor, assessed([8, 6, 7, 6, 10]), tutor],
      TARGETS,
    )

    expect(averages).toEqual({
      contextCorrectness: 7,
      grammarAndSyntax: 7,
      vocabularyDiversity: 5.5,
      sentenceComplexity: 5.5,
      sentenceNaturalness: 8.5,
    })
  })

  it('averages a target over the messages that attempted it, skipping zero scores', () => {
    const { targets } = aggregateSession(
      [
        assessed([5, 5, 5, 5, 5], { 'break the ice': 9 }),
        assessed([5, 5, 5, 5, 5], { 'break the ice': 0 }),
        assessed([5, 5, 5, 5, 5], { 'break the ice': 6 }),
      ],
      TARGETS,
    )

    expect(targets).toEqual({
      'break the ice': { used: true, usedCorrectly: true, score: 7.5 },
      'touch base': UNUSED,
    })
  })

  it('counts a target as used correctly from an average of 7', () => {
    const { targets } = aggregateSession(
      [assessed([5, 5, 5, 5, 5], { 'break the ice': 7, 'touch base': 6.9 })],
      TARGETS,
    )

    expect(targets['break the ice']).toEqual({ used: true, usedCorrectly: true, score: 7 })
    expect(targets['touch base']).toEqual({ used: true, usedCorrectly: false, score: 6.9 })
  })

  it('ignores scores for phrases that are not targets of the session', () => {
    const { targets } = aggregateSession([assessed([5, 5, 5, 5, 5], { 'jump the gun': 9 })], TARGETS)

    expect(Object.keys(targets)).toEqual(['break the ice', 'touch base'])
  })
})
