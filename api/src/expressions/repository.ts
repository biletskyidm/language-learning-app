import type { CreateExpressionInput, Expression, ExpressionListQuery } from '@contracts'

export type ExpressionListParams = ExpressionListQuery & { now: Date }

export interface ExpressionRepository {
  /** Diagnostic total across every user; used by the startup log. */
  countAll(): Promise<number>
  list(userId: string, query: ExpressionListParams): Promise<Expression[]>
  findById(userId: string, id: string): Promise<Expression | undefined>
  findByExpression(userId: string, expression: string): Promise<Expression | undefined>
  create(userId: string, input: CreateExpressionInput, createdAt: Date): Promise<Expression>
  tags(userId: string): Promise<string[]>
}
