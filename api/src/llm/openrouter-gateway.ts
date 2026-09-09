import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { expressionDraftSchema, partOfSpeechSchema, type ExpressionDraft } from '@contracts'
import type { Config } from '../config'
import type { LlmGateway, TutorFirstMessageInput } from '../deps'
import { loadPrompt, renderPrompt } from './prompts'

const BASE_URL = 'https://openrouter.ai/api/v1'

// Structured output is strict: every property must be required, so an absent part of speech comes back as null.
const draftSchema = expressionDraftSchema.extend({ partOfSpeech: partOfSpeechSchema.nullable() })

const tutorMessageSchema = z.object({ message: z.string().min(1) })

export class OpenRouterGateway implements LlmGateway {
  constructor(private readonly config: Config) {}

  async draftExpression({ text }: { text: string }): Promise<ExpressionDraft> {
    const model = this.model(this.config.DRAFT_MODEL).withStructuredOutput(draftSchema, {
      name: 'expression_draft',
    })

    const { partOfSpeech, ...drafted } = await model.invoke(
      renderPrompt(loadPrompt('draft-expression'), { text }),
      { tags: ['draft-expression'] },
    )

    return partOfSpeech ? { ...drafted, partOfSpeech } : drafted
  }

  async tutorFirstMessage({ context, style, targets }: TutorFirstMessageInput): Promise<string> {
    const model = this.model(this.config.REPLY_MODEL).withStructuredOutput(tutorMessageSchema, {
      name: 'tutor_first_message',
    })

    const { message } = await model.invoke(
      renderPrompt(loadPrompt('tutor-first-message'), {
        context,
        style,
        targets: targets.map((target) => `- ${target.expression}`).join('\n'),
      }),
      { tags: ['tutor-first-message'] },
    )

    return message
  }

  private model(name: string | undefined) {
    if (!name) throw new Error('No model id configured for this LLM role')

    return new ChatOpenAI({
      apiKey: this.config.OPENROUTER_API_KEY,
      model: name,
      configuration: { baseURL: BASE_URL },
    })
  }
}
