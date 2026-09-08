import { ChatOpenAI } from '@langchain/openai'
import { expressionDraftSchema, partOfSpeechSchema, type ExpressionDraft } from '@contracts'
import type { Config } from '../config'
import type { LlmGateway } from '../deps'
import { loadPrompt, renderPrompt } from './prompts'

const BASE_URL = 'https://openrouter.ai/api/v1'

// Structured output is strict: every property must be required, so an absent part of speech comes back as null.
const draftSchema = expressionDraftSchema.extend({ partOfSpeech: partOfSpeechSchema.nullable() })

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

  private model(name: string | undefined) {
    if (!name) throw new Error('No model id configured for this LLM role')

    return new ChatOpenAI({
      apiKey: this.config.OPENROUTER_API_KEY,
      model: name,
      configuration: { baseURL: BASE_URL },
    })
  }
}
