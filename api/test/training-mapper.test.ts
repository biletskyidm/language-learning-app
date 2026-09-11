import { ObjectId } from 'mongodb'
import { describe, expect, it } from 'vitest'
import type { ChatTraining } from '@contracts'
import { toDoc, toDomain, toSummary } from '../src/trainings/mapper'

const id = '507f1f77bcf86cd799439022'

const category = { score: 8, feedback: 'The tenses hold up.', suggestions: 'I broke the ice with the client.' }

const training: ChatTraining = {
  id,
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [
    { role: 'assistant', content: 'Morning — what did you get done yesterday?', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    {
      role: 'user',
      content: 'I broke the ice with the client.',
      createdAt: new Date('2026-01-01T00:01:00.000Z'),
      assessment: {
        contextCorrectness: category,
        grammarAndSyntax: category,
        vocabularyDiversity: category,
        sentenceComplexity: category,
        sentenceNaturalness: category,
        targetPhrasesCorrectness: {
          'break the ice': { ...category, correctVersion: 'I broke the ice by asking about their weekend.' },
        },
        overallFeedback: { strengths: 'You opened confidently.', areasForImprovement: 'Vary your openings.' },
      },
    },
  ],
  srsEffects: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('training mapper', () => {
  it('round-trips a chat training unchanged', () => {
    expect(toDomain(toDoc(training))).toEqual(training)
  })

  it('stores the id as an ObjectId rather than a field of its own', () => {
    const doc = toDoc(training)

    expect(doc._id).toBeInstanceOf(ObjectId)
    expect(doc._id.toHexString()).toBe(id)
    expect(doc).not.toHaveProperty('id')
  })

  it('keeps an ended training with its completion timestamp', () => {
    const completed = { ...training, status: 'COMPLETED' as const, completedAt: new Date('2026-01-02T00:00:00.000Z') }

    expect(toDomain(toDoc(completed))).toEqual(completed)
  })

  it('ignores fields written by nothing in this codebase', () => {
    expect(toDomain({ ...toDoc(training), legacyNote: 'from an old importer' })).toEqual(training)
  })

  it('reads a list row keeping only the averages of the final assessment', () => {
    const averages = {
      contextCorrectness: 7,
      grammarAndSyntax: 8,
      vocabularyDiversity: 6,
      sentenceComplexity: 5,
      sentenceNaturalness: 7.5,
    }
    const { _id, type, status, context, style, targets, createdAt } = toDoc(training)

    expect(
      toSummary({
        _id,
        userId: 'me',
        type,
        status,
        context,
        style,
        targets,
        createdAt,
        finalAssessment: { averages, narrative: { strengths: 'You opened confidently.' } },
      }),
    ).toEqual({
      id,
      userId: 'me',
      type: 'chat',
      status: 'ACTIVE',
      context: 'a scrum standup',
      style: 'informal',
      targets: training.targets,
      createdAt: training.createdAt,
      finalAssessment: { averages },
    })
  })
})
