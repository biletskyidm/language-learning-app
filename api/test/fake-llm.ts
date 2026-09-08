import type { ExpressionDraft } from '@contracts'
import type { LlmGateway } from '../src/deps'

/** Hands back one canned outcome per call, in order, so a test can spell out failures and retries. */
export class FakeLlmGateway implements LlmGateway {
  readonly draftCalls: string[] = []

  constructor(private readonly outcomes: (ExpressionDraft | Error)[] = []) {}

  async draftExpression({ text }: { text: string }): Promise<ExpressionDraft> {
    this.draftCalls.push(text)
    const outcome = this.outcomes.shift()
    if (!outcome) throw new Error('FakeLlmGateway ran out of canned outcomes')
    if (outcome instanceof Error) throw outcome

    return outcome
  }
}
