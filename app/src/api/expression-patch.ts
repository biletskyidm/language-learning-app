import type { CreateExpressionInput, Expression, UpdateExpressionInput } from '@contracts'

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i])

export const expressionPatch = (original: Expression, draft: CreateExpressionInput): UpdateExpressionInput => ({
  ...(draft.expression === original.expression ? {} : { expression: draft.expression }),
  ...(draft.type === original.type ? {} : { type: draft.type }),
  ...(draft.partOfSpeech === original.partOfSpeech ? {} : { partOfSpeech: draft.partOfSpeech ?? null }),
  ...(draft.meaning === original.meaning ? {} : { meaning: draft.meaning }),
  ...(sameList(draft.examples, original.examples) ? {} : { examples: draft.examples }),
  ...(sameList(draft.tags, original.tags) ? {} : { tags: draft.tags }),
  ...(draft.frequency === original.frequency ? {} : { frequency: draft.frequency }),
})
