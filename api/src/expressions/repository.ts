import type {
  CreateExpressionInput,
  Expression,
  ExpressionListQuery,
  ExpressionPickQuery,
  UpdateExpressionInput,
} from '@contracts'

export type ExpressionListParams = ExpressionListQuery & { now: Date }
export type ExpressionPickParams = ExpressionPickQuery & { now: Date }

export type SrsFields = {
  score: number
  timesPracticed: number
  lastTimePracticedAt: Date
  nextTrainingAt: Date
}

export interface ExpressionRepository {
  /** Diagnostic total across every user; used by the startup log. */
  countAll(): Promise<number>
  list(userId: string, query: ExpressionListParams): Promise<Expression[]>
  pick(userId: string, query: ExpressionPickParams): Promise<Expression[]>
  findById(userId: string, id: string): Promise<Expression | undefined>
  findByExpression(userId: string, expression: string): Promise<Expression | undefined>
  create(userId: string, input: CreateExpressionInput, createdAt: Date): Promise<Expression>
  update(userId: string, id: string, patch: UpdateExpressionInput): Promise<Expression | undefined>
  applySrs(userId: string, id: string, fields: SrsFields): Promise<void>
  delete(userId: string, id: string): Promise<boolean>
  tags(userId: string): Promise<string[]>
}
