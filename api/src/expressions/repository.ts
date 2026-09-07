import type { Expression, ExpressionListQuery } from '@contracts'

export interface ExpressionRepository {
  /** Diagnostic total across every user; used by the startup log. */
  countAll(): Promise<number>
  list(userId: string, query: ExpressionListQuery): Promise<Expression[]>
}
