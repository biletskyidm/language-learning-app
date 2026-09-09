import type { Assessment, ExpressionDraft } from '@contracts'
import type { AssessmentInput, LlmGateway, TutorFirstMessageInput, TutorReplyInput } from '../src/deps'

interface Canned {
  drafts?: (ExpressionDraft | Error)[]
  firstMessages?: (string | Error)[]
  replies?: (string | Error)[]
  assessments?: (Assessment | Error)[]
}

/** Hands back one canned outcome per call, in order, so a test can spell out failures and retries. */
export class FakeLlmGateway implements LlmGateway {
  readonly draftCalls: string[] = []
  readonly firstMessageCalls: TutorFirstMessageInput[] = []
  readonly replyCalls: TutorReplyInput[] = []
  readonly assessmentCalls: AssessmentInput[] = []

  constructor(private readonly canned: Canned = {}) {}

  async draftExpression({ text }: { text: string }): Promise<ExpressionDraft> {
    this.draftCalls.push(text)

    return next(this.canned.drafts)
  }

  async tutorFirstMessage(input: TutorFirstMessageInput): Promise<string> {
    this.firstMessageCalls.push(input)

    return next(this.canned.firstMessages)
  }

  async tutorReply(input: TutorReplyInput): Promise<string> {
    this.replyCalls.push(input)

    return next(this.canned.replies)
  }

  async assessMessage(input: AssessmentInput): Promise<Assessment> {
    this.assessmentCalls.push(input)

    return next(this.canned.assessments)
  }
}

const next = <T>(outcomes: (T | Error)[] = []): T => {
  const outcome = outcomes.shift()
  if (!outcome) throw new Error('FakeLlmGateway ran out of canned outcomes')
  if (outcome instanceof Error) throw outcome

  return outcome
}
