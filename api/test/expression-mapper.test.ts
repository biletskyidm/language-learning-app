import { ObjectId } from 'mongodb'
import { describe, expect, it } from 'vitest'
import { toDoc, toDomain } from '../src/expressions/mapper'

const id = '507f1f77bcf86cd799439011'

const mcpEraDoc = {
  _id: new ObjectId(id),
  userId: 'me',
  expression: 'break the ice',
  type: 'phrase',
  meaning: 'to get a conversation started',
  frequency: 'common',
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
}

const goEraDoc = {
  ...mcpEraDoc,
  type: 'idiom',
  partOfSpeech: 'verb',
  examples: ['She broke the ice with a joke.'],
  tags: ['social'],
  score: 7,
  timesPracticed: 3,
  lastTimePracticedAt: new Date('2026-01-01T00:00:00.000Z'),
  nextTrainingAt: new Date('2026-01-08T00:00:00.000Z'),
}

describe('toDomain', () => {
  it('parses an MCP-era document without tags, examples or partOfSpeech', () => {
    expect(toDomain(mcpEraDoc)).toEqual({
      id,
      userId: 'me',
      expression: 'break the ice',
      type: 'phrase',
      meaning: 'to get a conversation started',
      examples: [],
      tags: [],
      frequency: 'common',
      createdAt: new Date('2024-03-01T00:00:00.000Z'),
    })
  })

  it('treats a null optional field as absent, the way the MCP-era importer wrote it', () => {
    const parsed = toDomain({ ...mcpEraDoc, partOfSpeech: null, score: null })

    expect(parsed).not.toHaveProperty('partOfSpeech')
    expect(parsed).not.toHaveProperty('score')
  })

  it('parses a Go-era document with every field set', () => {
    expect(toDomain(goEraDoc)).toMatchObject({
      id,
      partOfSpeech: 'verb',
      tags: ['social'],
      score: 7,
      nextTrainingAt: new Date('2026-01-08T00:00:00.000Z'),
    })
  })

  it('keeps score absent when the document has never been practiced', () => {
    expect(toDomain(mcpEraDoc)).not.toHaveProperty('score')
  })

  it('ignores unknown extra fields', () => {
    expect(toDomain({ ...mcpEraDoc, legacyNote: 'from the old importer' })).not.toHaveProperty('legacyNote')
  })
})

describe('toDoc', () => {
  it('round-trips a never-practiced expression without inventing a score', () => {
    const doc = toDoc(toDomain(mcpEraDoc))

    expect(doc._id).toBeInstanceOf(ObjectId)
    expect(doc._id.toHexString()).toBe(id)
    expect(doc).not.toHaveProperty('score')
    expect(toDomain(doc)).toEqual(toDomain(mcpEraDoc))
  })

  it('round-trips a practiced expression unchanged', () => {
    expect(toDomain(toDoc(toDomain(goEraDoc)))).toEqual(toDomain(goEraDoc))
  })
})
