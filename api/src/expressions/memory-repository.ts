import type { ExpressionRepository } from './repository'

export class InMemoryExpressionRepository implements ExpressionRepository {
  async countAll(): Promise<number> {
    return 0
  }
}
