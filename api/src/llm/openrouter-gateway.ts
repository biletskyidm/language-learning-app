import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import {
  assessmentSchema,
  expressionDraftSchema,
  narrativeSchema,
  partOfSpeechSchema,
  type Assessment,
  type ChatMessage,
  type ExpressionDraft,
  type Narrative,
  type TrainingTarget,
} from '@contracts'
import type { Config } from '../config'
import type {
  AssessmentInput,
  DescribeJudgement,
  DescribeJudgeInput,
  GapsGeneration,
  GapsGenerationInput,
  LlmGateway,
  TutorFirstMessageInput,
  TutorReplyInput,
} from '../deps'
import type { SessionAggregate } from '../trainings/aggregator'
import { loadPrompt, renderPrompt } from './prompts'

const BASE_URL = 'https://openrouter.ai/api/v1'

// Structured output is strict: every property must be required, so an absent part of speech comes back as null.
const draftSchema = expressionDraftSchema.extend({ partOfSpeech: partOfSpeechSchema.nullable() })

const tutorMessageSchema = z.object({ message: z.string().min(1) })

const gapsGenerationSchema = z.object({ story: z.string().min(1), answers: z.array(z.string().min(1)).min(1) })

const describeJudgementSchema = z.object({ guess: z.string().min(1), note: z.string() })

// Structured output has no map type, so the per-target verdicts come back as a list and are keyed here.
const assessmentOutputSchema = assessmentSchema.omit({ targetPhrasesCorrectness: true }).extend({
  targetPhrasesCorrectness: z.array(
    assessmentSchema.shape.targetPhrasesCorrectness.valueType.extend({ expression: z.string() }),
  ),
})

const bullets = (targets: TrainingTarget[]) => targets.map(({ expression }) => `- ${expression}`).join('\n')

const withMeanings = (targets: TrainingTarget[]) =>
  targets.map(({ expression, meaning }) => `- ${expression}: ${meaning}`).join('\n')

const transcript = (history: ChatMessage[]) =>
  history.map(({ role, content }) => `${role}: ${content}`).join('\n')

const results = (targets: SessionAggregate['targets']) =>
  Object.entries(targets)
    .map(([expression, { used, usedCorrectly, score }]) =>
      used
        ? `- ${expression}: used, avg score ${score.toFixed(1)}/10 (${usedCorrectly ? 'correct' : 'needs work'})`
        : `- ${expression}: not used`,
    )
    .join('\n')

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
        targets: bullets(targets),
      }),
      { tags: ['tutor-first-message'] },
    )

    return message
  }

  async tutorReply({ context, style, targets, history, userContent }: TutorReplyInput): Promise<string> {
    const model = this.model(this.config.REPLY_MODEL).withStructuredOutput(tutorMessageSchema, {
      name: 'tutor_reply',
    })

    const { message } = await model.invoke(
      renderPrompt(loadPrompt('tutor-reply'), {
        context,
        style,
        targets: bullets(targets),
        history: transcript(history),
        userContent,
      }),
      { tags: ['tutor-reply'] },
    )

    return message
  }

  async assessMessage({ context, style, targets, userContent, tutorMessage }: AssessmentInput): Promise<Assessment> {
    const model = this.model(this.config.ASSESSMENT_MODEL).withStructuredOutput(assessmentOutputSchema, {
      name: 'assessment',
    })

    const { targetPhrasesCorrectness, ...categories } = await model.invoke(
      renderPrompt(loadPrompt('assessment'), {
        context,
        style,
        targets: withMeanings(targets),
        userContent,
        tutorMessage,
      }),
      { tags: ['assessment'] },
    )

    return {
      ...categories,
      targetPhrasesCorrectness: Object.fromEntries(
        targetPhrasesCorrectness.map(({ expression, ...verdict }) => [expression, verdict]),
      ),
    }
  }

  async summarizeSession({ averages, targets }: SessionAggregate): Promise<Narrative> {
    const model = this.model(this.config.NARRATIVE_MODEL).withStructuredOutput(narrativeSchema, {
      name: 'narrative',
    })

    return model.invoke(
      renderPrompt(loadPrompt('narrative'), {
        contextCorrectness: averages.contextCorrectness.toFixed(1),
        grammar: averages.grammarAndSyntax.toFixed(1),
        vocabularyDiversity: averages.vocabularyDiversity.toFixed(1),
        sentenceComplexity: averages.sentenceComplexity.toFixed(1),
        sentenceNaturalness: averages.sentenceNaturalness.toFixed(1),
        targets: results(targets),
      }),
      { tags: ['narrative'] },
    )
  }

  async generateGaps({ targets }: GapsGenerationInput): Promise<GapsGeneration> {
    const model = this.model(this.config.DRILL_GEN_MODEL).withStructuredOutput(gapsGenerationSchema, {
      name: 'gaps_generation',
    })

    return model.invoke(renderPrompt(loadPrompt('gaps-generate'), { targets: bullets(targets) }), {
      tags: ['gaps-generate'],
    })
  }

  async judgeDescription({ description, candidates }: DescribeJudgeInput): Promise<DescribeJudgement> {
    const model = this.model(this.config.DRILL_JUDGE_MODEL).withStructuredOutput(describeJudgementSchema, {
      name: 'describe_judgement',
    })

    return model.invoke(
      renderPrompt(loadPrompt('describe-judge'), {
        candidates: candidates.map((candidate) => `- ${candidate}`).join('\n'),
        description,
      }),
      { tags: ['describe-judge'] },
    )
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
