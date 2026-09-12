import type { DrillAggregates, DrillRound, TrainingTarget, TrainingType } from '@contracts'

export type DrillType = Exclude<TrainingType, 'chat'>

export const DRILL_CORRECT_SCORE = 8
export const DRILL_WRONG_SCORE = 2

export interface DrillContext {
  index: number
  targets: TrainingTarget[]
}

/** Either the validated answer with its verdict, or why the submitted body is not an answer to this round. */
export type DrillJudgement =
  | { ok: true; answer: unknown; verdict: unknown }
  | { ok: false; message: string }

/**
 * One drill type. The registry keys these by training type, so adding a drill is a new module here
 * rather than a branch in the handler.
 */
export interface DrillStrategy {
  readonly type: DrillType
  generate(context: DrillContext): Promise<DrillRound>
  /** The answer contract depends on the round, so validation lives with judging. */
  judge(round: DrillRound, body: unknown): DrillJudgement
  /** Keyed by expressionId, ready for the SRS service. */
  scoresFor(round: DrillRound): Map<string, number>
  /** What the client may see: a round nobody has answered yet must not carry its own answers. */
  redact(round: DrillRound): DrillRound
  aggregate(rounds: DrillRound[]): DrillAggregates
}
