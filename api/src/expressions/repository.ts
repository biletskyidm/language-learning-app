import type { Expression, ExpressionListQuery } from '@contracts'

export type ExpressionListParams = ExpressionListQuery & { now: Date }

export interface ExpressionRepository {
  /** Diagnostic total across every user; used by the startup log. */
  countAll(): Promise<number>
  list(userId: string, query: ExpressionListParams): Promise<Expression[]>
  tags(userId: string): Promise<string[]>
}
