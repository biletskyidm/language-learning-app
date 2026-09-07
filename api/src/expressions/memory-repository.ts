import type { Expression, ExpressionSort } from '@contracts'
import type { ExpressionListParams, ExpressionRepository } from './repository'

const sortValue = (expression: Expression, sort: ExpressionSort): number | undefined => {
  switch (sort) {
    case 'createdAt':
      return expression.createdAt.getTime()
    case 'score':
      return expression.score
    case 'nextTrainingAt':
      return expression.nextTrainingAt?.getTime()
    case 'timesPracticed':
      return expression.timesPracticed ?? 0
  }
}

const byId = (a: Expression, b: Expression) => a.id.localeCompare(b.id)

const comparator =
  ({ sort, dir }: ExpressionListParams) =>
  (a: Expression, b: Expression) => {
    const left = sortValue(a, sort)
    const right = sortValue(b, sort)

    if (left === undefined || right === undefined) {
      if (left === right) return byId(a, b)
      return left === undefined ? 1 : -1
    }
    if (left === right) return byId(a, b)

    return dir === 'asc' ? left - right : right - left
  }

export class InMemoryExpressionRepository implements ExpressionRepository {
  constructor(private readonly expressions: Expression[] = []) {}

  async countAll(): Promise<number> {
    return this.expressions.length
  }

  async list(userId: string, query: ExpressionListParams): Promise<Expression[]> {
    const needle = query.search?.trim().toLowerCase()

    return this.expressions
      .filter((e) => e.userId === userId)
      .filter(
        (e) =>
          !needle || e.expression.toLowerCase().includes(needle) || e.meaning.toLowerCase().includes(needle),
      )
      .filter((e) => !query.tag || e.tags.includes(query.tag))
      .filter((e) => !query.frequency || e.frequency === query.frequency)
      .filter((e) => !query.due || (e.nextTrainingAt !== undefined && e.nextTrainingAt <= query.now))
      .sort(comparator(query))
  }

  async findById(userId: string, id: string): Promise<Expression | undefined> {
    return this.expressions.find((e) => e.userId === userId && e.id === id)
  }

  async tags(userId: string): Promise<string[]> {
    const tags = this.expressions.filter((e) => e.userId === userId).flatMap((e) => e.tags)

    return [...new Set(tags)].sort()
  }
}
