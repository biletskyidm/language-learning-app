import type { Expression, ExpressionListQuery } from '@contracts'

/** `now` is resolved by the handler from the injected clock, so the repository stays free of time. */
export type ExpressionListParams = ExpressionListQuery & { now: Date }

export interface ExpressionRepository {
  /** Diagnostic total across every user; used by the startup log. */
  countAll(): Promise<number>
  list(userId: string, query: ExpressionListParams): Promise<Expression[]>
  tags(userId: string): Promise<string[]>
}
