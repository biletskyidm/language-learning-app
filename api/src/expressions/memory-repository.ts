import type { Expression, ExpressionListQuery } from '@contracts'
import type { ExpressionRepository } from './repository'

export class InMemoryExpressionRepository implements ExpressionRepository {
  constructor(private readonly expressions: Expression[] = []) {}

  async countAll(): Promise<number> {
    return this.expressions.length
  }

  async list(userId: string, { search }: ExpressionListQuery): Promise<Expression[]> {
    const needle = search?.trim().toLowerCase()

    return this.expressions
      .filter((e) => e.userId === userId)
      .filter(
        (e) =>
          !needle || e.expression.toLowerCase().includes(needle) || e.meaning.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}
