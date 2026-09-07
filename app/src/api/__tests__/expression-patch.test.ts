import type { CreateExpressionInput, Expression } from '@contracts'
import { expressionPatch } from '../expression-patch'

const original: Expression = {
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  partOfSpeech: 'verb',
  meaning: 'to get a conversation started',
  examples: ['Someone had to break the ice.'],
  tags: ['work'],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  score: 7.5,
  timesPracticed: 3,
}

const draft = (overrides: Partial<CreateExpressionInput> = {}): CreateExpressionInput => ({
  expression: original.expression,
  type: original.type,
  partOfSpeech: original.partOfSpeech,
  meaning: original.meaning,
  examples: original.examples,
  tags: original.tags,
  frequency: original.frequency,
  ...overrides,
})

describe('expressionPatch', () => {
  it('sends nothing when the form still matches what is stored', () => {
    expect(expressionPatch(original, draft())).toEqual({})
  })

  it('sends only the field that changed', () => {
    expect(expressionPatch(original, draft({ meaning: 'to make people feel at ease' }))).toEqual({
      meaning: 'to make people feel at ease',
    })
  })

  it('sends every changed field together', () => {
    expect(expressionPatch(original, draft({ type: 'phrase', frequency: 'moderate' }))).toEqual({
      type: 'phrase',
      frequency: 'moderate',
    })
  })

  it('sends a list only when its contents differ', () => {
    expect(expressionPatch(original, draft({ examples: [...original.examples] }))).toEqual({})
    expect(expressionPatch(original, draft({ tags: ['work', 'small-talk'] }))).toEqual({
      tags: ['work', 'small-talk'],
    })
  })

  it('sends an emptied list so the stored one is replaced', () => {
    expect(expressionPatch(original, draft({ examples: [] }))).toEqual({ examples: [] })
  })

  it('sends a reordered list, since order is what gets rendered', () => {
    expect(expressionPatch(original, draft({ tags: ['work', 'a'] }))).toEqual({ tags: ['work', 'a'] })
  })

  it('clears a removed part of speech with an explicit null', () => {
    expect(expressionPatch(original, draft({ partOfSpeech: undefined }))).toEqual({ partOfSpeech: null })
  })

  it('sends a newly chosen part of speech', () => {
    expect(expressionPatch({ ...original, partOfSpeech: undefined }, draft({ partOfSpeech: 'noun' }))).toEqual({
      partOfSpeech: 'noun',
    })
  })

  it('never sends an SRS field, whatever the form holds', () => {
    expect(Object.keys(expressionPatch(original, draft({ meaning: 'changed' })))).toEqual(['meaning'])
  })
})
