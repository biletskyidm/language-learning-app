import type {
  Assessment,
  ChatMessage,
  ChatStyle,
  ExpressionDraft,
  Narrative,
  TokenVerification,
  TrainingTarget,
} from '@contracts'
import type { ExpressionRepository } from './expressions/repository'
import type { ScenarioRepository } from './scenarios/repository'
import type { SettingsRepository } from './settings/repository'
import type { SessionAggregate } from './trainings/aggregator'
import type { TrainingRepository } from './trainings/repository'

export type Clock = () => Date

export interface DbHealth {
  ping(): Promise<boolean>
}

export interface TutorFirstMessageInput {
  context: string
  style: ChatStyle
  targets: TrainingTarget[]
}

export interface AssessmentInput {
  context: string
  style: ChatStyle
  targets: TrainingTarget[]
  userContent: string
  /** What the tutor said last, so contextCorrectness can judge the answer and not only the scenario. */
  tutorMessage?: string
}

export type TutorReplyInput = AssessmentInput & { history: ChatMessage[] }

export interface LlmGateway {
  draftExpression(input: { text: string }): Promise<ExpressionDraft>
  tutorFirstMessage(input: TutorFirstMessageInput): Promise<string>
  tutorReply(input: TutorReplyInput): Promise<string>
  assessMessage(input: AssessmentInput): Promise<Assessment>
  summarizeSession(input: SessionAggregate): Promise<Narrative>
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
