import type { ExpressionDraft, TokenVerification } from '@contracts'
import type { ExpressionRepository } from './expressions/repository'
import type { ScenarioRepository } from './scenarios/repository'
import type { SettingsRepository } from './settings/repository'
import type { TrainingRepository } from './trainings/repository'

export type Clock = () => Date

export interface DbHealth {
  ping(): Promise<boolean>
}

export interface LlmGateway {
  draftExpression(input: { text: string }): Promise<ExpressionDraft>
}

export interface TokenVerifier {
  verify(authorizationHeader: string | undefined): TokenVerification
}

export interface Deps {
  db: DbHealth
  expressions: ExpressionRepository
  trainings: TrainingRepository
  settings: SettingsRepository
  scenarios: ScenarioRepository
  llm: LlmGateway
  tokenVerifier: TokenVerifier
  clock: Clock
  userId: string
}
