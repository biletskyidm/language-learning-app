import type { ExpressionDraft } from '@contracts'
import type { LlmGateway, TutorFirstMessageInput } from '../src/deps'

/** Hands back one canned outcome per call, in order, so a test can spell out failures and retries. */
export class FakeLlmGateway implements LlmGateway {
  readonly draftCalls: string[] = []
  readonly firstMessageCalls: TutorFirstMessageInput[] = []

  constructor(
    private readonly outcomes: (ExpressionDraft | Error)[] = [],
    private readonly firstMessages: (string | Error)[] = [],
  ) {}

  async draftExpression({ text }: { text: string }): Promise<ExpressionDraft> {
    this.draftCalls.push(text)

    return next(this.outcomes)
  }

  async tutorFirstMessage(input: TutorFirstMessageInput): Promise<string> {
    this.firstMessageCalls.push(input)

    return next(this.firstMessages)
  }
}

const next = <T>(outcomes: (T | Error)[]): T => {
  const outcome = outcomes.shift()
  if (!outcome) throw new Error('FakeLlmGateway ran out of canned outcomes')
  if (outcome instanceof Error) throw outcome

  return outcome
}
