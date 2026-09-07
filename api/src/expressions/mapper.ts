import { ObjectId } from 'mongodb'
import { expressionSchema, type Expression } from '@contracts'

export type ExpressionDoc = { _id: ObjectId } & Record<string, unknown>

/**
 * Tolerates MCP-era documents: missing tags/examples, and optional fields written as explicit null.
 * A dropped null matters — an absent `score` is how the picker recognises a never-practiced phrase.
 */
export const toDomain = (doc: ExpressionDoc): Expression => {
  const { _id, ...rest } = doc
  const set = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null))

  return expressionSchema.parse({
    ...set,
    id: _id.toHexString(),
    tags: set.tags ?? [],
    examples: set.examples ?? [],
  })
}

export const toDoc = (expression: Expression): ExpressionDoc => {
  const { id, ...rest } = expression
  return { _id: new ObjectId(id), ...rest }
}
